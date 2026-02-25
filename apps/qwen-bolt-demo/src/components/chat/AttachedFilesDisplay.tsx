'use client';

import { File, Folder, X } from 'lucide-react';

export interface AttachedFileItem {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  isFolder?: boolean;
  folderName?: string;
  fileCount?: number;
}

export interface AttachedFilesDisplayProps {
  attachedFiles: AttachedFileItem[];
  onFileRemoved?: (fileId: string) => void;
  onFolderRemoved?: (folderName: string) => void;
  /** Whether to show remove buttons. Defaults to true when callbacks are provided. */
  removable?: boolean;
  className?: string;
}

/**
 * Displays a list of attached files and folders as compact badges.
 * Supports optional remove buttons for interactive use (e.g. in chat input).
 */
export function AttachedFilesDisplay({
  attachedFiles,
  onFileRemoved,
  onFolderRemoved,
  removable,
  className = '',
}: AttachedFilesDisplayProps) {
  if (attachedFiles.length === 0) return null;

  const showRemoveButtons = removable ?? (!!onFileRemoved || !!onFolderRemoved);

  // Group files by folder
  const folderGroups = new Map<string, AttachedFileItem[]>();
  const standaloneFiles: AttachedFileItem[] = [];

  attachedFiles.forEach(file => {
    if (file.isFolder && file.folderName) {
      if (!folderGroups.has(file.folderName)) {
        folderGroups.set(file.folderName, []);
      }
      folderGroups.get(file.folderName)!.push(file);
    } else {
      standaloneFiles.push(file);
    }
  });

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Folder badges */}
      {Array.from(folderGroups.entries()).map(([folderName, files]) => (
        <div
          key={folderName}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs group"
        >
          <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {folderName}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-[10px]">
            ({files.length} files)
          </span>
          {showRemoveButtons && onFolderRemoved && (
            <button
              onClick={() => onFolderRemoved(folderName)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
              title="Remove folder"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>
      ))}

      {/* Standalone file badges */}
      {standaloneFiles.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs group"
        >
          <File className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]" title={file.path}>
            {file.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-[10px]">
            {(file.size / 1024).toFixed(1)}KB
          </span>
          {showRemoveButtons && onFileRemoved && (
            <button
              onClick={() => onFileRemoved(file.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
              title="Remove file"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
