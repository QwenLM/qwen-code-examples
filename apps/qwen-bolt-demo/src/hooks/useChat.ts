import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message, AttachedFile } from '@/components/workspace';
import type { ProjectSettings } from '@/contexts/ProjectContext';
import { useToken } from '@/contexts/TokenContext';
import { useProject } from '@/contexts/ProjectContext';
import { saveChatSession, getChatSession } from '@/lib/chat-persistence';
import logger from '@/lib/logger';

interface UseChatProps {
  settings: ProjectSettings;
  sessionId: string;
  setSessionId: (id: string) => void;
  loadAllFiles: (sessionId?: string) => Promise<void>;
  onFileUpdate?: (path: string, content: string) => void;
  files: Record<string, string>;
  onFilesLoaded?: (files: Record<string, string>) => void;
}

export function useChat({ settings: propsSettings, sessionId, setSessionId, loadAllFiles, onFileUpdate, files, onFilesLoaded }: UseChatProps) {
  // Directly access Context to ensure we always have the latest state, bypassing any prop propagation delays
  const { settings: contextSettings } = useProject();
  // Prefer context settings if available (which it should be), fallback to props
  const settings = contextSettings || propsSettings;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  
  const { addTokenUsage } = useToken();
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Load chat history from IndexedDB when sessionId changes
  useEffect(() => {
    async function loadHistory() {
      if (sessionId && messages.length === 0) {
        try {
          const session = await getChatSession(sessionId);
          if (session) {
            if (session.messages.length > 0) {
              logger.debug('[useChat] Loaded history from DB for session:', sessionId);
              setMessages(session.messages);
            }
            if (session.files && Object.keys(session.files).length > 0 && onFilesLoaded) {
               logger.debug('[useChat] Loaded files from DB for session:', sessionId);
               onFilesLoaded(session.files);
            }
          }
        } catch (e) {
          console.error('[useChat] Failed to load chat history:', e);
        }
      }
    }
    loadHistory();
  }, [sessionId]);

  // Save chat history to IndexedDB when messages change
  useEffect(() => {
    async function saveHistory() {
      if (sessionId && messages.length > 0) {
        try {
          // Use the first user message as title, or "New Chat"
          const firstUserMsg = messages.find(m => m.role === 'user');
          const titleContent = firstUserMsg?.content || 'New Chat';
          const title = titleContent.slice(0, 50) + (titleContent.length > 50 ? '...' : '');
          
          const existing = await getChatSession(sessionId);
          const createdAt = existing?.createdAt || Date.now();

          await saveChatSession({
            id: sessionId,
            title,
            createdAt, // Preserve creation time
            updatedAt: Date.now(),
            messages,
            files
          });
        } catch (e) {
          console.error('[useChat] Failed to save chat history:', e);
        }
      }
    }
    // Debounce save
    const timer = setTimeout(saveHistory, 1000);
    return () => clearTimeout(timer);
  }, [messages, sessionId, files]);

  // Use a ref to track the latest settings to avoid closure staleness issues
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    logger.debug('[useChat] Settings updated in ref (from Context):', settings.modelConfig);
  }, [settings]);

  const sendMessage = useCallback(async (messageText?: string, extraFiles?: AttachedFile[]) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Use current settings from ref
    const currentSettings = settingsRef.current;
    
    // Double check directly from context if possible (though ref should be synced)
    logger.debug('[useChat] sendMessage called. Current ref config:', currentSettings.modelConfig);

    // Merge extra files (e.g. from home page restore) with current attached files
    const currentAttachedFiles = extraFiles ? [...attachedFiles, ...extraFiles] : [...attachedFiles];
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
      attachedFiles: currentAttachedFiles,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setCurrentResponse('');

    abortControllerRef.current = new AbortController();

    let accumulatedResponse = '';

    try {
      const allUploadedFiles = [
        ...currentSettings.uploadedFiles,
        ...attachedFiles.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          content: f.content,
          type: 'file' as const,
          size: f.size,
        })),
      ];

      logger.debug('[useChat] Sending request with config:', currentSettings.modelConfig);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
          sessionId: sessionId || undefined,
          uploadedFiles: allUploadedFiles,
          knowledge: currentSettings.knowledge,
          modelConfig: currentSettings.modelConfig,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let hasReceivedResult = false;
        let currentSessionId = sessionId;
        let buffer = '';
        let currentEvent = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          // Keep the last line in the buffer as it might be incomplete
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for event type
            if (line.startsWith('event: ')) {
               currentEvent = line.slice(7).trim();
               continue;
            }

            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr.trim()) {
                try {
                  const parsed = JSON.parse(jsonStr);

                   // Handle file write events from backend MCP Server
                  if (currentEvent === 'file' && (parsed.type === 'file_write' || parsed.type === 'file_update')) {
                     if (onFileUpdate) {
                       onFileUpdate(parsed.path, parsed.content);
                     }
                     currentEvent = 'message';
                     continue;
                  }

                  if (parsed.type === 'session_info') {
                    currentSessionId = parsed.sessionId;
                    setSessionId(parsed.sessionId);
                  }

                  if (parsed.type === 'auth_required') {
                    const authMsg: Message = {
                      id: `auth_${Date.now()}`,
                      role: 'assistant',
                      content: `**Authorization Required**\n\nPlease [click here to authorize the application](${parsed.url}).\n\nAfter you have authorized in the new window, this chat will continue automatically.`,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, authMsg]);
                  }

                  if (parsed.type === 'result') {
                    hasReceivedResult = true;

                    if (parsed.usage) {
                      const inputTokens = parsed.usage.input_tokens || parsed.usage.prompt_tokens || 0;
                      const outputTokens = parsed.usage.output_tokens || parsed.usage.completion_tokens || 0;
                      if (inputTokens > 0 || outputTokens > 0) {
                        addTokenUsage(inputTokens, outputTokens);
                      }
                    }

                    // Sync files from WebContainer FS after turn completes
                    setTimeout(() => {
                      logger.debug('[useChat] Turn complete, syncing files from WebContainer FS');
                      loadAllFiles();
                    }, 500);
                    break;
                  }

                  if (parsed.type === 'assistant' && parsed.message?.content) {
                    const textContent = Array.isArray(parsed.message.content)
                      ? parsed.message.content
                          .filter((block: { type: string }) => block.type === 'text')
                          .map((block: { text: string }) => block.text)
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
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
         logger.debug('Request aborted by user');
      } else if (error instanceof Error) {
        console.error('Error sending message:', error);
      }
    } finally {
      if (accumulatedResponse) {
          const assistantMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: accumulatedResponse,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
      }
      setIsLoading(false);
      setCurrentResponse('');
    }
  }, [input, isLoading, attachedFiles, messages, sessionId, settings, loadAllFiles, setSessionId, addTokenUsage]);

  return {
    input,
    setInput,
    messages,
    setMessages,
    isLoading,
    currentResponse,
    attachedFiles,
    setAttachedFiles,
    sendMessage,
    abortControllerRef,
    stop
  };
}
