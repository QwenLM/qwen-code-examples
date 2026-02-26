'use client';

import { Paperclip, File, Folder, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/ui/Tooltip';
import logger from '@/lib/logger';

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  isFolder?: boolean;
  folderName?: string;
  fileCount?: number;
}

interface FileAttachmentProps {
  attachedFiles: AttachedFile[];
  onFilesAttached: (files: AttachedFile[]) => void;
  onFileRemoved: (fileId: string) => void;
}

export function FileAttachment({ attachedFiles, onFilesAttached, onFileRemoved }: FileAttachmentProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Check if this is a folder upload
    const isFolder = fileArray.length > 0 && !!fileArray[0].webkitRelativePath;
    let folderName = '';
    
    if (isFolder) {
      // Extract folder name from the first file's path
      const firstPath = fileArray[0].webkitRelativePath;
      folderName = firstPath.split('/')[0];
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB Limit (Total or per file? User said "upload existing project... only allow 3M". Usually means total or per file. Let's assume individual file safety first, or maybe filter out large files?)

    // Let's filter first to avoid reading large files
    const validSizeFiles = fileArray.filter(file => {
        if (file.size > MAX_SIZE) {
            console.warn(`[FileAttachment] File ${file.name} (size: ${file.size}) exceeds limit of ${MAX_SIZE} bytes. Skipped.`);
            return false;
        }
        return true;
    });

    if (validSizeFiles.length < fileArray.length) {
        alert(`Some files were skipped because they exceed the 3MB size limit.`);
    }

    const uploadedFiles = await Promise.all(
      validSizeFiles.map(async (file) => {
        try {
          const content = await file.text();
          // Use webkitRelativePath for folder uploads, otherwise use file.name
          const filePath = file.webkitRelativePath || file.name;
          return {
            id: `${Date.now()}-${Math.random()}-${file.name}`,
            name: file.name,
            path: filePath,
            content,
            size: file.size,
            isFolder: isFolder,
            folderName: isFolder ? folderName : undefined,
            fileCount: isFolder ? fileArray.length : undefined,
          } as AttachedFile;
        } catch (error) {
          console.error(`Failed to read file ${file.name}:`, error);
          return null;
        }
      })
    );

    // Filter out failed uploads
    let validFiles = uploadedFiles.filter((f): f is AttachedFile => f !== null);

    // Flatten logic: If all files share the same top-level folder, strip it
    if (validFiles.length > 0 && isFolder && folderName) {
         const commonPrefix = `${folderName}/`;
         // Double check if ALL files start with this prefix (they should if it was a folder upload)
         const allHavePrefix = validFiles.every(f => f.path.startsWith(commonPrefix));
         
         if (allHavePrefix) {
             validFiles = validFiles.map(f => ({
                 ...f,
                 path: f.path.slice(commonPrefix.length), // Remove the "MyApp/" prefix
             }));
             logger.debug(`[FileAttachment] Flattened project structure by removing prefix: ${commonPrefix}`);
         }
    }
    
    if (validFiles.length > 0) {
      onFilesAttached(validFiles);
      logger.debug('[FileAttachment] Uploaded files:', validFiles.map(f => ({ 
        name: f.name, 
        path: f.path, 
        size: f.size,
        isFolder: f.isFolder,
        folderName: f.folderName,
      })));
    }
    
    setIsOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  return (
    <div className="relative">
      {/* Attach button */}
      <Tooltip content={t('fileAttachment.attach')}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </Tooltip>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover content */}
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-2 min-w-[200px]">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <File className="w-4 h-4" />
              {t('projectSettings.uploadFiles')}
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <Folder className="w-4 h-4" />
              {t('projectSettings.uploadFolder')}
            </button>
          </div>
        </>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
