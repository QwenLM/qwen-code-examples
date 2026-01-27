import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

// 查找 HTML 入口文件
async function findHtmlEntry(workspaceDir: string): Promise<string | null> {
  const possibleEntries = [
    'index.html',
    'src/index.html',
    'public/index.html',
    'dist/index.html',
  ];

  for (const entry of possibleEntries) {
    try {
      const fullPath = join(workspaceDir, entry);
      await readFile(fullPath);
      return entry;
    } catch {
      continue;
    }
  }

  // 如果没有找到，尝试搜索第一个 HTML 文件
  try {
    const files = await readdir(workspaceDir);
    const htmlFile = files.find(f => f.endsWith('.html'));
    if (htmlFile) {
      return htmlFile;
    }
  } catch {
    // ignore
  }

  return null;
}

// 读取并处理 HTML 文件，注入所有相关资源
async function buildPreviewHtml(workspaceDir: string, entryFile: string): Promise<string> {
  const htmlPath = join(workspaceDir, entryFile);
  let html = await readFile(htmlPath, 'utf-8');

  // 读取所有 CSS 文件
  const cssFiles: string[] = [];
  try {
    const files = await readdir(workspaceDir, { recursive: true });
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.css')) {
        try {
          const cssPath = join(workspaceDir, file);
          const cssContent = await readFile(cssPath, 'utf-8');
          cssFiles.push(cssContent);
        } catch {
          continue;
        }
      }
    }
  } catch {
    // ignore
  }

  // 读取所有 JS 文件
  const jsFiles: string[] = [];
  try {
    const files = await readdir(workspaceDir, { recursive: true });
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.js') && !file.includes('node_modules')) {
        try {
          const jsPath = join(workspaceDir, file);
          const jsContent = await readFile(jsPath, 'utf-8');
          jsFiles.push(jsContent);
        } catch {
          continue;
        }
      }
    }
  } catch {
    // ignore
  }

  // 注入 CSS
  if (cssFiles.length > 0) {
    const cssTag = `<style>\n${cssFiles.join('\n\n')}\n</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${cssTag}\n</head>`);
    } else {
      html = `${cssTag}\n${html}`;
    }
  }

  // 注入 JS
  if (jsFiles.length > 0) {
    const jsTag = `<script>\n${jsFiles.join('\n\n')}\n</script>`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${jsTag}\n</body>`);
    } else {
      html = `${html}\n${jsTag}`;
    }
  }

  return html;
}

// GET /api/preview?sessionId=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('sessionId is required', { status: 400 });
    }

    const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);

    // 查找 HTML 入口文件
    const entryFile = await findHtmlEntry(workspaceDir);
    
    if (!entryFile) {
      // 如果没有 HTML 文件，返回一个默认页面
      const defaultHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .message {
      text-align: center;
      color: #666;
    }
    .message h1 {
      font-size: 24px;
      margin-bottom: 12px;
      color: #333;
    }
    .message p {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>No Preview Available</h1>
    <p>Start chatting with AI to generate your app</p>
  </div>
</body>
</html>
      `;
      
      return new Response(defaultHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 构建预览 HTML
    const previewHtml = await buildPreviewHtml(workspaceDir, entryFile);

    return new Response(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in preview endpoint:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: monospace;
      background: #1a1a1a;
      color: #ff6b6b;
    }
    .error {
      background: #2a2a2a;
      border: 1px solid #ff6b6b;
      border-radius: 8px;
      padding: 20px;
    }
    h1 { margin-top: 0; }
    pre {
      background: #1a1a1a;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>Preview Error</h1>
    <p>Failed to generate preview</p>
    <pre>${error instanceof Error ? error.message : String(error)}</pre>
  </div>
</body>
</html>
    `;
    
    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}
