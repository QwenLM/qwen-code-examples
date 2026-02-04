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

export function convertFilesToTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [path, content] of Object.entries(files)) {
    // 关键修复：清洗所有路径，确保没有绝对路径前缀，也没有开头的 /
    // 例如：/private/var/.../package.json -> package.json
    let cleanPath = path;
    
    // 如果路径包含 'private/var' 这种系统路径，尝试只保留项目根目录后的部分
    // 但更安全的做法是依赖之前 API 层的清洗。如果这里还有脏数据，说明是之前状态残留。
    // 这里我们至少做去头部的 / 处理
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    
    // 强制移除可能的系统前缀干扰 (针对 Mac 临时目录)
    const systemPrefixes = ['private/var', 'var/folders', 'tmp/qwen-bolt'];
    for (const prefix of systemPrefixes) {
       if (cleanPath.startsWith(prefix)) {
          // 这是一个非常粗暴的启发式修复：找到第一个看起来像项目文件的位置
          // 更好的做法是后端就不传这种路径
          // 假设项目根目录下一定有 package.json 或 src，我们可以尝试截断
          // 但现在先只依赖后端的修复。
          console.warn('[convertFilesToTree] Detected system path leaking:', cleanPath);
       }
    }

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
