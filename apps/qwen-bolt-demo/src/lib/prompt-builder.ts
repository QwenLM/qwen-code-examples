export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function buildPrompt(history: HistoryMessage[], message: string, knowledge?: string, filesContext?: string): string {
  const parts: string[] = [];

  const systemInstructions: string[] = [];
  
  // High-priority global defaults
  systemInstructions.push(`<CORE_GUIDELINES>
1. **Framework Preference**: 
   - When asked to create a React project, ALWAYS use **Vite** (@vitejs/plugin-react).
   - NEVER use Create-React-App (react-scripts) as it is deprecated and slow in WebContainer environments.
   - For Vue, use Vite as well.
   - For styling, prefer Tailwind CSS unless requested otherwise.

2. **Project Structure**:
   - Ensure 'package.json' has a "dev" script: "vite".
   - Ensure 'index.html' is in the root directory (standard Vite structure), not in 'public/'.
   - Use 'src/main.tsx' or 'src/main.jsx' as the entry point.

3. **Performance**: 
   - Keep initial dependencies minimal to speed up installation.
</CORE_GUIDELINES>`);
  
  if (knowledge && knowledge.trim()) {
    systemInstructions.push(`<GLOBAL_INSTRUCTIONS>
${knowledge.trim()}
</GLOBAL_INSTRUCTIONS>`);
  }
  
  if (filesContext && filesContext.trim()) {
    systemInstructions.push(filesContext.trim());
  }
  
  if (systemInstructions.length > 0) {
    parts.push(`SYSTEM: You must follow these global instructions and use the provided context files in all your responses:

${systemInstructions.join('\n\n')}

These instructions and files apply to the entire conversation. Always consider them when responding to user requests.`);
  }
  
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item?.content) continue;
      const role = (item.role || 'user').toUpperCase();
      parts.push(`${role}: ${item.content}`);
    }
  }
  
  parts.push(`USER: ${message}`);
  return parts.join('\n\n');
}
