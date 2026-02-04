import { useState, useCallback } from 'react';

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
              const fileResponse = await fetch(
                `/api/files?sessionId=${sid}&path=${encodeURIComponent(path)}`
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
    loadAllFiles
  };
}
