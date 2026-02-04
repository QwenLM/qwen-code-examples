'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MultiFileCodeRendererProps } from './types';
import { FileTree } from './FileTree';
import { CodeEditorPanel } from './CodeEditorPanel';
import { PanelLeft, GripVertical } from 'lucide-react';

export const MultiFileCodeRenderer: React.FC<
  MultiFileCodeRendererProps & { tabBarExtraContent?: React.ReactNode; sessionId?: string }
> = ({
  files,
  readOnly = true,
  isComplete = true,
  onCodeChange,
  activeFile: propActiveFile,
  onSelectFile,
  tabBarExtraContent,
  sessionId,
}) => {
  const [activeFile, setActiveFile] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileTreeWidth, setFileTreeWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs for drag tracking
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Initialize active file
  useEffect(() => {
    if (propActiveFile) {
      setActiveFile(propActiveFile);
    } else {
      // Set first file as active if none specified
      const firstFile = Object.keys(files)[0];
      if (firstFile) {
        setActiveFile(firstFile);
      }
    }
  }, [propActiveFile, files]);

  // Handle file selection
  const handleSelectFile = (path: string) => {
    setActiveFile(path);
    onSelectFile?.(path);
  };

  // Handle code change with proper typing
  const handleCodeChange = (code: string, filename?: string) => {
    if (onCodeChange && filename) {
      onCodeChange(code, filename);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = fileTreeWidth;
  };

  // Handle resize with proper delta tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - dragStartX.current;
      const newWidth = Math.min(Math.max(dragStartWidth.current + deltaX, 150), 500);
      setFileTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="relative flex h-full min-h-0 w-full bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div style={{ width: `${fileTreeWidth}px` }} className="flex-shrink-0">
            <FileTree files={files} activeFile={activeFile} onSelectFile={handleSelectFile} sessionId={sessionId} />
          </div>
          
          {/* Resize handle */}
          <div
            className={`w-1 cursor-col-resize flex-shrink-0 group relative transition-colors ${
              isResizing ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700 hover:bg-blue-500/50'
            }`}
            onMouseDown={handleDragStart}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </>
      )}

      {/* Editor Area */}
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Collapse file tree' : 'Expand file tree'}
            >
              <PanelLeft
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  sidebarOpen ? '' : 'rotate-180'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{activeFile}</span>
          </div>

          {tabBarExtraContent}
        </div>

        {/* Editor */}
        <div className="min-h-0 flex-1">
          <CodeEditorPanel
            file={activeFile}
            code={files[activeFile] || ''}
            readOnly={readOnly}
            isComplete={isComplete}
            onChange={handleCodeChange}
          />
        </div>
      </div>
    </div>
  );
};
