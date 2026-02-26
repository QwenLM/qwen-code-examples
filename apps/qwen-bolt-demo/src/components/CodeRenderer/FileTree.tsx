'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Search, X, FilePlus, FolderPlus } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { FileTreeProps } from './types';
import { buildFileTree, getFileIcon, FileNode } from './utils';
import { ContextMenu, buildFileTreeActions } from './ContextMenu';

// Inline input for creating/renaming files and folders
interface InlineInputState {
  parentDir: string;
  type: 'file' | 'folder';
  initialValue: string;
  renamingPath?: string; // set when renaming an existing node
}

const InlineInput: React.FC<{
  level: number;
  initialValue: string;
  type: 'file' | 'folder';
  onSubmit: (value: string) => void;
  onCancel: () => void;
}> = ({ level, initialValue, type, onSubmit, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialValue) {
      // Select the name part (before extension for files)
      const dotIndex = initialValue.lastIndexOf('.');
      const selectionEnd = type === 'file' && dotIndex > 0 ? dotIndex : initialValue.length;
      inputRef.current?.setSelectionRange(0, selectionEnd);
    }
  }, [initialValue, type]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) {
      onSubmit(trimmed);
    } else if (!trimmed) {
      onCancel();
    } else {
      onCancel(); // name unchanged
    }
  };

  const Icon = type === 'folder' ? Folder : getFileIcon(value || 'untitled');

  return (
    <div
      className="flex items-center gap-2 px-3 py-0.5"
      style={{ paddingLeft: `${level * 12 + 12}px` }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        className="flex-1 min-w-0 px-1.5 py-0.5 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded outline-none text-gray-900 dark:text-gray-200"
        placeholder={type === 'folder' ? 'folder name' : 'filename'}
      />
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps & { sessionId?: string }> = ({ 
  files, 
  activeFile, 
  onSelectFile, 
  sessionId,
  searchQuery: propSearchQuery,
  onSearchChange,
  isSearchOpen: propIsSearchOpen,
  onSearchOpenChange,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localIsSearchOpen, setLocalIsSearchOpen] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodePath: string; nodeType: 'file' | 'directory' } | null>(null);
  
  // Inline input state (for new file, new folder, rename)
  const [inlineInput, setInlineInput] = useState<InlineInputState | null>(null);

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const isSearchOpen = propIsSearchOpen !== undefined ? propIsSearchOpen : localIsSearchOpen;

  const setSearchQuery = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    else setLocalSearchQuery(val);
  };

  const setIsSearchOpen = (val: boolean) => {
    if (onSearchOpenChange) onSearchOpenChange(val);
    else setLocalIsSearchOpen(val);
  };

  // Optimize: Only rebuild tree when file list changes, not content
  const filePaths = useMemo(() => Object.keys(files), [files]);
  const fileTree = useMemo(() => buildFileTree(filePaths), [filePaths]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand a folder (used when creating inside it)
  const expandFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, nodePath: string, nodeType: 'file' | 'directory') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, nodePath, nodeType });
  }, []);

  const handleNewFile = useCallback((parentDir: string) => {
    if (parentDir) expandFolder(parentDir);
    setInlineInput({ parentDir, type: 'file', initialValue: '' });
  }, [expandFolder]);

  const handleNewFolder = useCallback((parentDir: string) => {
    if (parentDir) expandFolder(parentDir);
    setInlineInput({ parentDir, type: 'folder', initialValue: '' });
  }, [expandFolder]);

  const handleCopyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // Fallback: no-op
    }
  }, []);

  const handleRename = useCallback((path: string) => {
    const parts = path.split('/');
    const name = parts.pop() || '';
    const parentDir = parts.join('/');
    // Determine type by checking if path has children in files
    const isDirectory = Object.keys(files).some(f => f.startsWith(path + '/'));
    setInlineInput({
      parentDir,
      type: isDirectory ? 'folder' : 'file',
      initialValue: name,
      renamingPath: path,
    });
  }, [files]);

  const handleDelete = useCallback((path: string) => {
    if (onDeleteFile) {
      onDeleteFile(path);
    }
  }, [onDeleteFile]);

  const handleInlineSubmit = useCallback((value: string) => {
    if (!inlineInput) return;

    if (inlineInput.renamingPath) {
      // Rename operation
      const newPath = inlineInput.parentDir ? `${inlineInput.parentDir}/${value}` : value;
      if (onRenameFile && newPath !== inlineInput.renamingPath) {
        onRenameFile(inlineInput.renamingPath, newPath);
      }
    } else if (inlineInput.type === 'file') {
      // New file
      const fullPath = inlineInput.parentDir ? `${inlineInput.parentDir}/${value}` : value;
      if (onCreateFile) {
        onCreateFile(fullPath, '');
        onSelectFile(fullPath);
      }
    } else {
      // New folder
      const fullPath = inlineInput.parentDir ? `${inlineInput.parentDir}/${value}` : value;
      if (onCreateFolder) {
        onCreateFolder(fullPath);
        expandFolder(fullPath);
      }
    }
    setInlineInput(null);
  }, [inlineInput, onCreateFile, onCreateFolder, onRenameFile, onSelectFile, expandFolder]);

  // Background right-click (empty area) → new file/folder at root
  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodePath: '', nodeType: 'directory' });
  }, []);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
      if (!query.trim()) return nodes;
      
      const lowerQuery = query.toLowerCase();
      const filtered: FileNode[] = [];
      
      for (const node of nodes) {
        if (node.type === 'file') {
          const fileContent = files[node.path] || '';
          if (
            node.name.toLowerCase().includes(lowerQuery) || 
            fileContent.toLowerCase().includes(lowerQuery)
          ) {
            filtered.push(node);
          }
        } else if (node.type === 'directory' && node.children) {
          const filteredChildren = filterNodes(node.children, query);
          if (filteredChildren.length > 0) {
            filtered.push({
              ...node,
              children: filteredChildren,
            });
          }
        }
      }
      
      return filtered;
    };
    
    return filterNodes(fileTree, searchQuery);
  }, [fileTree, searchQuery, searchQuery ? files : undefined]);

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const collectPaths = (nodes: FileNode[]): string[] => {
        const paths: string[] = [];
        for (const node of nodes) {
          if (node.type === 'directory') {
            paths.push(node.path);
            if (node.children) {
              paths.push(...collectPaths(node.children));
            }
          }
        }
        return paths;
      };
      
      const pathsToExpand = collectPaths(filteredTree);
      if (pathsToExpand.length > 0) {
        setExpandedFolders(new Set(pathsToExpand));
      }
    }
  }, [searchQuery, filteredTree]);

  // Determine the depth level for a path
  const getLevel = (path: string): number => {
    if (!path) return 0;
    return path.split('/').length;
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.type === 'file' && node.path === activeFile;
    const Icon = node.type === 'directory' 
      ? (isExpanded ? FolderOpen : Folder)
      : getFileIcon(node.name);

    // If this node is being renamed, show inline input instead
    if (inlineInput?.renamingPath === node.path) {
      return (
        <InlineInput
          key={`rename-${node.path}`}
          level={level}
          initialValue={inlineInput.initialValue}
          type={inlineInput.type}
          onSubmit={handleInlineSubmit}
          onCancel={() => setInlineInput(null)}
        />
      );
    }

    // Highlight matching text
    const highlightText = (text: string) => {
      if (!searchQuery.trim()) return text;
      
      const query = searchQuery.toLowerCase();
      const index = text.toLowerCase().indexOf(query);
      
      if (index === -1) return text;
      
      return (
        <>
          {text.substring(0, index)}
          <span className="bg-yellow-500/30 text-yellow-300">
            {text.substring(index, index + searchQuery.length)}
          </span>
          {text.substring(index + searchQuery.length)}
        </>
      );
    };

    // Check if inline input should appear inside this directory (at the top of children)
    const showInlineInputHere = inlineInput
      && !inlineInput.renamingPath
      && inlineInput.parentDir === node.path
      && node.type === 'directory';

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.path, node.type)}
        >
          {node.type === 'directory' && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm truncate">{highlightText(node.name)}</span>
        </div>
        {node.type === 'directory' && isExpanded && (
          <div>
            {showInlineInputHere && (
              <InlineInput
                key="inline-new"
                level={level + 1}
                initialValue=""
                type={inlineInput.type}
                onSubmit={handleInlineSubmit}
                onCancel={() => setInlineInput(null)}
              />
            )}
            {node.children?.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Check if inline input should appear at root level
  const showRootInlineInput = inlineInput && !inlineInput.renamingPath && inlineInput.parentDir === '';

  return (
    <div className="h-full border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">FILES</h3>
        <div className="flex items-center gap-1">
          <Tooltip content="New File" side="bottom">
            <button
              onClick={() => handleNewFile('')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors group"
            >
              <FilePlus className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </button>
          </Tooltip>
          <Tooltip content="New Folder" side="bottom">
            <button
              onClick={() => handleNewFolder('')}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors group"
            >
              <FolderPlus className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </button>
          </Tooltip>
          <Tooltip content="Search Files" side="bottom">
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) {
                  setSearchQuery('');
                }
              }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors group"
            >
              <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search input */}
      {isSearchOpen && (
        <div className="px-3 py-2 border-b border-gray-300 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full px-3 py-1.5 pr-8 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            {searchQuery && (
              <Tooltip content="Clear search" side="bottom">
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* File tree */}
      <div
        className="flex-1 overflow-y-auto py-2"
        onContextMenu={handleBackgroundContextMenu}
      >
        {showRootInlineInput && (
          <InlineInput
            key="inline-root"
            level={0}
            initialValue=""
            type={inlineInput.type}
            onSubmit={handleInlineSubmit}
            onCancel={() => setInlineInput(null)}
          />
        )}
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => renderNode(node))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No files match your search
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={buildFileTreeActions({
            nodePath: contextMenu.nodePath,
            nodeType: contextMenu.nodeType,
            onNewFile: handleNewFile,
            onNewFolder: handleNewFolder,
            onCopyPath: handleCopyPath,
            onRename: handleRename,
            onDelete: handleDelete,
          })}
        />
      )}
    </div>
  );
};