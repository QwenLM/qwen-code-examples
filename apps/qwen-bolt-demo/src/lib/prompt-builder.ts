export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// Simplified guidelines - minimal functional constraints only
const CORE_GUIDELINES = `
1. **Tool Usage**:
   - You have native permissions to read/write files and run shell commands.
   - ALWAYS use provided tools (write_file, replace_string_in_file) to modify files.
   - Double-check file paths are workspace-relative.

2. **Runtime Environment**:
   - Target: **WebContainer** (Browser-based Node.js running in the browser).
   - Shell: Use sh/jsh. **NO** zsh/bash.
   - Database: Use **Supabase** (client-side) or mock data. No sqlite/mongo.

3. **Important - Preview & Access**:
   - The project runs inside a WebContainer in the browser. The platform automatically handles installing dependencies, starting the dev server, and showing a live preview.
   - **DO NOT** tell the user to run commands like "npm install", "npm run dev", or visit any localhost URLs (e.g. http://localhost:5173).
   - **DO NOT** include any "how to access" or "visit http://localhost:xxxx" instructions in your response.
   - Simply describe what you built and the project structure. The platform takes care of the rest.
`;

export function getSystemInstructions(knowledge?: string): string {
  const parts: string[] = [];
  
  parts.push(`<CORE_GUIDELINES>\n${CORE_GUIDELINES.trim()}\n</CORE_GUIDELINES>`);

  if (knowledge && knowledge.trim()) {
    parts.push(`<GLOBAL_INSTRUCTIONS>\n${knowledge.trim()}\n</GLOBAL_INSTRUCTIONS>`);
  }

  return parts.join('\n\n');
}

export function buildUserMessage(message: string, filesContext?: string): string {
  const parts: string[] = [];
  
  if (filesContext && filesContext.trim()) {
    parts.push(filesContext.trim());
  }

  parts.push(message);
  
  return parts.join('\n\n');
}
