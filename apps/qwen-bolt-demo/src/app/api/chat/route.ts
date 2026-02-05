import { NextRequest } from 'next/server';
import { query, type SDKUserMessage, type SDKMessage } from '@qwen-code/sdk';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildPrompt, type HistoryMessage } from '@/lib/prompt-builder';

export const runtime = 'nodejs';

// 存储会话的工作目录
const sessionWorkspaces = new Map<string, string>();

// 🔥 关键修复：创建一个持续的生成器，而不是单次的
async function* createPromptStream(
  sessionId: string,
  content: string
): AsyncIterable<SDKUserMessage> {
  // 发送用户消息
  yield {
    type: 'user',
    session_id: sessionId,
    message: { role: 'user', content },
    parent_tool_use_id: null,
  } as SDKUserMessage;
  
  // 🔥 关键：保持生成器活跃，等待可能的工具调用响应
  // 这样 SDK 就可以在流还活着的时候完成工具调用
  // 生成器会在 SDK 完成所有处理后自然结束
  await new Promise(() => {}); // 永远等待，直到 SDK 关闭
}

// 创建会话工作目录
async function createSessionWorkspace(sessionId: string): Promise<string> {
  const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);
  await mkdir(workspaceDir, { recursive: true });
  sessionWorkspaces.set(sessionId, workspaceDir);
  console.log('[createSessionWorkspace] Created workspace:', workspaceDir);
  return workspaceDir;
}

// 获取会话工作目录（内部使用）
function getSessionWorkspace(sessionId: string): string | undefined {
  return sessionWorkspaces.get(sessionId);
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, sessionId: clientSessionId, uploadedFiles, knowledge, modelConfig } = await request.json();
    const sessionId = clientSessionId || randomUUID();

    console.log('[API /api/chat] Received request:', { 
      sessionId, 
      message: message.substring(0, 100) + '...',
      uploadedFilesCount: uploadedFiles?.length || 0,
      hasKnowledge: !!knowledge,
      modelConfig: modelConfig || 'default',
    });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建会话工作目录
    const workspaceDir = await createSessionWorkspace(sessionId);
    console.log('[API /api/chat] Workspace directory:', workspaceDir);

    // 🔥 关键：将上传的文件写入工作目录
    if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
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
    }

    const encoder = new TextEncoder();

    // 准备上传文件的上下文
    let filesContext = "";
    if (uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
      const fileList = uploadedFiles.map(file => `- ${file.path}`).join('\n');
      const fileContents = uploadedFiles.map(file => 
        `\`\`\`${file.path}\n${file.content}\n\`\`\``
      ).join("\n\n");
      filesContext = `<CONTEXT_FILES>
The following files are available in the workspace and should be used as context:
${fileList}

File contents:
${fileContents}

You can reference, read, or modify these files as needed.
</CONTEXT_FILES>`;
    }
    
    // 构建完整的 prompt，knowledge 和 filesContext 作为系统级约束
    const fullPrompt = buildPrompt(history || [], message, knowledge, filesContext);

    // 构建查询选项
    // 🔥 修复：将前端的 'openai-api-key' 映射为 SDK 需要的 'openai'
    const frontendAuthType = modelConfig?.authType || 'qwen-oauth';
    const sdkAuthType = frontendAuthType === 'openai-api-key' ? 'openai' : 'qwen-oauth';
    
    const queryOptions: any = {
      pathToQwenExecutable: 'qwen',
      includePartialMessages: true,
      debug: true,
      logLevel: 'debug',
      authType: sdkAuthType,
      cwd: workspaceDir,
    };

    // 🔥 修复：正确传递 model 参数给 SDK
    if (modelConfig?.model) {
      queryOptions.model = modelConfig.model;
      console.log('[API /api/chat] Setting model:', modelConfig.model);
    }

    // 🔥 修复：如果使用 OpenAI 认证，通过 env 参数传递环境变量
    if (frontendAuthType === 'openai-api-key' && modelConfig) {
      const envVars: Record<string, string> = {};
      
      if (modelConfig.apiKey) {
        envVars.OPENAI_API_KEY = modelConfig.apiKey;
      }
      if (modelConfig.baseUrl) {
        envVars.OPENAI_BASE_URL = modelConfig.baseUrl;
      }
      
      // 将环境变量传递给 SDK
      queryOptions.env = envVars;
      console.log('[API /api/chat] OpenAI mode - env vars set (apiKey:', !!modelConfig.apiKey, ', baseUrl:', modelConfig.baseUrl, ')');
    }

    console.log('[API /api/chat] Full prompt:', fullPrompt.substring(0, 200) + '...');
    console.log('[API /api/chat] Creating query with options:', {
      authType: queryOptions.authType,
      model: queryOptions.model,
      cwd: queryOptions.cwd,
      includePartialMessages: queryOptions.includePartialMessages,
      hasEnv: !!queryOptions.env,
      envKeys: queryOptions.env ? Object.keys(queryOptions.env) : [],
    });

    // 添加工具权限回调到 options
    // 用于旁路捕获文件变更并推送给前端
    let streamController: ReadableStreamDefaultController | null = null;

    // 添加工具权限回调到 options
    // 用于旁路捕获文件变更并推送给前端
    queryOptions.canUseTool = async (toolName: string, input: any) => {
          console.log('[API /api/chat] Tool request:', toolName, JSON.stringify(input).substring(0, 200));
          
          // 允许所有文件操作工具（包括各种可能的命名方式）
          const allowedTools = [
            'write_file',      // SDK 实际使用的工具名
            'create_file',
            'edit_file', 
            'file_replace',
            'read_file',
            'shell',
            'search_file',
            'writefile',
            'createfile',
            'editfile',
            'replace_string_in_file',
            'list_files',
            'listdir',
            'ls',
            'run_script'
          ];
          
          const toolNameLower = toolName.toLowerCase().replace(/[_-]/g, '');
          const isAllowed = allowedTools.some(t => t.toLowerCase().replace(/[_-]/g, '') === toolNameLower);
          
          if (isAllowed) {
            console.log('[API /api/chat] Tool allowed:', toolName);
            
            // Normalize inputs first to ensure we have clean relative paths
            let normalizedInput = { ...input };
            
            if (input && typeof input === 'object') {
              // 处理各种可能的路径字段名
              const pathFields = ['path', 'file_path', 'filePath', 'relative_workspace_path'];
              for (const field of pathFields) {
                const fieldValue = normalizedInput[field];
                if (fieldValue && typeof fieldValue === 'string') {
                  let newPath = fieldValue;
                  
                  // 1. 如果路径包含工作目录（绝对路径），移除它
                  if (newPath.includes(workspaceDir)) {
                    newPath = newPath.replace(workspaceDir, '');
                  }
                  
                  // 2. 移除开头的 / (变为相对路径)
                  if (newPath.startsWith('/')) {
                    newPath = newPath.substring(1);
                  }
                  
                  // 3. 移除开头的 ./
                  if (newPath.startsWith('./')) {
                    newPath = newPath.substring(2);
                  }

                  normalizedInput[field] = newPath;
                  // console.log(`[API /api/chat] Normalized ${field}: ${fieldValue} -> ${newPath}`);
                }
              }
            }

            // 🔥 流式优化：使用标准化后的路径推送文件更新
            if (toolNameLower.includes('write') || toolNameLower.includes('create') || toolNameLower.includes('edit') || toolNameLower.includes('replace')) {
               // Prioritize normalized path
               const filePath = normalizedInput.file_path || normalizedInput.path || normalizedInput.filePath;
               
               if (filePath && streamController) {
                  // For 'write_file'/'create_file', we expect full content.
                  if ((toolName === 'write_file' || toolName === 'create_file') && normalizedInput.content) {
                      const fileEvent = {
                         type: 'file_update',
                         path: filePath, // This is now a clean relative path
                         content: normalizedInput.content
                      };
                      const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
                      streamController.enqueue(new TextEncoder().encode(payload));
                      console.log('[API /api/chat] Pushed file update via SSE:', filePath);
                  }
               }
            }
            
            return {
              behavior: 'allow',
              updatedInput: normalizedInput,
            };
          }

          
      console.log('[API /api/chat] Tool denied:', toolName);
      return {
        behavior: 'deny',
        message: `Tool ${toolName} is not allowed in this context`,
      };
    };

    console.log('[API /api/chat] Query options prepared');

    let q: any = null;
    let watcher: FSWatcher | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;
        console.log('[API /api/chat] streamController assigned');

        // Setup file watcher to sync changes back to frontend
        try {
          let fsWait: NodeJS.Timeout | null = null;
          watcher = watch(workspaceDir, { recursive: true }, (eventType, filename) => {
             if (filename && !filename.startsWith('.') && !filename.includes('node_modules')) {
               // Debounce updates to avoid sending too many events
               if (fsWait) return;
               fsWait = setTimeout(async () => {
                 fsWait = null;
                 try {
                   const filePath = join(workspaceDir, filename);
                   const content = await readFile(filePath, 'utf-8');
                   
                   const fileEvent = {
                      type: 'file_update',
                      path: filename,
                      content: content
                   };
                   const payload = `event: file\ndata: ${JSON.stringify(fileEvent)}\n\n`;
                   controller.enqueue(new TextEncoder().encode(payload));
                   console.log('[API /api/chat] Watched file changed, pushed update:', filename);
                 } catch (e) {
                   // Ignore read errors (file might be deleted temporarily)
                 }
               }, 100);
             }
          });
          console.log('[API /api/chat] File watcher started for:', workspaceDir);
        } catch (e) {
           console.error('[API /api/chat] Failed to start file watcher:', e);
        }

        let hasError = false;
        try {
          // Initialize query INSIDE the stream start to ensure controller is ready
          q = query({
            prompt: createPromptStream(sessionId, fullPrompt),
            options: queryOptions,
          });

          console.log('[API /api/chat] Waiting for q.initialized...');
          await q.initialized;
          console.log('[API /api/chat] Query initialized successfully!');
          
          // 发送会话 ID 给前端
          const sessionInfo = JSON.stringify({
            type: 'session_info',
            sessionId,
            workspaceDir,
          });
          controller.enqueue(encoder.encode(`data: ${sessionInfo}\n\n`));
          
          // 🔥 关键修复：不要在遇到 result 时 break，让 SDK 完整处理所有消息
          console.log('[API /api/chat] Starting to iterate over messages...');
          let messageCount = 0;
          for await (const msg of q as AsyncIterable<SDKMessage>) {
            try {
              messageCount++;
              console.log(`[API /api/chat] Received message #${messageCount}, type:`, (msg as any).type);
              const jsonLine = JSON.stringify(msg);
              controller.enqueue(encoder.encode(`data: ${jsonLine}\n\n`));
              
              // We removed the duplicate parsing logic here.
              // File updates are now pushed proactively via `canUseTool` hook using `streamController`.
              
              
              // 记录 result 消息但不 break，让循环自然结束
              if ((msg as { type?: string }).type === 'result') {
                console.log('[API /api/chat] Received result message, query will complete naturally');
              }
            } catch (msgError) {
              console.error('[API /api/chat] Error processing message:', msgError);
              // 继续处理下一条消息
            }
          }
          
          console.log('[API /api/chat] Query stream completed successfully');
        } catch (error) {
          hasError = true;
          console.error('[API /api/chat] Error streaming query:', error);
          console.error('[API /api/chat] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          
          try {
            const errorLine = JSON.stringify({
              type: 'error',
              error: 'Error streaming query',
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${errorLine}\n\n`));
          } catch (encodeError) {
            console.error('[API /api/chat] Error encoding error message:', encodeError);
          }
        } finally {
          try {
            await q.close();
            console.log('[API /api/chat] Query closed successfully');
          } catch (closeError) {
            console.error('[API /api/chat] Error closing query:', closeError);
          }

          if (watcher) {
             watcher.close();
             console.log('[API /api/chat] File watcher closed');
          }
          
          try {
            controller.close();
          } catch (controllerError) {
            console.error('[API /api/chat] Error closing controller:', controllerError);
          }
        }
      },
      cancel() {
        if (watcher) {
             watcher.close();
        }
        console.log('[API /api/chat] Stream cancelled for session:', sessionId);
        void q.close();
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

