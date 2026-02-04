'use client';

import { KeyboardEvent } from 'react';
import { Send, X, File, Folder } from 'lucide-react';
import { FileAttachment } from '@/components/FileAttachment';
import { TokenDisplay } from '@/components/TokenDisplay';

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  path: string;
  size: number;
  isFolder?: boolean;
  folderName?: string;
  fileCount?: number;
}

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  attachedFiles: AttachedFile[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onFilesAttached: (files: AttachedFile[]) => void;
  onFileRemoved: (fileId: string) => void;
  onFolderRemoved: (folderName: string) => void;
}

function AttachedFilesDisplay({ 
  attachedFiles, 
  onFileRemoved, 
  onFolderRemoved 
}: { 
  attachedFiles: AttachedFile[];
  onFileRemoved: (fileId: string) => void;
  onFolderRemoved: (folderName: string) => void;
}) {
  if (attachedFiles.length === 0) return null;

  // Group by folder
  const folderGroups = new Map<string, AttachedFile[]>();
  const standaloneFiles: AttachedFile[] = [];
  
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
    <div className="mb-3 flex flex-wrap gap-2">
      {/* Display folders */}
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
          <button
            onClick={() => onFolderRemoved(folderName)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
            title="Remove folder"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
      
      {/* Display standalone files */}
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
          <button
            onClick={() => onFileRemoved(file.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
            title="Remove file"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ChatInput({
  input,
  isLoading,
  attachedFiles,
  onInputChange,
  onSend,
  onFilesAttached,
  onFileRemoved,
  onFolderRemoved,
}: ChatInputProps) {
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-black">
      <AttachedFilesDisplay 
        attachedFiles={attachedFiles}
        onFileRemoved={onFileRemoved}
        onFolderRemoved={onFolderRemoved}
      />
      
      <div className="flex gap-2 mb-2">
        <FileAttachment 
          attachedFiles={attachedFiles}
          onFilesAttached={onFilesAttached}
          onFileRemoved={onFileRemoved}
        />
        <TokenDisplay />
      </div>
      
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="What would you like to build today?"
          disabled={isLoading}
          className="w-full px-6 py-5 pr-14 bg-white dark:bg-gray-900 border border-gray-300/60 dark:border-gray-700/60 rounded-2xl resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          rows={4}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          className="absolute right-3 bottom-3 p-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full transition-all flex items-center justify-center shadow-sm"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export type { AttachedFile };
