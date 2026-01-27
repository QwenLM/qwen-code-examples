'use client';

import React from 'react';
import { MultiFileCodeRenderer } from './MultiFileCodeRenderer';

interface CodeRendererProps {
  isComplete?: boolean;
  files: Record<string, string>;
  readOnly?: boolean;
  onCodeChange?: (code: string, filename?: string) => void;
  tabBarExtraContent?: React.ReactNode;
  activeFile?: string;
  onSelectFile?: (path: string) => void;
  sessionId?: string;
}

const CodeRenderer: React.FC<CodeRendererProps> = ({
  isComplete = true,
  files = {},
  readOnly = true,
  onCodeChange,
  tabBarExtraContent,
  activeFile,
  onSelectFile,
  sessionId,
}) => {
  // Handle multi-file content change
  const handleMultiFileContentChange = (code: string, filename: string) => {
    if (onCodeChange) {
      onCodeChange(code, filename);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <MultiFileCodeRenderer
        files={files}
        readOnly={readOnly}
        isComplete={isComplete}
        onCodeChange={handleMultiFileContentChange}
        tabBarExtraContent={tabBarExtraContent}
        activeFile={activeFile}
        onSelectFile={onSelectFile}
        sessionId={sessionId}
      />
    </div>
  );
};

export default CodeRenderer;
export { CodeRenderer };
