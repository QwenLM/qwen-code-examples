import { FileSystemTree, DirectoryNode } from '@webcontainer/api';
import JSZip from 'jszip';

export async function downloadProjectAsZip(files: Record<string, string>, projectName = 'project') {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    zip.file(cleanPath, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Lock files generated on the host platform may contain platform-specific optional
// dependencies (e.g. @rollup/rollup-darwin-arm64) that break npm install inside
// WebContainer (Linux). Filter them out before mounting.
export const EXCLUDED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

/**
 * Remove lock files and other excluded entries from a file map.
 * Used when restoring files from history (IndexedDB) or server responses.
 */
export function filterExcludedFiles(files: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const fileName = path.split('/').pop() || '';
    if (!EXCLUDED_FILES.has(fileName)) {
      filtered[path] = content;
    }
  }
  return filtered;
}

export function convertFilesToTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [path, content] of Object.entries(files)) {
    // 1. Clean the path (remove leading slash)
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // 2. Skip lock files to avoid platform-specific dependency issues in WebContainer
    const fileName = cleanPath.split('/').pop() || '';
    if (EXCLUDED_FILES.has(fileName)) continue;
    
    // 2. Split path into segments
    const parts = cleanPath.split('/');
    let currentLevel = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        // Create file node
        currentLevel[part] = {
          file: {
            contents: content,
          },
        };
      } else {
        // Create directory node if it doesn't exist
        if (!currentLevel[part]) {
          currentLevel[part] = {
            directory: {},
          };
        }
        
        // Navigate down ONLY if it is a directory
        const node = currentLevel[part];
        if ('directory' in node) {
          currentLevel = node.directory;
        } else {
          // Path conflict: trying to use a file name as a folder name
          console.warn(`[FileTree] Path conflict at ${part} for ${path}. Skipping.`);
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
