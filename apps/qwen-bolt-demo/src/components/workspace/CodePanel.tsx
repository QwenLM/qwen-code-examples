'use client';

import { Code2 } from 'lucide-react';
import CodeRenderer from '@/components/CodeRenderer';

interface CodePanelProps {
  files: Record<string, string>;
  activeFile: string;
  sessionId: string;
  isLoading: boolean;
  onSelectFile: (path: string) => void;
  onCodeChange: (code: string, filename?: string) => void;
}

export function CodePanel({
  files,
  activeFile,
  sessionId,
  isLoading,
  onSelectFile,
  onCodeChange,
}: CodePanelProps) {
  if (Object.keys(files).length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No files yet</p>
          <p className="text-sm mt-2">Start chatting with AI to generate your project</p>
        </div>
      </div>
    );
  }

  return (
    <CodeRenderer
      files={files}
      readOnly={true}
      isComplete={!isLoading}
      onCodeChange={onCodeChange}
      activeFile={activeFile}
      onSelectFile={onSelectFile}
      sessionId={sessionId}
    />
  );
}
