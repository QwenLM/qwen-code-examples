import React, { useEffect, useRef } from 'react';
import Message from './Message';
import TodoListDisplay from './TodoListDisplay';
import { ChatMessage } from './types';
import { TodoItem } from './utils/todoDetection';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  currentTodos?: TodoItem[];
}

function MessageList({ messages, isLoading, currentTodos = [] }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto px-6 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">Welcome!</p>
          <p className="text-sm">
            Start by typing a message below and attach files to get started.
          </p>
        </div>
      )}

      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {isLoading && messages[messages.length - 1]?.isThinking && (
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
          <span className="text-sm">Claude is thinking...</span>
        </div>
      )}

      {/* Global Todo List Display */}
      {currentTodos.length > 0 && (
        <div className="mt-4">
          <TodoListDisplay todos={currentTodos} />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
