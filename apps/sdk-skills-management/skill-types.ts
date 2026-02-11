/**
 * Qwen Code SDK Chimp - Skill Type Definitions
 */

/** Skill content */
export interface SkillContent {
  /** SKILL.md content */
  skillMd: string;
  /** README.md content */
  readmeMd?: string;
  /** Skill name */
  name: string;
  /** Skill path */
  path: string;
  /** Parsed metadata */
  metadata?: {
    title?: string;
    description?: string;
    functionality?: string;
    usage?: string;
  };
}

/** Skill execution options */
export interface SkillExecuteOptions {
  /** Model name */
  model?: string;
  /** Whether to stream output */
  stream?: boolean;
  /** Streaming callback */
  onChunk?: (chunk: string) => void;
  /** Tool usage callback */
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  /** System prompt (overrides default) */
  systemPrompt?: string;
  /** Session ID (for multi-turn conversation) */
  sessionId?: string;
}

/** Skill execution result */
export interface SkillExecuteResult {
  /** Result status */
  status: 'success' | 'error' | 'need_more_input';
  /** Result content */
  content: string;
  /** Parsed data (if JSON) */
  data?: Record<string, unknown>;
  /** Whether more input is needed */
  needMoreInput: boolean;
  /** Session ID */
  sessionId: string;
  /** Conversation history */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/** Skill configuration */
export interface SkillConfig {
  /** Skill folder path */
  skillsDir: string;
  /** Skill name */
  skillName: string;
  /** User input */
  prompt: string;
}

/** Multi-turn conversation session */
export interface SkillConversation {
  /** Session ID */
  sessionId: string;
  /** Skill content */
  skillContent: SkillContent;
  /** Conversation history */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** System prompt */
  systemPrompt: string;
}
