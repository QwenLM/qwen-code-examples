import { FileSystemTree, DirectoryNode } from '@webcontainer/api';

export function convertFilesToTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash if present to avoid empty string root keys
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const parts = cleanPath.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue; // Skip empty parts just in case

      const isFile = i === parts.length - 1;

      if (isFile) {
        current[part] = {
          file: {
            contents: content,
          },
        };
      } else {
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        
        const node = current[part];
        if ('directory' in node) {
          current = node.directory;
        } else {
             // Conflict: trying to treat a file as a directory
             // In a realistic scenario, valid file paths shouldn't conflict like this (foo vs foo/bar)
             // But if so, we simply can't proceed down this branch. Overwriting would be destructive.
             console.warn(`Path conflict at ${part} for ${path}`);
             break;
        }
      }
    }
  }

  return tree;
}

export function findProjectRoot(files: Record<string, string>): string {
  const filePaths = Object.keys(files);
  
  // 1. Check root package.json
  if (filePaths.some(p => p === 'package.json' || p === '/package.json')) {
    return '.';
  }

  // 2. Check for package.json in subdirectories
  // Sort by depth (shortest path first) to find the "top-most" package.json
  const packageJsonPaths = filePaths
    .filter(p => p.endsWith('package.json'))
    .sort((a, b) => a.split('/').length - b.split('/').length);

  if (packageJsonPaths.length > 0) {
    const matched = packageJsonPaths[0];
    const dir = matched.substring(0, matched.lastIndexOf('/'));
    return dir.startsWith('/') ? dir.slice(1) : dir;
  }

  return '.';
}
