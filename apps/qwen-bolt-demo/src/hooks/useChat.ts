import { useState, useRef, useCallback } from 'react';
import type { Message, AttachedFile } from '@/components/workspace';
import type { ProjectSettings } from '@/contexts/ProjectContext';
import { useToken } from '@/contexts/TokenContext';

interface UseChatProps {
  settings: ProjectSettings;
  sessionId: string;
  setSessionId: (id: string) => void;
  loadAllFiles: (id: string) => Promise<void>;
}

export function useChat({ settings, sessionId, setSessionId, loadAllFiles }: UseChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  
  const { addTokenUsage } = useToken();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

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
        ...settings.uploadedFiles,
        ...attachedFiles.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          content: f.content,
          type: 'file' as const,
          size: f.size,
        })),
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
          sessionId: sessionId || undefined,
          uploadedFiles: allUploadedFiles,
          knowledge: settings.knowledge,
          modelConfig: settings.modelConfig,
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

                  if (parsed.type === 'session_info') {
                    currentSessionId = parsed.sessionId;
                    setSessionId(parsed.sessionId);
                  }

                  if (parsed.type === 'file_updated') {
                    if (currentSessionId) {
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

                    if (currentSessionId) {
                      setTimeout(() => {
                        loadAllFiles(currentSessionId);
                      }, 1000);
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
