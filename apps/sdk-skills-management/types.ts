/**
 * Qwen Code SDK Chimp - Type Definitions
 * Internal types, users don't need to worry about underlying authentication details
 */

/** Authentication configuration - internal use, auto-detected */
export interface AuthConfig {
  /** Service type (internal use) */
  type: 'openai' | 'qwen';
  /** API key */
  apiKey: string;
  /** API base URL */
  baseUrl?: string;
  /** Model name */
  model?: string;
  /** Organization/workspace ID */
  organizationId?: string;
  /** Project/application name */
  projectName?: string;
  /** Timeout duration */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Qwen specific: whether to enable search */
  enableSearch?: boolean;
  /** Qwen specific: result format */
  resultFormat?: 'message' | 'text';
}

/** OpenAI authentication configuration - internal use */
export interface OpenAIAuthConfig extends AuthConfig {
  type: 'openai';
}

/** Qwen authentication configuration - internal use */
export interface QwenAuthConfig extends AuthConfig {
  type: 'qwen';
}

/** Chat message role */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Chat message */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: number;
}

/** Streaming response callbacks */
export interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolUseId: string, result: unknown, isError: boolean) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}
