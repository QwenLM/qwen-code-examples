'use client';

import React from 'react';
import { MultiFileCodeRenderer } from './MultiFileCodeRenderer';

interface CodeRendererProps {
  isComplete?: boolean;
  files: Record<string, string>;
  readOnly?: boolean;
  onCodeChange?: (code: string, filename?: string) => void;
  onSaveFile?: (path: string, content: string) => void;
  tabBarExtraContent?: React.ReactNode;
  activeFile?: string;
  onSelectFile?: (path: string) => void;
  sessionId?: string;
  onCreateFile?: (path: string, content: string) => void;
  onCreateFolder?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

const CodeRenderer: React.FC<CodeRendererProps> = ({
  isComplete = true,
  files = {},
  readOnly = true,
  onCodeChange,
  onSaveFile,
  tabBarExtraContent,
  activeFile,
  onSelectFile,
  sessionId,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
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
        onSaveFile={onSaveFile}
        tabBarExtraContent={tabBarExtraContent}
        activeFile={activeFile}
        onSelectFile={onSelectFile}
        sessionId={sessionId}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onDeleteFile={onDeleteFile}
        onRenameFile={onRenameFile}
      />
    </div>
  );
};

export default CodeRenderer;
export { CodeRenderer };
