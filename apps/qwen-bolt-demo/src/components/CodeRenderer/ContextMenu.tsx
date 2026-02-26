'use client';

import React, { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderPlus,
  Copy,
  ClipboardCopy,
  Pencil,
  Trash2,
} from 'lucide-react';

export interface ContextMenuAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, actions, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1 text-sm"
      style={{ left: x, top: y }}
    >
      {actions.map((action, index) => (
        <React.Fragment key={action.label}>
          {action.dividerBefore && (
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          )}
          <button
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
              action.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
            onClick={() => {
              action.onClick();
              onClose();
            }}
          >
            <action.icon className="h-4 w-4 flex-shrink-0" />
            <span>{action.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Build the standard set of context menu actions for a file tree node.
 */
export function buildFileTreeActions(options: {
  nodePath: string;
  nodeType: 'file' | 'directory';
  onNewFile: (parentDir: string) => void;
  onNewFolder: (parentDir: string) => void;
  onCopyPath: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}): ContextMenuAction[] {
  const { nodePath, nodeType, onNewFile, onNewFolder, onCopyPath, onRename, onDelete } = options;
  const parentDir = nodeType === 'directory' ? nodePath : nodePath.split('/').slice(0, -1).join('/') || '';

  return [
    {
      label: 'New File...',
      icon: FilePlus,
      onClick: () => onNewFile(parentDir),
    },
    {
      label: 'New Folder...',
      icon: FolderPlus,
      onClick: () => onNewFolder(parentDir),
    },
    {
      label: 'Copy Path',
      icon: Copy,
      onClick: () => onCopyPath(`~/project/${nodePath}`),
      dividerBefore: true,
    },
    {
      label: 'Copy Relative Path',
      icon: ClipboardCopy,
      onClick: () => onCopyPath(nodePath),
    },
    {
      label: 'Rename...',
      icon: Pencil,
      onClick: () => onRename(nodePath),
      dividerBefore: true,
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => onDelete(nodePath),
      danger: true,
    },
  ];
}
