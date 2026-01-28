import { type SDKMessage } from '@qwen-code/sdk';

export interface OutputFile {
  name: string;
  path: string;
  size: number;
  created: Date;
}

// Content block types from Anthropic API
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export type ContentBlock = TextBlock | ToolUseBlock | ThinkingBlock;

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string; // For simple display (backward compatibility)
  contentBlocks?: ContentBlock[]; // Structured content blocks
  timestamp: Date;
  raw?: SDKMessage;
  isThinking?: boolean;
  outputFiles?: OutputFile[];
}
