import { useState, useCallback, useEffect } from 'react';
import { useWebContainer } from './useWebContainer';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function useFiles(initialSessionId: string = '') {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const { webcontainer } = useWebContainer();

  const updateFile = useCallback(async (path: string, content: string) => {
      // 1. Update local state for UI
      setFiles(prev => ({
          ...prev,
          [path]: content
      }));

      // 2. Write directly to WebContainer file system
      if (webcontainer) {
          try {
              // Normalize path: Ensure no leading slash
              const cleanPath = path.startsWith('/') ? path.substring(1) : path;
              // Since we mount at root, the target path is just the clean path
              const targetPath = cleanPath;
              
              // Ensure directory structure exists (recursive mkdir is stored in memory FS implicitly usually, 
              // but explicit mkdir is safer for nested files if parent doesn't exist)
              const parts = targetPath.split('/');
              if (parts.length > 1) {
                  const dir = parts.slice(0, -1).join('/');
                  // This command is fast and safe to run repeatedly? 
                  // No, mkdir throws if exists. run "mkdir -p" via spawn or check fs.
                  // Since we are writing single file, let's just attempt write. 
                  // WebContainer fs.writeFile does NOT create parent dirs automatically.
                  
                  // Simplest fix: Just mkdir -p using spawn for the dir.
                  await webcontainer.spawn('mkdir', ['-p', dir]);
              }
              
              await webcontainer.fs.writeFile(targetPath, content);
              console.log('[useFiles] Wrote file to WebContainer:', targetPath);
          } catch (err) {
              console.error('[useFiles] Failed to write file to WebContainer:', path, err);
          }
      }
  }, [webcontainer]);

  const setAllFiles = useCallback((newFiles: Record<string, string>) => {
    setFiles(newFiles);
    // Note: setAllFiles is usually used on initial load or reset.
    // Syncing to WebContainer handles 'mount' separately in useDevServer currently.
    // Ideally we merge that logic here or keep mount there.
  }, []);

  // Recursively collect all file paths
  const collectFilePaths = useCallback((nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    for (const node of nodes) {
      if (node.type === 'file') {
        paths.push(node.path);
      } else if (node.children) {
        paths.push(...collectFilePaths(node.children));
      }
    }
    return paths;
  }, []);

  const loadAllFiles = useCallback(async (sid: string) => {
    console.log('[useFiles] Starting to load files for session:', sid);
    try {
      const response = await fetch(`/api/files?sessionId=${sid}`);
      const data = await response.json();
      
      if (data.success && data.tree) {
        const filePaths = collectFilePaths(data.tree);
        const fileContents: Record<string, string> = {};

        await Promise.all(
          filePaths.map(async (path) => {
            try {
              // Add timestamp to prevent caching
              const fileResponse = await fetch(
                `/api/files?sessionId=${sid}&path=${encodeURIComponent(path)}&t=${Date.now()}`
              );
              const fileData = await fileResponse.json();
              if (fileData.success && fileData.content) {
                fileContents[path] = fileData.content;
              }
            } catch (error) {
              console.error(`Failed to load file ${path}:`, error);
            }
          })
        );

        setFiles(fileContents);
        
        // If we have files but no active file, set the first one
        if (filePaths.length > 0 && !activeFile) {
          setActiveFile(filePaths[0]);
        } else if (filePaths.length > 0 && activeFile && !filePaths.includes(activeFile)) {
             // If active file is no longer in the list, verify if it still exists or pick new one
             // For now, keep as is unless explicit reset needed
        }
      } 
    } catch (error) {
      console.error('[useFiles] Failed to load files:', error);
    }
  }, [collectFilePaths, activeFile]);

  return {
    files,
    setFiles,
    activeFile,
    setActiveFile,
    sessionId,
    setSessionId,
    loadAllFiles,
    updateFile
  };
}
