import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

// 递归构建文件树
async function buildFileTree(dirPath: string, relativePath: string = ''): Promise<FileNode[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // 忽略隐藏文件和 node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = join(dirPath, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const children = await buildFileTree(fullPath, relPath);
        nodes.push({
          name: entry.name,
          path: relPath,
          type: 'directory',
          children,
        });
      } else {
        nodes.push({
          name: entry.name,
          path: relPath,
          type: 'file',
        });
      }
    }

    // 排序：目录在前，文件在后
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error building file tree:', error);
    return [];
  }
}

// GET /api/files?sessionId=xxx - 获取文件树
// GET /api/files?sessionId=xxx&path=xxx - 获取文件内容
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const filePath = searchParams.get('path');

    console.log('[API /api/files] Request:', { sessionId, filePath });

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);
    console.log('[API /api/files] Workspace directory:', workspaceDir);

    // 检查工作目录是否存在
    try {
      const dirStat = await stat(workspaceDir);
      console.log('[API /api/files] Directory exists:', dirStat.isDirectory());
    } catch (error) {
      console.error('[API /api/files] Directory not found:', error);
      return NextResponse.json(
        { error: 'Session workspace not found', workspaceDir },
        { status: 404 }
      );
    }

    // 如果指定了文件路径，返回文件内容
    if (filePath) {
      // 安全检查：防止路径遍历攻击
      if (filePath.includes('..')) {
         return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 400 }
        );
      }
      
      // 去除可能的前导斜杠
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fullPath = join(workspaceDir, cleanPath);
      
      try {
        const content = await readFile(fullPath, 'utf-8');
        return NextResponse.json({ success: true, content });
      } catch (error) {
        console.error('[API /api/files] Error reading file:', error);
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
    }

    // 否则返回文件树
    // 我们总是从 workspaceDir 开始构建，relativePath 初始为空
    const tree = await buildFileTree(workspaceDir, '');
    
    // 如果根目录包含一个意外的顶级目录（例如 private/var/... 泄露的情况），我们需要在这里进行额外清洗
    // 但如果在 buildFileTree 时我们正确地使用了 relativePath，理论上返回的 tree 就已经是相对路径了。
    // buildFileTree(workspaceDir, '') -> 
    //   readdir(workspaceDir) -> entries: ['package.json', 'src']
    //   entry: package.json -> path: 'package.json'
    //   entry: src -> buildFileTree(workspaceDir/src, 'src') -> path: 'src/App.tsx'
    // 所以这里的 tree 应该是干净的。
    // 但是之前的截图中看到了 `private`，这说明可能之前 files 对象里的 key 本身就是脏的。
    // 这里的 API 是用来全量加载文件状态的。如果之前的流式更新没有推送到 files 状态，
    // 那么这里全量加载返回的树就至关重要。

    return NextResponse.json({ success: true, tree });

      const fullPath = join(workspaceDir, filePath);
      
      try {
        const content = await readFile(fullPath, 'utf-8');
        return NextResponse.json({
          success: true,
          path: filePath,
          content,
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'File not found or cannot be read' },
          { status: 404 }
        );
      }
    }

    // 否则返回文件树
    const fileTree = await buildFileTree(workspaceDir);
    console.log('[API /api/files] Built file tree:', JSON.stringify(fileTree, null, 2));
    
    return NextResponse.json({
      success: true,
      sessionId,
      workspaceDir,
      tree: fileTree,
    });
  } catch (error) {
    console.error('Error in files endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
