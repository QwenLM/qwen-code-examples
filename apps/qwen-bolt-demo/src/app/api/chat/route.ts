import { NextRequest } from 'next/server';
import { query, type SDKUserMessage, type SDKMessage, type SDKSystemMessage, createSdkMcpServer, tool, SdkLogger } from '@qwen-code/sdk';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Global listeners for SDK logs
const logListeners = new Set<(msg: string) => void>();

// Monkey-patch process.stdout/stderr to capture ALL output including direct writes
if (!(global as any).__qwen_log_hook_installed) {
  (global as any).__qwen_log_hook_installed = true;
  
  const hookWrite = (originalWrite: Function) => {
    return function(this: any, chunk: any, ...args: any[]) {
      try {
        const msg = chunk ? chunk.toString() : '';
        logListeners.forEach(listener => listener(msg));
      } catch (e) {
        // Ignore logging errors
      }
      return originalWrite.call(this, chunk, ...args);
    };
  };

  process.stdout.write = hookWrite(process.stdout.write);
  process.stderr.write = hookWrite(process.stderr.write);
  console.log('[Chat API] Global stdout/stderr hooks installed');
}

// Configure SdkLogger for structured logs
try {
  SdkLogger.configure({
    logLevel: 'debug',
    stderr: () => {}
  });
} catch (e) {
  console.warn('[Chat API] Failed to configure SdkLogger:', e);
}
import { randomUUID } from 'crypto';
import { getSystemInstructions, buildUserMessage } from '@/lib/prompt-builder';

export const runtime = 'nodejs';

// Create a temporary workspace directory for the session
function createSessionWorkspace(sessionId: string): string {
  const workspaceDir = path.join(os.tmpdir(), 'qwen-bolt', sessionId);
  fs.mkdirSync(workspaceDir, { recursive: true });
  console.log('[Chat API] Created workspace:', workspaceDir);
  return workspaceDir;
}

// Recursively read all files from a directory (for pushing to frontend)
function readDirectoryRecursive(dirPath: string, basePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      // Skip node_modules, .git, lock files, etc.
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.cache') continue;
      if (entry.name === 'package-lock.json' || entry.name === 'yarn.lock' || entry.name === 'pnpm-lock.yaml') continue;
      
      if (entry.isDirectory()) {
        Object.assign(result, readDirectoryRecursive(fullPath, basePath));
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          result[relativePath] = content;
        } catch {
          // Skip binary or unreadable files
        }
      }
    }
  } catch {
    // Directory might not exist yet
  }
  
  return result;
}

// Watch a directory for file changes and push them via SSE
function watchWorkspace(
  workspaceDir: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): fs.FSWatcher | null {
  try {
    const watcher = fs.watch(workspaceDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      // Skip node_modules, .git, etc.
      if (filename.includes('node_modules') || filename.includes('.git') || filename.includes('.cache')) return;
      
      const fullPath = path.join(workspaceDir, filename);
      
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const fileEvent = {
            type: 'file_write',
            path: filename,
            content: content
          };
          const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }
      } catch {
        // File might be binary or deleted between check and read
      }
    });
    
    console.log('[Chat API] File watcher started for:', workspaceDir);
    return watcher;
  } catch (error) {
    console.warn('[Chat API] Failed to start file watcher:', error);
    return null;
  }
}

// Clean up workspace directory
function cleanupWorkspace(workspaceDir: string) {
  try {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
    console.log('[Chat API] Cleaned up workspace:', workspaceDir);
  } catch (error) {
    console.warn('[Chat API] Failed to cleanup workspace:', error);
  }
}

// Persistent generator for SDK prompt stream
async function* createPromptStream(
  sessionId: string,
  systemInstructions: string,
  content: string
): AsyncIterable<SDKMessage> {
  let finalContent = content;
  if (systemInstructions) {
    finalContent = `<system_instructions>\n${systemInstructions}\n</system_instructions>\n\n${content}`;
  }

  yield {
    type: 'user',
    session_id: sessionId,
    message: { role: 'user', content: finalContent },
    parent_tool_use_id: null,
  } as SDKUserMessage;
  
  // Keep generator alive for tool call responses
  await new Promise(() => {});
}

// In-memory file store per session (for replace_string_in_file to work without disk)
const sessionFileStore = new Map<string, Map<string, string>>();

function getFileStore(sessionId: string): Map<string, string> {
  if (!sessionFileStore.has(sessionId)) {
    sessionFileStore.set(sessionId, new Map());
  }
  return sessionFileStore.get(sessionId)!;
}

// MCP Server: file operations write to disk AND push to frontend via SSE
function createFileSystemServer(sessionId: string, workspaceDir: string, streamController?: ReadableStreamDefaultController) {
  const fileStore = getFileStore(sessionId);

  return createSdkMcpServer({
    name: 'local-fs',
    version: '1.0.0',
    tools: [
      tool(
        'write_file',
        'Write a file to the workspace. If the file already exists, it will be overwritten.',
        {
          path: z.string().describe('The relative path of the file to write'),
          content: z.string().describe('The content to write to the file'),
        },
        async ({ path: filePath, content }) => {
          try {
             let targetPath = filePath;
             if (targetPath.startsWith('/')) targetPath = targetPath.substring(1);
             if (targetPath.includes('../')) throw new Error('Cannot write outside workspace');
             
             // Write to disk so SDK built-in tools can read it
             const fullPath = path.join(workspaceDir, targetPath);
             fs.mkdirSync(path.dirname(fullPath), { recursive: true });
             fs.writeFileSync(fullPath, content, 'utf-8');
             
             // Store in memory for subsequent replace operations
             fileStore.set(targetPath, content);
             
             console.log(`[local-fs] write_file: ${targetPath}`);

             // Push file_write event to frontend via SSE
             // (fs.watch will also fire, but explicit push ensures immediate delivery)
             if (streamController) {
                const fileEvent = {
                   type: 'file_write',
                   path: targetPath,
                   content: content
                };
                const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
                streamController.enqueue(new TextEncoder().encode(payload));
             }

             return {
               content: [{ type: 'text', text: `Successfully wrote file: ${targetPath}` }]
             };
          } catch (e: any) {
             console.error('[local-fs] Error writing file:', e);
             return {
                isError: true,
                content: [{ type: 'text', text: `Error writing file: ${e.message}` }]
             };
          }
        }
      ),
      tool(
        'replace_string_in_file',
        'Replace a specific string in a file with a new string. Ensure the oldString is unique.',
        {
           path: z.string().describe('The relative path of the file'),
           oldString: z.string().describe('The exact string to replace'),
           newString: z.string().describe('The new string to replace with'),
        },
        async ({ path: filePath, oldString, newString }) => {
          try {
             let targetPath = filePath;
             if (targetPath.startsWith('/')) targetPath = targetPath.substring(1);
             
             // Try reading from memory first, fallback to disk
             let currentContent = fileStore.get(targetPath);
             if (currentContent === undefined) {
                const fullPath = path.join(workspaceDir, targetPath);
                if (fs.existsSync(fullPath)) {
                   currentContent = fs.readFileSync(fullPath, 'utf-8');
                   fileStore.set(targetPath, currentContent);
                } else {
                   return {
                      isError: true,
                      content: [{ type: 'text', text: `Error: file ${filePath} not found. Write it first or use write_file.` }]
                   };
                }
             }
             if (!currentContent.includes(oldString)) {
                return {
                   isError: true,
                   content: [{ type: 'text', text: `Error: oldString not found in ${filePath}` }]
                };
             }
             
             const newContent = currentContent.replace(oldString, newString);
             fileStore.set(targetPath, newContent);
             
             // Write updated content to disk
             const fullPath = path.join(workspaceDir, targetPath);
             fs.mkdirSync(path.dirname(fullPath), { recursive: true });
             fs.writeFileSync(fullPath, newContent, 'utf-8');
             
             // Push full file content to frontend via SSE
             if (streamController) {
                const fileEvent = {
                   type: 'file_write',
                   path: targetPath,
                   content: newContent
                };
                const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
                streamController.enqueue(new TextEncoder().encode(payload));
             }
             
             return {
               content: [{ type: 'text', text: `Successfully replaced string in ${filePath}` }]
             };
          } catch (e: any) {
             return {
                isError: true,
                content: [{ type: 'text', text: `Error replacing string: ${e.message}` }]
             };
          }
        }
      )
    ]
  });
}

// Build uploaded files context string (no disk writes, just context for the prompt)
function buildUploadedFilesContext(uploadedFiles: any[], sessionId: string): string {
  if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) return '';

  const fileStore = getFileStore(sessionId);
  
  // Store uploaded files in memory for replace operations
  for (const file of uploadedFiles) {
    const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
    fileStore.set(cleanPath, file.content);
  }

  const fileList = uploadedFiles.map(file => `- ${file.path}`).join('\n');
  const fileContents = uploadedFiles.map(file => 
    `\`\`\`${file.path}\n${file.content}\n\`\`\``
  ).join("\n\n");
  
  return `<CONTEXT_FILES>
The following files are available in the workspace and should be used as context:
${fileList}

File contents:
${fileContents}

You can reference, read, or modify these files as needed.
</CONTEXT_FILES>`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, sessionId: clientSessionId, uploadedFiles, knowledge, modelConfig } = await request.json();
    const sessionId = clientSessionId || randomUUID();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create workspace directory for SDK built-in tools
    const workspaceDir = createSessionWorkspace(sessionId);

    // Write uploaded files to disk so SDK can reference them
    const filesContext = buildUploadedFilesContext(uploadedFiles, sessionId);
    if (uploadedFiles && Array.isArray(uploadedFiles)) {
      for (const file of uploadedFiles) {
        const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        const fullPath = path.join(workspaceDir, cleanPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }
    }

    const encoder = new TextEncoder();
    
    const systemInstructions = getSystemInstructions(knowledge);
    const userMessage = buildUserMessage(message, filesContext);

    // Build query options
    const frontendAuthType = modelConfig?.authType || 'qwen-oauth';
    const sdkAuthType = frontendAuthType === 'openai-api-key' ? 'openai' : 'qwen-oauth';
    
    console.log('[Chat API] Configuration:', { frontendAuthType, sdkAuthType, modelConfig });

    const queryOptions: any = {
      includePartialMessages: true,
      debug: true,
      logLevel: 'debug',
      authType: sdkAuthType,
      cwd: workspaceDir,
    };

    if (modelConfig?.model) {
      if (sdkAuthType === 'openai') {
        queryOptions.model = modelConfig.model;
      } else {
        queryOptions.model = 'coder-model';
      }
    }

    if (frontendAuthType === 'openai-api-key' && modelConfig) {
      const envVars: Record<string, string> = {};
      if (modelConfig.apiKey) envVars.OPENAI_API_KEY = modelConfig.apiKey;
      if (modelConfig.baseUrl) envVars.OPENAI_BASE_URL = modelConfig.baseUrl;
      queryOptions.env = envVars;
    }

    // Allow all requested tools
    queryOptions.canUseTool = async (_toolName: string, input: any) => {
        return { behavior: 'allow', updatedInput: input };
    };

    let queryInstance: any = null;
    let streamController: ReadableStreamDefaultController | null = null;
    let fileWatcher: fs.FSWatcher | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;
        const fileSystemServer = createFileSystemServer(sessionId, workspaceDir, streamController);

        // Start watching workspace for file changes from SDK built-in tools
        fileWatcher = watchWorkspace(workspaceDir, controller, encoder);

        // Listen for Auth URLs from SDK logs
        const logListener = (msg: string) => {
          if (msg.includes('chat.qwen.ai/authorize')) {
             const match = msg.match(/(https:\/\/chat\.qwen\.ai\/authorize\S+)/);
             const url = match ? match[1].split('|')[0].trim() : null;
             
             if (url) {
                try {
                   controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'auth_required',
                      url: url,
                      text: `Please authorize the application by visiting: ${url}`
                   })}\n\n`));
                } catch (e) {
                   // Controller might be closed
                }
             }
          }
        };
        logListeners.add(logListener);

        try {
          queryInstance = query({
            // @ts-ignore - Advanced SDK stream capabilities for System Prompt
            prompt: createPromptStream(sessionId, systemInstructions, userMessage) as any,
            options: {
               ...queryOptions,
               mcpServers: { 'local-fs': fileSystemServer }
            },
          });

          await queryInstance.initialized;
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'session_info',
            sessionId,
          })}\n\n`));

          for await (const msg of queryInstance as AsyncIterable<SDKMessage>) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
            } catch (msgError) {
              console.error('[API /api/chat] Error processing message:', msgError);
            }
          }
          
        } catch (error) {
          console.error('[API /api/chat] Error streaming query:', error);
          
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Error streaming query',
              message: error instanceof Error ? error.message : String(error),
            })}\n\n`));
          } catch (encodeError) {
            console.error('[API /api/chat] Error encoding error message:', encodeError);
          }
        } finally {
          logListeners.delete(logListener);

          // Close file watcher
          if (fileWatcher) {
            try { fileWatcher.close(); } catch {}
          }

          // Push all final files from workspace to frontend before closing
          try {
            const allFiles = readDirectoryRecursive(workspaceDir, workspaceDir);
            for (const [filePath, content] of Object.entries(allFiles)) {
              const fileEvent = { type: 'file_write', path: filePath, content };
              const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
          } catch {
            // Workspace might already be cleaned up
          }

          await new Promise(resolve => setTimeout(resolve, 500));

          // Clean up session file store and workspace
          sessionFileStore.delete(sessionId);
          cleanupWorkspace(workspaceDir);

          try { await queryInstance?.close(); } catch {}
          try { controller.close(); } catch {}
        }
      },
      cancel() {
        if (fileWatcher) {
          try { fileWatcher.close(); } catch {}
        }
        sessionFileStore.delete(sessionId);
        cleanupWorkspace(workspaceDir);
        void queryInstance?.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

