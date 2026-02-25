'use client';

import { ReactNode } from 'react';

export interface ChatPanelProps {
  /** Header area (e.g. ChatHeader component) */
  header: ReactNode;
  /** Message list area */
  messageList: ReactNode;
  /** Input area (e.g. ChatInput component) */
  input: ReactNode;
  /** Panel width class. Defaults to 'w-[480px]' */
  widthClass?: string;
  className?: string;
}

/**
 * A pure layout container for the chat panel.
 * Composes header, message list, and input into a vertical flex column
 * with a right border separator.
 */
export function ChatPanel({
  header,
  messageList,
  input,
  widthClass = 'w-[480px]',
  className = '',
}: ChatPanelProps) {
  return (
    <div className={`${widthClass} flex flex-col border-r border-gray-200/60 dark:border-gray-800/60 ${className}`}>
      {header}
      {messageList}
      {input}
    </div>
  );
}
