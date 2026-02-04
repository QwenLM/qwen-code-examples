import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { tmpdir } from 'os';
import { readdir, readFile, stat } from 'fs/promises';
import JSZip from 'jszip';

export const runtime = 'nodejs';

// 递归读取目录中的所有文件
async function getAllFiles(dirPath: string, baseDir: string = dirPath): Promise<{ path: string; content: Buffer }[]> {
  const files: { path: string; content: Buffer }[] = [];
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      // 跳过 node_modules 和隐藏文件
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // 递归读取子目录
        const subFiles = await getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // 读取文件内容
        const content = await readFile(fullPath);
        const relativePath = fullPath.substring(baseDir.length + 1);
        files.push({ path: relativePath, content });
      }
    }
  } catch (error) {
    console.error(`[Download API] Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log('[Download API] Creating zip for session:', sessionId);

    // 获取工作区目录
    const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);
    
    // 检查目录是否存在
    try {
      await stat(workspaceDir);
    } catch {
      return NextResponse.json(
        { error: 'Session workspace not found' },
        { status: 404 }
      );
    }

    // 读取所有文件
    const files = await getAllFiles(workspaceDir);
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files found in workspace' },
        { status: 404 }
      );
    }

    console.log(`[Download API] Found ${files.length} files to zip`);

    // 创建 ZIP 文件
    const zip = new JSZip();
    
    for (const file of files) {
      zip.file(file.path, file.content);
    }

    // 生成 ZIP 文件（使用 blob 类型）
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    console.log(`[Download API] Generated zip file, size: ${zipBlob.size} bytes`);

    // 返回 ZIP 文件
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="project-${sessionId.substring(0, 8)}.zip"`,
        'Content-Length': zipBlob.size.toString(),
      },
    });
  } catch (error) {
    console.error('[Download API] Error creating zip:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
