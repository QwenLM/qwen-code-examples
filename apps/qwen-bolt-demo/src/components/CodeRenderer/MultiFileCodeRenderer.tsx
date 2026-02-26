'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MultiFileCodeRendererProps } from './types';
import { FileTree } from './FileTree';
import { CodeEditorPanel } from './CodeEditorPanel';
import { PanelLeft, GripVertical, Copy, Check, Save, RotateCcw } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import logger from '@/lib/logger';

export const MultiFileCodeRenderer: React.FC<
  MultiFileCodeRendererProps & { tabBarExtraContent?: React.ReactNode; sessionId?: string }
> = ({
  files,
  readOnly = true,
  isComplete = true,
  onCodeChange,
  onSaveFile,
  activeFile: propActiveFile,
  onSelectFile,
  tabBarExtraContent,
  sessionId,
}) => {
  // Derive effective active file from props
  // We sort keys to ensure deterministic behavior
  const filePaths = React.useMemo(() => Object.keys(files).sort(), [files]);
  const activeFile = propActiveFile || filePaths[0] || '';

  logger.debug(`[MultiFileCodeRenderer] Render. Active: ${activeFile}, FileHash: ${files[activeFile]?.slice(0,20).replace(/\n/g, '\\n')}..., FileKeys: ${Object.keys(files).length}`);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileTreeWidth, setFileTreeWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Track unsaved edits per file: path -> edited content
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({});

  const hasUnsavedChange = activeFile && unsavedChanges[activeFile] !== undefined;

  const handleSave = useCallback(() => {
    if (!activeFile || unsavedChanges[activeFile] === undefined) return;
    const editedContent = unsavedChanges[activeFile];
    if (onSaveFile) {
      onSaveFile(activeFile, editedContent);
    }
    // Remove from unsaved after save
    setUnsavedChanges(prev => {
      const next = { ...prev };
      delete next[activeFile];
      return next;
    });
  }, [activeFile, unsavedChanges, onSaveFile]);

  const handleReset = () => {
    if (!activeFile || !hasUnsavedChange) return;
    // Remove unsaved change — CodeEditorPanel will re-sync from files[activeFile]
    setUnsavedChanges(prev => {
      const next = { ...prev };
      delete next[activeFile];
      return next;
    });
  };

  const handleCopy = async () => {
    if (!activeFile || !files[activeFile]) return;
    try {
      await navigator.clipboard.writeText(files[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Auto-switch to file if search query matches content and current file does not
  useEffect(() => {
    if (!searchQuery.trim() || !files) return;

    const lowerQuery = searchQuery.toLowerCase();
    const currentFileContent = files[activeFile] || '';
    
    // If current file already has the match, don't switch (user might be browsing matches in current file)
    if (currentFileContent.toLowerCase().includes(lowerQuery)) {
      return;
    }

    // Otherwise, find the first file that matches
    for (const path of filePaths) {
      if (path === activeFile) continue;
      
      const content = files[path] || '';
      if (
        path.toLowerCase().includes(lowerQuery) || 
        content.toLowerCase().includes(lowerQuery)
      ) {
        onSelectFile?.(path);
        break;
      }
    }
  }, [searchQuery, files, activeFile, onSelectFile, filePaths]);
  
  // Refs for drag tracking
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Handle file selection
  const handleSelectFile = (path: string) => {
    onSelectFile?.(path);
  };

  // Handle code change: track as unsaved instead of immediately saving
  const handleCodeChange = (code: string, filename?: string) => {
    if (!filename) return;
    // Check if content actually differs from the saved version
    if (code === files[filename]) {
      // Content matches saved version, remove from unsaved
      setUnsavedChanges(prev => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
    } else {
      // Track as unsaved change
      setUnsavedChanges(prev => ({ ...prev, [filename]: code }));
    }
    if (onCodeChange) {
      onCodeChange(code, filename);
    }
  };

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

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
            <FileTree 
              files={files} 
              activeFile={activeFile} 
              onSelectFile={handleSelectFile} 
              sessionId={sessionId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSearchOpen={isSearchOpen}
              onSearchOpenChange={setIsSearchOpen}
            />
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
            <Tooltip content={sidebarOpen ? 'Collapse file tree' : 'Expand file tree'} side="bottom">
              <button
                className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <PanelLeft
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    sidebarOpen ? '' : 'rotate-180'
                  }`}
                />
              </button>
            </Tooltip>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{activeFile}</span>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChange && (
              <>
                <Tooltip content="Save changes" side="bottom">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </Tooltip>
                <Tooltip content="Discard changes" side="bottom">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </Tooltip>
              </>
            )}
            <Tooltip content={copied ? "Copied" : "Copy code"} side="bottom">
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </Tooltip>
            {tabBarExtraContent}
          </div>
        </div>

        {/* Editor */}
        <div className="min-h-0 flex-1">
          <CodeEditorPanel
            file={activeFile}
            code={unsavedChanges[activeFile] !== undefined ? unsavedChanges[activeFile] : (files[activeFile] || '')}
            readOnly={readOnly}
            isComplete={isComplete}
            onChange={handleCodeChange}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
};
