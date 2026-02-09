import { NextRequest } from 'next/server';
import { query, type SDKUserMessage, type SDKMessage, type SDKSystemMessage, createSdkMcpServer, tool } from '@qwen-code/sdk';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, realpath } from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getSystemInstructions, buildUserMessage } from '@/lib/prompt-builder';

export const runtime = 'nodejs';

// 存储会话的工作目录
const sessionWorkspaces = new Map<string, string>();

// 🔥 关键修复：创建一个持续的生成器，而不是单次的
async function* createPromptStream(
  sessionId: string,
  systemInstructions: string,
  content: string
): AsyncIterable<SDKMessage> {
  // 1. Combine system instructions into user prompt (Global Context Mechanism)
  // Since SDK/Backend may not support 'system_prompt' subtype natively in the stream,
  // we prepend it to the user message to ensure it is seen.
  let finalContent = content;
  if (systemInstructions) {
    finalContent = `<system_instructions>\n${systemInstructions}\n</system_instructions>\n\n${content}`;
  }

  // 2. Send combined user message
  yield {
    type: 'user',
    session_id: sessionId,
    message: { role: 'user', content: finalContent },
    parent_tool_use_id: null,
  } as SDKUserMessage;
  
  // 🔥 关键：保持生成器活跃，等待可能的工具调用响应
  // 这样 SDK 就可以在流还活着的时候完成工具调用
  // 生成器会在 SDK 完成所有处理后自然结束
  await new Promise(() => {}); // 永远等待，直到 SDK 关闭
}

// 创建会话工作目录
async function createSessionWorkspace(sessionId: string): Promise<string> {
  let workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);
  await mkdir(workspaceDir, { recursive: true });
  
  // On macOS, tmpdir() wraps /private/var/..., but sometimes returns /var/...
  // We resolve the real path to ensure consistency with tool outputs
  try {
    workspaceDir = await realpath(workspaceDir);
  } catch (error) {
    console.warn('[createSessionWorkspace] Failed to resolve realpath:', error);
  }

  sessionWorkspaces.set(sessionId, workspaceDir);
  console.log('[createSessionWorkspace] Created workspace:', workspaceDir);
  return workspaceDir;
}

// 获取会话工作目录（内部使用）
function getSessionWorkspace(sessionId: string): string | undefined {
  return sessionWorkspaces.get(sessionId);
}

// 🔥 New Capability: SDK-native MCP Server for filesystem operations
function createFileSystemServer(workspaceDir: string, streamController?: ReadableStreamDefaultController) {
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
        async ({ path, content }) => {
          try {
             // Validate and normalize path
             let targetPath = path;
             if (targetPath.startsWith('/')) targetPath = targetPath.substring(1);
             // Prevent exiting workspace
             if (targetPath.includes('../')) throw new Error('Cannot write outside workspace');
             
             const absPath = join(workspaceDir, targetPath);
             await mkdir(join(absPath, '..'), { recursive: true });
             await writeFile(absPath, content, 'utf-8');
             
             console.log(`[local-fs] Wrote file: ${targetPath}`);

             if (streamController) {
                const fileEvent = {
                   type: 'file_update',
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
        async ({ path, oldString, newString }) => {
          try {
             let targetPath = path;
             if (targetPath.startsWith('/')) targetPath = targetPath.substring(1);
             const absPath = join(workspaceDir, targetPath);
             
             const currentContent = await readFile(absPath, 'utf-8');
             if (!currentContent.includes(oldString)) {
                return {
                   isError: true,
                   content: [{ type: 'text', text: `Error: oldString not found in ${path}` }]
                };
             }
             
             const newContent = currentContent.replace(oldString, newString);
             await writeFile(absPath, newContent, 'utf-8');
             
             if (streamController) {
                const fileEvent = {
                   type: 'file_update',
                   path: targetPath,
                   content: newContent
                };
                const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
                streamController.enqueue(new TextEncoder().encode(payload));
             }
             
             return {
               content: [{ type: 'text', text: `Successfully replaced string in ${path}` }]
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

// 处理上传的文件，将其写入工作目录
async function writeUploadedFiles(workspaceDir: string, uploadedFiles: any[]) {
  if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) return '';

  console.log('[API /api/chat] Writing uploaded files to workspace...');
  for (const file of uploadedFiles) {
    try {
      const filePath = join(workspaceDir, file.path);
      const fileDir = join(filePath, '..');
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
      console.log('[API /api/chat] Wrote file:', file.path);
    } catch (error) {
      console.error('[API /api/chat] Error writing file:', file.path, error);
    }
  }

  // 准备上传文件的上下文
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

// 设置文件监听器
function setupFileWatcher(workspaceDir: string, controller: ReadableStreamDefaultController) {
  let fsWait: NodeJS.Timeout | null = null;
  try {
    const watcher = watch(workspaceDir, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith('.') || filename.includes('node_modules')) return;

      if (fsWait) clearTimeout(fsWait);
      
      fsWait = setTimeout(async () => {
        fsWait = null;
        try {
          const filePath = join(workspaceDir, filename);
          
          try {
            const stats = await import('fs/promises').then(fs => fs.stat(filePath));
            if (!stats.isFile()) return;
          } catch (e) {
            return; // File vanished
          }

          const content = await readFile(filePath, 'utf-8');
          
          const fileEvent = {
            type: 'file_update',
            path: filename,
            content: content
          };
          const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
          controller.enqueue(new TextEncoder().encode(payload));
          console.log('[API /api/chat] Watched file changed (debounced), pushed update:', filename);
        } catch (e) {
          console.error('[API /api/chat] Error reading watched file:', filename, e);
        }
      }, 300);
    });
    console.log('[API /api/chat] File watcher started for:', workspaceDir);
    return watcher;
  } catch (e) {
    console.error('[API /api/chat] Failed to start file watcher:', e);
    return null;
  }
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

    // 创建会话工作目录
    const workspaceDir = await createSessionWorkspace(sessionId);
    
    // 写入上传文件并获取上下文
    const filesContext = await writeUploadedFiles(workspaceDir, uploadedFiles);

    const encoder = new TextEncoder();
    
    // 构建系统指令和用户消息
    const systemInstructions = getSystemInstructions(knowledge);
    const userMessage = buildUserMessage(message, filesContext);

    // 构建查询选项
    const frontendAuthType = modelConfig?.authType || 'qwen-oauth';
    const sdkAuthType = frontendAuthType === 'openai-api-key' ? 'openai' : 'qwen-oauth';
    
    console.log('[Chat API] Configuration:', {
      frontendAuthType,
      sdkAuthType,
      modelConfig
    });

    const queryOptions: any = {
      includePartialMessages: true,
      debug: true,
      logLevel: 'debug',
      authType: sdkAuthType,
      cwd: workspaceDir,
    };

    if (modelConfig?.model) {
      // For OpenAI/Compatible endpoints, use the specific model name
      // For Qwen OAuth (official backend), use 'coder-model' alias or specific model if supported
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

    // Simple permission handling - allow all requested tools
    queryOptions.canUseTool = async (toolName: string, input: any) => {
        return { behavior: 'allow', updatedInput: input };
    };

    let q: any = null;
    let watcher: FSWatcher | null = null;
    let streamController: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;
        const fileSystemServer = createFileSystemServer(workspaceDir, streamController);
        
        watcher = setupFileWatcher(workspaceDir, controller);

        try {
          q = query({
            // @ts-ignore - We are using advanced SDK stream capabilities for System Prompt
            prompt: createPromptStream(sessionId, systemInstructions, userMessage) as any,
            options: {
               ...queryOptions,
               mcpServers: { 'local-fs': fileSystemServer }
            },
          });

          await q.initialized;
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'session_info',
            sessionId,
            workspaceDir,
          })}\n\n`));
          
          let messageCount = 0;
          const pendingToolFiles = new Map<string, string>(); 

          for await (const msg of q as AsyncIterable<SDKMessage>) {
            try {
              messageCount++;
              const msgType = (msg as any).type;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
              
              // 1. Detect Intent: When Assistant *requests* an edit, store the file path
              if (msgType === 'assistant' && (msg as any).message?.tool_calls) {
                  const toolCalls = (msg as any).message.tool_calls;
                  if (Array.isArray(toolCalls)) {
                      for (const call of toolCalls) {
                          if (call.function?.name) {
                              const name = call.function.name.toLowerCase();
                              if (name.includes('edit') || name.includes('replace') || name.includes('write') || name.includes('create')) {
                                  try {
                                      const args = JSON.parse(call.function.arguments || '{}');
                                      const path = args.file_path || args.path || args.filePath || args.relative_workspace_path;
                                      if (path && call.id) {
                                          pendingToolFiles.set(call.id, path);
                                      }
                                  } catch (e) {
                                      // Ignore parsing errors
                                  }
                              }
                          }
                      }
                  }
              }

              // 2. Handle Tool Result and Proactive Push
              if (msgType === 'tool_result' || (msg as any).message?.role === 'tool') {
                  const toolUseId = (msg as any).tool_use_id || (msg as any).tool_call_id || (msg as any).parent_tool_use_id;
                  
                  if (toolUseId && pendingToolFiles.has(toolUseId)) {
                      const filePath = pendingToolFiles.get(toolUseId);
                      pendingToolFiles.delete(toolUseId);
                      
                      if (filePath) {
                          // Proactively push update
                          setTimeout(async () => {
                             try {
                                 const fullPath = join(workspaceDir, filePath.startsWith('/') ? filePath.substring(1) : filePath);
                                 const content = await readFile(fullPath, 'utf-8');
                                 
                                 const payload = `event: file\ndata: ${JSON.stringify({
                                    type: 'file_update',
                                    path: filePath,
                                    content: content
                                 })}\n\n`;
                                 streamController?.enqueue(encoder.encode(payload));
                             } catch (e) {
                                 // Silent ignore if file read fails (maybe deleted)
                             }
                         }, 100);
                      }
                  }
              }

            } catch (msgError) {
              console.error('[API /api/chat] Error processing message:', msgError);
            }
          }
          
        } catch (error) {
          console.error('[API /api/chat] Error streaming query:', error);
          
          try {
            const errorLine = JSON.stringify({
              type: 'error',
              error: 'Error streaming query',
              message: error instanceof Error ? error.message : String(error),
            });
            controller.enqueue(encoder.encode(`data: ${errorLine}\n\n`));
          } catch (encodeError) {
            console.error('[API /api/chat] Error encoding error message:', encodeError);
          }
        } finally {
          // Delay to capture last updates
          await new Promise(resolve => setTimeout(resolve, 1000));

          try { await q?.close(); } catch {}
          if (watcher) watcher.close();
          try { controller.close(); } catch {}
        }
      },
      cancel() {
        if (watcher) watcher.close();
        void q?.close();
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

