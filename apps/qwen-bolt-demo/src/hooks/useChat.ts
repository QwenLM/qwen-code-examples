import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message, AttachedFile } from '@/components/workspace';
import type { ProjectSettings } from '@/contexts/ProjectContext';
import { useToken } from '@/contexts/TokenContext';
import { useProject } from '@/contexts/ProjectContext';

interface UseChatProps {
  settings: ProjectSettings; // Kept for API compatibility, but we'll prefer Context directly
  sessionId: string;
  setSessionId: (id: string) => void;
  loadAllFiles: (id: string) => Promise<void>;
  onFileUpdate?: (path: string, content: string) => void;
}

export function useChat({ settings: propsSettings, sessionId, setSessionId, loadAllFiles, onFileUpdate }: UseChatProps) {
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

  // Use a ref to track the latest settings to avoid closure staleness issues
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    console.log('[useChat] Settings updated in ref (from Context):', settings.modelConfig);
  }, [settings]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Use current settings from ref
    const currentSettings = settingsRef.current;
    
    // Double check directly from context if possible (though ref should be synced)
    console.log('[useChat] sendMessage called. Current ref config:', currentSettings.modelConfig);


    const currentAttachedFiles = [...attachedFiles];

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

      console.log('[useChat] Sending request with config:', currentSettings.modelConfig);

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
        let accumulatedResponse = '';
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

                   // Handle file updates (New Stream-to-Browser Architecture)
                  if (currentEvent === 'file' && parsed.type === 'file_update') {
                     if (onFileUpdate) {
                       onFileUpdate(parsed.path, parsed.content);
                     }
                     // Skip normal message processing for file events
                     currentEvent = 'message'; // Reset
                     continue;
                  }

                  if (parsed.type === 'session_info') {
                    currentSessionId = parsed.sessionId;
                    setSessionId(parsed.sessionId);
                  }

                  if (parsed.type === 'file_updated') {
                    // Legacy polling trigger - can be removed eventually
                    if (currentSessionId && !onFileUpdate) {
                      loadAllFiles(currentSessionId);
                    }
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

                    // Optimization: even though we have streaming updates (onFileUpdate), do a full fetch at end of turn as a fallback
                    // This ensures any missed file watch events (fs.watch can be unreliable) are corrected for eventual consistency
                    if (currentSessionId) {
                      setTimeout(() => {
                        console.log('[useChat] Turn complete, performing final consistency check (loadAllFiles)');
                        loadAllFiles(currentSessionId);
                      }, 500); // Slight delay to ensure filesystem I/O completes
                    }
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sending message:', error);
      }
    } finally {
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
    abortControllerRef
  };
}
