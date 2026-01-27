'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Code2, 
  Send, 
  X,
  Maximize2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import CodeRenderer from '@/components/CodeRenderer';
import { PlanMessage, containsPlan } from '@/components/PlanMessage';
import { SummaryMessage, containsSummary } from '@/components/SummaryMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [devServer, setDevServer] = useState<{ port: number; framework: string; url: string } | null>(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);

  // Start development server
  const startDevServer = async () => {
    if (!sessionId || isStartingServer) return;

    setIsStartingServer(true);
    setServerError('');

    try {
      console.log('[Workspace] Starting dev server for session:', sessionId);
      
      // Set timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch('/api/dev-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('[Workspace] Dev server response:', data);

      if (data.success) {
        if (data.type === 'static') {
          // Static HTML project, use preview API directly
          setPreviewUrl(`/api/preview?sessionId=${sessionId}&t=${Date.now()}`);
        } else {
          // Dynamic project, use development server
          setDevServer({
            port: data.port,
            framework: data.framework,
            url: data.url,
          });
          // Set preview URL to development server address
          setPreviewUrl(`${data.url}?t=${Date.now()}`);
        }
        setServerError(''); // Clear error
      } else {
        setServerError(data.error || 'Failed to start dev server');
      }
    } catch (error: any) {
      console.error('[Workspace] Error starting dev server:', error);
      if (error.name === 'AbortError') {
        setServerError('Server start timeout (2 minutes). The project may be too large or have dependency issues.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Failed to start dev server');
      }
    } finally {
      setIsStartingServer(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  // Auto-send initial prompt (execute only once)
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Recursively collect all file paths
  const collectFilePaths = (nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        paths.push(node.path);
      } else if (node.children) {
        paths.push(...collectFilePaths(node.children));
      }
    }
    return paths;
  };

  // Load all file contents
  const loadAllFiles = async (sid: string) => {
    console.log('[loadAllFiles] Starting to load files for session:', sid);
    try {
      const response = await fetch(`/api/files?sessionId=${sid}`);
      const data = await response.json();
      console.log('[loadAllFiles] Files API response:', data);
      
      if (data.success && data.tree) {
        const filePaths = collectFilePaths(data.tree);
        console.log('[loadAllFiles] Collected file paths:', filePaths);
        const fileContents: Record<string, string> = {};

        // 并行加载所有文件内容
        await Promise.all(
          filePaths.map(async (path) => {
            try {
              const fileResponse = await fetch(
                `/api/files?sessionId=${sid}&path=${encodeURIComponent(path)}`
              );
              const fileData = await fileResponse.json();
              console.log(`[loadAllFiles] Loaded file ${path}:`, fileData.success);
              if (fileData.success && fileData.content) {
                fileContents[path] = fileData.content;
              }
            } catch (error) {
              console.error(`Failed to load file ${path}:`, error);
            }
          })
        );

        console.log('[loadAllFiles] All files loaded:', Object.keys(fileContents));
        setFiles(fileContents);
        
        // Set first file as active file
        if (filePaths.length > 0 && !activeFile) {
          console.log('[loadAllFiles] Setting active file:', filePaths[0]);
          setActiveFile(filePaths[0]);
        }
      } else {
        console.warn('[loadAllFiles] No tree in response or not successful');
      }
    } catch (error) {
      console.error('[loadAllFiles] Failed to load files:', error);
    }
  };

  // Update preview - Auto-preview logic removed, changed to manual button click
  // const updatePreview = (sid: string) => {
  //   setPreviewUrl(`/api/preview?sessionId=${sid}&t=${Date.now()}`);
  // };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
          sessionId: sessionId || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';
        let hasReceivedResult = false;
        let currentSessionId = sessionId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                try {
                  const parsed = JSON.parse(jsonStr);

                  // Handle session info
                  if (parsed.type === 'session_info') {
                    currentSessionId = parsed.sessionId;
                    setSessionId(parsed.sessionId);
                    console.log('[Workspace] Session ID:', parsed.sessionId);
                  }

                  // Handle file update notification
                  if (parsed.type === 'file_updated') {
                    console.log('[Workspace] File updated:', parsed.tool, parsed.input);
                    // Refresh files immediately (no auto-preview)
                    if (currentSessionId) {
                      console.log('[Workspace] Triggering file reload for session:', currentSessionId);
                      loadAllFiles(currentSessionId);
                      // Auto-preview removed, changed to manual button click
                      // updatePreview(currentSessionId);
                    }
                  }

                  if (parsed.type === 'result') {
                    hasReceivedResult = true;
                    console.log('[Workspace] Received result, final refresh');
                    // Final file refresh (no auto-preview)
                    if (currentSessionId) {
                      // Delay to ensure file write completion
                      setTimeout(() => {
                        loadAllFiles(currentSessionId);
                        // Auto-preview removed, changed to manual button click
                        // updatePreview(currentSessionId);
                      }, 1000);
                    }
                    break;
                  }

                  if (parsed.type === 'assistant' && parsed.message?.content) {
                    const textContent = Array.isArray(parsed.message.content)
                      ? parsed.message.content
                          .filter((block: any) => block.type === 'text')
                          .map((block: any) => block.text)
                          .join('')
                      : parsed.message.content;

                    if (textContent) {
                      accumulatedResponse += textContent;
                      setCurrentResponse(accumulatedResponse);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing JSON:', e);
                }
              }
            }
          }

          if (hasReceivedResult) break;
        }

        if (accumulatedResponse) {
          const assistantMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: accumulatedResponse,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error sending message:', error);
      }
    } finally {
      setIsLoading(false);
      setCurrentResponse('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle file selection
  const handleSelectFile = (path: string) => {
    setActiveFile(path);
  };

  // Handle code change (read-only mode, no implementation needed)
  const handleCodeChange = (code: string, filename?: string) => {
    console.log('Code changed:', filename, code);
  };

  // Debug log
  console.log('[Workspace Debug]', {
    sessionId,
    filesCount: Object.keys(files).length,
    previewUrl,
    devServer,
    isStartingServer,
    serverError,
  });

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Left: Chat area */}
      <div className="w-96 flex flex-col border-r border-gray-800">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Qwen Coder</span>
          </div>
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isPlan = msg.role === 'assistant' && containsPlan(msg.content);
            const isSummary = msg.role === 'assistant' && !isPlan && containsSummary(msg.content);
            
            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-blue-600 text-white">
                    <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                ) : isPlan ? (
                  <div className="max-w-[85%]">
                    <PlanMessage content={msg.content} />
                  </div>
                ) : isSummary ? (
                  <div className="max-w-[85%]">
                    <SummaryMessage content={msg.content} />
                  </div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-800 text-gray-100">
                    <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                )}
              </div>
            );
          })}

          {currentResponse && (
            <div className="flex justify-start">
              {containsPlan(currentResponse) ? (
                <div className="max-w-[85%]">
                  <PlanMessage content={currentResponse} />
                  <div className="flex items-center mt-2 text-blue-400">
                    <div className="animate-pulse">●</div>
                    <span className="ml-2 text-xs">Typing...</span>
                  </div>
                </div>
              ) : containsSummary(currentResponse) ? (
                <div className="max-w-[85%]">
                  <SummaryMessage content={currentResponse} />
                  <div className="flex items-center mt-2 text-blue-400">
                    <div className="animate-pulse">●</div>
                    <span className="ml-2 text-xs">Typing...</span>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-800">
                  <div className="text-sm whitespace-pre-wrap break-words text-gray-100">
                    {currentResponse}
                  </div>
                  <div className="flex items-center mt-2 text-blue-400">
                    <div className="animate-pulse">●</div>
                    <span className="ml-2 text-xs">Typing...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="What would you like to build today?"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={2}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Code editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {Object.keys(files).length > 0 ? (
          <CodeRenderer
            files={files}
            readOnly={true}
            isComplete={!isLoading}
            onCodeChange={handleCodeChange}
            activeFile={activeFile}
            onSelectFile={handleSelectFile}
            sessionId={sessionId}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
            <div className="text-center">
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No files yet</p>
              <p className="text-sm mt-2">Start chatting with AI to generate your project</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Preview */}
      <div className="w-1/3 flex flex-col bg-gray-900 border-l border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Preview</h2>
            {devServer && (
              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                {devServer.framework} • Port {devServer.port}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!previewUrl && sessionId && Object.keys(files).length > 0 && (
              <button
                onClick={startDevServer}
                disabled={isStartingServer}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-1.5"
                title="Start Preview"
              >
                {isStartingServer ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Start Preview
                  </>
                )}
              </button>
            )}
            {previewUrl && (
              <>
                <button
                  onClick={() => setPreviewUrl(`${previewUrl.split('?t=')[0]}?t=${Date.now()}`)}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="Refresh Preview"
                >
                  <RotateCcw className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                  title="Open in New Tab"
                >
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 bg-white relative">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900">
              <div className="text-center px-8">
                <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-white">No Preview Available</p>
                <p className="text-sm mt-2 text-gray-400">
                  {Object.keys(files).length > 0
                    ? 'Click "Start Preview" to run your app'
                    : 'Start chatting with AI to generate your app'}
                </p>
                {serverError && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs text-left">
                    <p className="font-semibold mb-1">Error starting preview:</p>
                    <p className="font-mono">{serverError}</p>
                  </div>
                )}
                {isStartingServer && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Starting development server...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
