'use client';

import { RefObject } from 'react';
import { File, Folder } from 'lucide-react';
import { PlanMessage, containsPlan } from '@/components/PlanMessage';
import { SummaryMessage, containsSummary } from '@/components/SummaryMessage';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface AttachedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  isFolder?: boolean;
  folderName?: string;
  fileCount?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedFiles?: AttachedFile[];
}

interface MessageListProps {
  messages: Message[];
  currentResponse: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="max-w-[85%]">
      {/* Display attachments */}
      {message.attachedFiles && message.attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(() => {
            // Group by folder
            const folderGroups = new Map<string, AttachedFile[]>();
            const standaloneFiles: AttachedFile[] = [];
            
            message.attachedFiles.forEach(file => {
              if (file.isFolder && file.folderName) {
                if (!folderGroups.has(file.folderName)) {
                  folderGroups.set(file.folderName, []);
                }
                folderGroups.get(file.folderName)!.push(file);
              } else {
                standaloneFiles.push(file);
              }
            });
            
            return (
              <>
                {/* Display folders */}
                {Array.from(folderGroups.entries()).map(([folderName, files]) => (
                  <div
                    key={folderName}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 dark:bg-blue-500/80 rounded text-xs shadow-sm"
                  >
                    <Folder className="w-3 h-3 text-white/90" />
                    <span className="text-white font-medium">{folderName}</span>
                    <span className="text-white/70 text-[10px]">({files.length} files)</span>
                  </div>
                ))}
                
                {/* Display standalone files */}
                {standaloneFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500 dark:bg-blue-500/80 rounded text-xs shadow-sm"
                  >
                    <File className="w-3 h-3 text-white/90" />
                    <span className="text-white font-medium truncate max-w-[120px]" title={file.path}>
                      {file.name}
                    </span>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}
      
      {/* Message content */}
      <div className="rounded-2xl px-4 py-3 bg-blue-600 dark:bg-blue-600/80 text-white">
        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
      <MarkdownRenderer content={content} className="text-sm" />
    </div>
  );
}

function StreamingResponse({ content }: { content: string }) {
  const isPlan = containsPlan(content);
  const isSummary = !isPlan && containsSummary(content);

  if (isPlan) {
    return (
      <div className="max-w-[85%]">
        <PlanMessage content={content} />
        <div className="flex items-center mt-2 text-blue-400">
          <div className="animate-pulse">●</div>
          <span className="ml-2 text-xs">Typing...</span>
        </div>
      </div>
    );
  }

  if (isSummary) {
    return (
      <div className="max-w-[85%]">
        <SummaryMessage content={content} />
        <div className="flex items-center mt-2 text-blue-400">
          <div className="animate-pulse">●</div>
          <span className="ml-2 text-xs">Typing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
      <MarkdownRenderer content={content} className="text-sm" />
      <div className="flex items-center mt-2 text-blue-400">
        <div className="animate-pulse">●</div>
        <span className="ml-2 text-xs">Typing...</span>
      </div>
    </div>
  );
}

export function MessageList({ messages, currentResponse, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-black">
      {messages.map((msg) => {
        const isPlan = msg.role === 'assistant' && containsPlan(msg.content);
        const isSummary = msg.role === 'assistant' && !isPlan && containsSummary(msg.content);
        
        return (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <UserMessage message={msg} />
            ) : isPlan ? (
              <div className="max-w-[85%]">
                <PlanMessage content={msg.content} />
              </div>
            ) : isSummary ? (
              <div className="max-w-[85%]">
                <SummaryMessage content={msg.content} />
              </div>
            ) : (
              <AssistantMessage content={msg.content} />
            )}
          </div>
        );
      })}

      {currentResponse && (
        <div className="flex justify-start">
          <StreamingResponse content={currentResponse} />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export type { Message, AttachedFile };
