'use client';

import { File, Folder } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { AttachedFileItem } from './AttachedFilesDisplay';

export interface UserMessageBubbleProps {
  content: string;
  attachedFiles?: AttachedFileItem[];
}

/**
 * Displays a user message bubble with optional attached file badges.
 * Pure UI component — all data via props.
 */
export function UserMessageBubble({ content, attachedFiles }: UserMessageBubbleProps) {
  return (
    <div className="max-w-[85%]">
      {/* Attached file badges */}
      {attachedFiles && attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(() => {
            const folderGroups = new Map<string, AttachedFileItem[]>();
            const standaloneFiles: AttachedFileItem[] = [];

            attachedFiles.forEach(file => {
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
        <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}

export interface AssistantMessageBubbleProps {
  content: string;
}

/**
 * Displays an assistant message bubble with Markdown rendering.
 * Pure UI component — all data via props.
 */
export function AssistantMessageBubble({ content }: AssistantMessageBubbleProps) {
  return (
    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
      <MarkdownRenderer content={content} className="text-sm" />
    </div>
  );
}

/**
 * Displays a streaming response indicator with optional content.
 * Shows bouncing dots when empty, or content with a "Typing..." indicator.
 */
export function StreamingIndicator({ content, children }: { content: string; children?: React.ReactNode }) {
  if (!content) {
    return (
      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
      </div>
    );
  }

  return (
    <div className="max-w-[85%]">
      {children ?? (
        <div className="rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          <MarkdownRenderer content={content} className="text-sm" />
        </div>
      )}
      <div className="flex items-center mt-2 text-blue-400">
        <div className="animate-pulse">●</div>
        <span className="ml-2 text-xs">Typing...</span>
      </div>
    </div>
  );
}
