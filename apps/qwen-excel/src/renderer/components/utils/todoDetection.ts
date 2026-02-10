export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface TodoList {
  items: TodoItem[];
  messageId: string;
}

export function detectTodoListInMessage(messageContent: string): TodoItem[] | null {
  try {
    // Look for TodoWrite tool usage patterns in the message content
    const todoWritePattern = /"name":\s*"TodoWrite"[\s\S]*?"todos":\s*(\[[\s\S]*?\])/g;
    const matches = [...messageContent.matchAll(todoWritePattern)];
    
    if (matches.length === 0) {
      return null;
    }
    
    // Get the last todo list (most recent state)
    const lastMatch = matches[matches.length - 1];
    const todosJsonString = lastMatch[1];
    
    // Parse the JSON
    const todos = JSON.parse(todosJsonString);
    
    // Validate that it's a valid todo structure
    if (Array.isArray(todos) && todos.every(isValidTodoItem)) {
      return todos;
    }
    
    return null;
  } catch (error) {
    // If parsing fails, return null
    console.error('Error parsing todo list:', error);
    return null;
  }
}

function isValidTodoItem(item: any): item is TodoItem {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.content === 'string' &&
    ['pending', 'in_progress', 'completed'].includes(item.status) &&
    ['high', 'medium', 'low'].includes(item.priority)
  );
}

export function extractTodoListsFromMessages(messages: any[]): TodoList[] {
  const todoLists: TodoList[] = [];
  
  messages.forEach((message) => {
    if (message.type === 'assistant' && message.raw) {
      // Check the raw message content for TodoWrite tool calls
      const rawContent = JSON.stringify(message.raw);
      const todos = detectTodoListInMessage(rawContent);
      
      if (todos && todos.length > 0) {
        todoLists.push({
          items: todos,
          messageId: message.id,
        });
      }
    }
  });
  
  // Return all todo lists to maintain persistence
  return todoLists;
}