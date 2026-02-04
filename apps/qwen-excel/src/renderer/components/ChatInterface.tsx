import React, { useState, useEffect, useCallback } from 'react';
import { type SDKMessage } from '@qwen-code/sdk';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { ChatMessage, OutputFile } from './types';
import { detectTodoListInMessage, TodoItem } from './utils/todoDetection';

function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTodos, setCurrentTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    // Set up listeners for Claude Code responses
    const removeResponseListener = window.electron.ipcRenderer.on(
      'claude-code:response',
      (message: SDKMessage) => {
        if (message.type === 'assistant') {
          setMessages((prev) => {
            const existingIndex = prev.findIndex(
              (m) => m.type === 'assistant' && !m.content,
            );

            // Extract text content for backward compatibility
            const textContent = message.message.content
              .filter((c) => c.type === 'text')
              .map((c) => (c.type === 'text' ? c.text : ''))
              .join('');

            // Preserve all content blocks (text, tool_use, thinking)
            const contentBlocks = message.message.content;

            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                content: textContent,
                contentBlocks: contentBlocks as any,
                raw: message,
                isThinking: false,
              };

              // Check for todo list in this message
              const todos = detectTodoListInMessage(JSON.stringify(message));
              if (todos && todos.length > 0) {
                setCurrentTodos(todos);
              }
              return updated;
            }

            const newMessage = {
              id: Date.now().toString(),
              type: 'assistant',
              content: textContent,
              contentBlocks: contentBlocks as any,
              timestamp: new Date(),
              raw: message,
            };

            // Check for todo list in this message
            const todos = detectTodoListInMessage(JSON.stringify(message));
            if (todos && todos.length > 0) {
              setCurrentTodos(todos);
            }

            return [...prev, newMessage];
          });
        } else if (message.type === 'result') {
          setIsLoading(false);
        }
      },
    );

    const removeErrorListener = window.electron.ipcRenderer.on(
      'claude-code:error',
      (errorMessage: string) => {
        setError(errorMessage);
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'error',
            content: `Error: ${errorMessage}`,
            timestamp: new Date(),
          },
        ]);
      },
    );

    const removeOutputFilesListener = window.electron.ipcRenderer.on(
      'claude-code:output-files',
      (outputFiles: OutputFile[]) => {
        console.log('Received output files:', outputFiles);
        setMessages((prev) => {
          const updated = [...prev];
          const lastAssistantIndex = updated.findLastIndex(
            (m) => m.type === 'assistant',
          );

          if (lastAssistantIndex >= 0) {
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              outputFiles,
            };
          }

          return updated;
        });
      },
    );

    return () => {
      removeResponseListener();
      removeErrorListener();
      removeOutputFilesListener();
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      if ((!content.trim() && !files?.length) || isLoading) return;

      // Create user message content with file info
      let displayContent = content;
      if (files?.length) {
        const fileList = files.map((f) => f.name).join(', ');
        displayContent = content
          ? `${content}\n\nFiles: ${fileList}`
          : `Files: ${fileList}`;
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: displayContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder for assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isThinking: true,
        },
      ]);

      setIsLoading(true);
      setError(null);

      // Send query to main process with files (convert File objects to transferable format)
      const sendQuery = async () => {
        let fileData: { name: string; buffer: ArrayBuffer }[] | undefined;

        if (files?.length) {
          fileData = await Promise.all(
            files.map(async (file) => ({
              name: file.name,
              buffer: await file.arrayBuffer(),
            })),
          );
        }

        window.electron.ipcRenderer.sendMessage('claude-code:query', {
          content,
          files: fileData,
        });
      };

      sendQuery();
    },
    [isLoading],
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          QWEN EXCEL AGENT
        </h1>
      </header>

      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          currentTodos={currentTodos}
        />
      </div>

      <div className="border-t border-gray-200 bg-white">
        <MessageInput onSendMessage={sendMessage} disabled={isLoading} />
      </div>

      {error && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
