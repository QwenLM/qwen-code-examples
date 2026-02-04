import { FileText, Folder, FolderOpen, Code2, FileJson, FileCode } from 'lucide-react';

export function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return Code2;
    case 'json':
      return FileJson;
    case 'html':
    case 'css':
    case 'py':
    case 'java':
      return FileCode;
    default:
      return FileText;
  }
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // 排序文件路径
  const sortedPaths = Object.keys(files).sort();

  for (const path of sortedPaths) {
    const parts = path.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let node = pathMap.get(currentPath);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        };

        pathMap.set(currentPath, node);
        currentLevel.push(node);
      }

      if (!isFile && node.children) {
        currentLevel = node.children;
      }
    }
  }

  // Flatten single root directory if it exists (e.g. private/...)
  // Only do this if specific patterns are found or generally?
  // User asked for "private" specifically, but general cleaning is good.
  // We'll flatten as long as there is only 1 root and it is a directory.
  while (root.length === 1 && root[0].type === 'directory' && root[0].children) {
    // Replace root with its children
    const childNodes = root[0].children;
    root.length = 0;
    root.push(...childNodes);
  }

  return root;
}
