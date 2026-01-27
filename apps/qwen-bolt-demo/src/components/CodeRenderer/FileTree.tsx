'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Download, Search, X } from 'lucide-react';
import { FileTreeProps } from './types';
import { buildFileTree, getFileIcon, FileNode } from './utils';

export const FileTree: React.FC<FileTreeProps & { sessionId?: string }> = ({ files, activeFile, onSelectFile, sessionId }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const fileTree = buildFileTree(files);

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

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
      if (!query.trim()) return nodes;
      
      const lowerQuery = query.toLowerCase();
      const filtered: FileNode[] = [];
      
      for (const node of nodes) {
        if (node.type === 'file') {
          // Check if file name matches
          if (node.name.toLowerCase().includes(lowerQuery)) {
            filtered.push(node);
          }
        } else if (node.type === 'directory' && node.children) {
          // Recursively filter children
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
  }, [fileTree, searchQuery]);

  // Auto-expand folders when searching (use useEffect for side effects)
  React.useEffect(() => {
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

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.type === 'file' && node.path === activeFile;
    const Icon = node.type === 'directory' 
      ? (isExpanded ? FolderOpen : Folder)
      : getFileIcon(node.name);

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

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-800/50 transition-colors ${
            isActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
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
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Download project
  const handleDownload = async () => {
    if (!sessionId) {
      alert('No session ID available');
      return;
    }

    try {
      const response = await fetch(`/api/download?sessionId=${sessionId}`);
      
      if (!response.ok) {
        const error = await response.json();
        alert(`Download failed: ${error.error || 'Unknown error'}`);
        return;
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${sessionId.substring(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download project');
    }
  };

  return (
    <div className="w-64 border-r border-gray-700 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-400">FILES</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) {
                setSearchQuery('');
              }
            }}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors group"
            title="Search Files"
          >
            <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
          </button>
          {sessionId && Object.keys(files).length > 0 && (
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors group"
              title="Download Project"
            >
              <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search input */}
      {isSearchOpen && (
        <div className="px-3 py-2 border-b border-gray-700 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full px-3 py-1.5 pr-8 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-700 rounded"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => renderNode(node))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No files match your search
          </div>
        )}
      </div>
    </div>
  );
};
