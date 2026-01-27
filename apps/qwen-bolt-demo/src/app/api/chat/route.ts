import { NextRequest } from 'next/server';
import { query, type SDKUserMessage, type SDKMessage } from '@qwen-code/sdk';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// 存储会话的工作目录
const sessionWorkspaces = new Map<string, string>();

function buildPrompt(history: HistoryMessage[], message: string): string {
  const parts: string[] = [];
  
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item?.content) continue;
      const role = (item.role || 'user').toUpperCase();
      parts.push(`${role}: ${item.content}`);
    }
  }
  
  parts.push(`USER: ${message}`);
  return parts.join('\n\n');
}

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
    const { message, history, sessionId: clientSessionId } = await request.json();
    const sessionId = clientSessionId || randomUUID();

    console.log('[API /api/chat] Received request:', { sessionId, message });

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建会话工作目录
    const workspaceDir = await createSessionWorkspace(sessionId);
    console.log('[API /api/chat] Workspace directory:', workspaceDir);

    const encoder = new TextEncoder();
    const fullPrompt = buildPrompt(history || [], message);

    console.log('[API /api/chat] Full prompt:', fullPrompt.substring(0, 200) + '...');
    console.log('[API /api/chat] Creating query with options:', {
      pathToQwenExecutable: 'qwen',
      includePartialMessages: true,
      debug: true,
      logLevel: 'debug',
      authType: 'qwen-oauth',
      cwd: workspaceDir,
    });

    const q = query({
      prompt: createPromptStream(sessionId, fullPrompt),
      options: {
        pathToQwenExecutable: 'qwen',
        includePartialMessages: true,
        debug: true,  // 🔥 开启 debug 模式
        logLevel: 'debug',  // 🔥 设置日志级别为 debug
        // 🔥 关键修复：使用 qwen-oauth 认证（免费且推荐）
        authType: 'qwen-oauth',
        // 🔥 关键：设置工作目录
        cwd: workspaceDir,
        // 🔥 关键：配置工具权限回调
        canUseTool: async (toolName, input) => {
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
            'file_grep',
            'codebase_search',
            // 添加更多可能的工具名称
            'writefile',
            'createfile',
            'editfile',
            'filereplace',
            'readfile',
          ];
          
          const toolNameLower = toolName.toLowerCase().replace(/[_-]/g, '');
          const isAllowed = allowedTools.some(t => t.toLowerCase().replace(/[_-]/g, '') === toolNameLower);
          
          if (isAllowed) {
            console.log('[API /api/chat] Tool allowed:', toolName);
            
            // 🔥 关键：对于所有文件操作工具，确保路径是相对于工作目录的
            if (input && typeof input === 'object') {
              const updatedInput = { ...input } as Record<string, any>;
              
              // 处理各种可能的路径字段名
              const pathFields = ['path', 'file_path', 'filePath', 'relative_workspace_path'];
              for (const field of pathFields) {
                const fieldValue = updatedInput[field];
                if (fieldValue && typeof fieldValue === 'string') {
                  let newPath = fieldValue;
                  // 如果路径是绝对路径，转换为相对路径
                  if (newPath.startsWith('/')) {
                    newPath = newPath.substring(1);
                  }
                  // 如果路径包含工作目录，移除它
                  if (newPath.includes(workspaceDir)) {
                    newPath = newPath.replace(workspaceDir, '').replace(/^\//, '');
                  }
                  updatedInput[field] = newPath;
                  console.log(`[API /api/chat] Updated ${field}:`, newPath);
                }
              }
              
              return {
                behavior: 'allow',
                updatedInput,
              };
            }
            
            return {
              behavior: 'allow',
              updatedInput: input,
            };
          }
          
          console.log('[API /api/chat] Tool denied:', toolName);
          return {
            behavior: 'deny',
            message: `Tool ${toolName} is not allowed in this context`,
          };
        },
      },
    });

    console.log('[API /api/chat] Query object created, waiting for initialization...');

    const stream = new ReadableStream({
      async start(controller) {
        let hasError = false;
        try {
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
              
              // 检测文件操作并通知前端
              if ((msg as any).type === 'assistant' && (msg as any).message?.content) {
                const content = (msg as any).message.content;
                if (Array.isArray(content)) {
                  for (const block of content) {
                    if (block.type === 'tool_use' && 
                        (block.name === 'write_file' || block.name === 'create_file' || 
                         block.name === 'file_replace' || block.name === 'edit_file')) {
                      // 通知前端文件已更新
                      const fileUpdate = JSON.stringify({
                        type: 'file_updated',
                        sessionId,
                        tool: block.name,
                        input: block.input,
                      });
                      controller.enqueue(encoder.encode(`data: ${fileUpdate}\n\n`));
                    }
                  }
                }
              }
              
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
          
          try {
            controller.close();
          } catch (controllerError) {
            console.error('[API /api/chat] Error closing controller:', controllerError);
          }
        }
      },
      cancel() {
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

