/**
 * Metadata for Claude Code tools including icons, colors, and formatting
 */

export interface ToolMetadata {
  icon: string;
  color: string;
  category: 'read' | 'write' | 'execute' | 'search' | 'agent' | 'other';
  description: string;
}

/**
 * Mapping of tool names to their visual metadata
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // File Reading Tools
  Read: {
    icon: '📖',
    color: '#3B82F6', // blue-500
    category: 'read',
    description: 'Reading a file',
  },
  Glob: {
    icon: '🔍',
    color: '#3B82F6',
    category: 'search',
    description: 'Finding files by pattern',
  },
  Grep: {
    icon: '🔎',
    color: '#3B82F6',
    category: 'search',
    description: 'Searching file contents',
  },

  // File Writing Tools
  Write: {
    icon: '✍️',
    color: '#F59E0B', // amber-500
    category: 'write',
    description: 'Writing a file',
  },
  Edit: {
    icon: '✏️',
    color: '#F59E0B',
    category: 'write',
    description: 'Editing a file',
  },
  NotebookEdit: {
    icon: '📓',
    color: '#F59E0B',
    category: 'write',
    description: 'Editing Jupyter notebook',
  },

  // Execution Tools
  Bash: {
    icon: '⚙️',
    color: '#8B5CF6', // violet-500
    category: 'execute',
    description: 'Running command',
  },
  BashOutput: {
    icon: '📊',
    color: '#8B5CF6',
    category: 'execute',
    description: 'Checking command output',
  },
  KillShell: {
    icon: '🛑',
    color: '#EF4444', // red-500
    category: 'execute',
    description: 'Stopping background process',
  },

  // Agent Tools
  Task: {
    icon: '🤖',
    color: '#10B981', // green-500
    category: 'agent',
    description: 'Delegating to subagent',
  },

  // Web Tools
  WebFetch: {
    icon: '🌐',
    color: '#06B6D4', // cyan-500
    category: 'read',
    description: 'Fetching web content',
  },
  WebSearch: {
    icon: '🔗',
    color: '#06B6D4',
    category: 'search',
    description: 'Searching the web',
  },

  // Planning Tools
  TodoWrite: {
    icon: '✅',
    color: '#14B8A6', // teal-500
    category: 'other',
    description: 'Updating task list',
  },
  ExitPlanMode: {
    icon: '📋',
    color: '#14B8A6',
    category: 'other',
    description: 'Presenting plan',
  },

  // MCP Tools
  ListMcpResources: {
    icon: '📚',
    color: '#6366F1', // indigo-500
    category: 'read',
    description: 'Listing MCP resources',
  },
  ReadMcpResource: {
    icon: '📄',
    color: '#6366F1',
    category: 'read',
    description: 'Reading MCP resource',
  },

  // Skills
  Skill: {
    icon: '🎯',
    color: '#EC4899', // pink-500
    category: 'other',
    description: 'Using skill',
  },
  SlashCommand: {
    icon: '⚡',
    color: '#EC4899',
    category: 'other',
    description: 'Running command',
  },

  // User Interaction
  AskUserQuestion: {
    icon: '❓',
    color: '#6B7280', // gray-500
    category: 'other',
    description: 'Asking question',
  },
};

/**
 * Get metadata for a tool, with fallback for unknown tools
 */
export function getToolMetadata(toolName: string): ToolMetadata {
  return TOOL_METADATA[toolName] || {
    icon: '🔧',
    color: '#6B7280',
    category: 'other',
    description: `Using ${toolName}`,
  };
}

/**
 * Format tool input for display
 * Handles common parameter types and truncates long values
 */
export function formatToolInput(
  toolName: string,
  input: Record<string, any>,
): Array<{ key: string; value: string; truncated: boolean }> {
  const formatted: Array<{ key: string; value: string; truncated: boolean }> = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;

    let displayValue: string;
    let truncated = false;

    // Handle different value types
    if (typeof value === 'string') {
      if (value.length > 100) {
        displayValue = value.substring(0, 100) + '...';
        truncated = true;
      } else {
        displayValue = value;
      }
    } else if (typeof value === 'object') {
      const jsonStr = JSON.stringify(value, null, 2);
      if (jsonStr.length > 200) {
        displayValue = JSON.stringify(value);
        if (displayValue.length > 100) {
          displayValue = displayValue.substring(0, 100) + '...';
          truncated = true;
        }
      } else {
        displayValue = jsonStr;
      }
    } else {
      displayValue = String(value);
    }

    formatted.push({ key, value: displayValue, truncated });
  }

  return formatted;
}

/**
 * Get a friendly name for tool parameters
 */
export function getFriendlyParameterName(key: string): string {
  const mapping: Record<string, string> = {
    file_path: 'File',
    pattern: 'Pattern',
    command: 'Command',
    prompt: 'Prompt',
    description: 'Description',
    subagent_type: 'Agent Type',
    old_string: 'Find',
    new_string: 'Replace',
    content: 'Content',
    url: 'URL',
    query: 'Query',
    notebook_path: 'Notebook',
    cell_id: 'Cell',
    new_source: 'Source',
    todos: 'Tasks',
    glob: 'File Filter',
    type: 'File Type',
    path: 'Path',
    output_mode: 'Output Mode',
  };

  return mapping[key] || key;
}
