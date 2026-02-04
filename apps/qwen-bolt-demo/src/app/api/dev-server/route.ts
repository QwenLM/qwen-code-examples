import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, access, writeFile } from 'fs/promises';
import { detectProjectType } from '@/lib/project-detector';

export const runtime = 'nodejs';

// 存储运行中的开发服务器进程
const devServers = new Map<string, {
  process: ChildProcess;
  port: number;
  framework: string;
  url: string;
}>();

// 查找可用端口
async function findAvailablePort(start: number = 5173): Promise<number> {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(start, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => {
        console.log(`[DevServer] Found available port: ${port}`);
        resolve(port);
      });
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[DevServer] Port ${start} is in use, trying ${start + 1}...`);
        resolve(findAvailablePort(start + 1));
      } else {
        reject(err);
      }
    });
  });
}

// 启动开发服务器
async function startDevServer(sessionId: string, workspaceDir: string) {
  // 收集所有日志
  const logs: string[] = [];
  
  // 如果已经有运行中的服务器，先停止
  const existing = devServers.get(sessionId);
  if (existing) {
    existing.process.kill();
    devServers.delete(sessionId);
  }

  const projectInfo = await detectProjectType(workspaceDir);
  
  // 使用检测到的实际工作目录
  const actualWorkspaceDir = projectInfo.actualWorkspaceDir;
  const logMsg = `[DevServer] Using workspace directory: ${actualWorkspaceDir}`;
  console.log(logMsg);
  logs.push(logMsg);
  
  // 静态 HTML 项目不需要启动服务器
  if (projectInfo.type === 'static') {
    return {
      success: true,
      type: 'static',
      framework: projectInfo.framework,
      message: 'Static HTML project, using built-in preview',
      logs,
    };
  }

  // 查找可用端口
  const port = await findAvailablePort();
  logs.push(`[DevServer] Found available port: ${port}`);

  return new Promise((resolve, reject) => {
    // 先安装依赖
    const installMsg = `[DevServer] Installing dependencies for session ${sessionId}...`;
    console.log(installMsg);
    logs.push(installMsg);
    
    const installProcess = spawn('npm', ['install'], {
      cwd: actualWorkspaceDir,
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });

    let installOutput = '';
    installProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      installOutput += output;
      const logLine = `[DevServer Install] ${output}`;
      console.log(logLine);
      logs.push(logLine);
    });

    installProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      installOutput += output;
      const logLine = `[DevServer Install Error] ${output}`;
      console.error(logLine);
      logs.push(logLine);
    });

    installProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`npm install failed with code ${code}\n${installOutput}`));
        return;
      }

      const startMsg = `[DevServer] Starting dev server for session ${sessionId} on port ${port}...`;
      console.log(startMsg);
      logs.push(startMsg);
      
      const cmdMsg = `[DevServer] Using command: ${projectInfo.startCommand}`;
      console.log(cmdMsg);
      logs.push(cmdMsg);
      
      // 为 Create React App 创建 .env 文件来指定端口
      if (projectInfo.type === 'react' && projectInfo.startCommand.includes('start')) {
        try {
          const envPath = join(actualWorkspaceDir, '.env');
          await writeFile(envPath, `PORT=${port}\nBROWSER=none\n`, 'utf-8');
          const envMsg = `[DevServer] Created .env file with PORT=${port}`;
          console.log(envMsg);
          logs.push(envMsg);
        } catch (error) {
          const errMsg = `[DevServer] Failed to create .env file: ${error}`;
          console.error(errMsg);
          logs.push(errMsg);
        }
      }
      
      // 解析启动命令
      const commandParts = projectInfo.startCommand.split(' ');
      const command = commandParts[0]; // npm
      const args = commandParts.slice(1); // ['run', 'dev'] 或 ['start']
      
      // 启动开发服务器，设置多个端口环境变量以兼容不同框架
      const devProcess = spawn(command, args, {
        cwd: actualWorkspaceDir,
        shell: true,
        env: {
          ...process.env,
          PORT: String(port),           // Create React App, Next.js
          VITE_PORT: String(port),      // Vite
          DEV_SERVER_PORT: String(port), // 通用
          BROWSER: 'none',              // 禁止自动打开浏览器
        },
      });

      let output = '';
      let serverStarted = false;

      devProcess.stdout?.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        const logLine = `[DevServer] ${dataStr}`;
        console.log(logLine);
        logs.push(logLine);

        // 检测服务器是否启动成功
        if (!serverStarted && (
          output.includes('Local:') ||
          output.includes('localhost') ||
          output.includes('ready') ||
          output.includes('compiled')
        )) {
          serverStarted = true;
          const url = `http://localhost:${port}`;
          
          devServers.set(sessionId, {
            process: devProcess,
            port,
            framework: projectInfo.framework,
            url,
          });

          resolve({
            success: true,
            port,
            framework: projectInfo.framework,
            url,
            message: 'Dev server started successfully',
            logs, // 返回所有日志
          });
        }
      });

      devProcess.stderr?.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        const logLine = `[DevServer Error] ${dataStr}`;
        console.error(logLine);
        logs.push(logLine);
      });

      devProcess.on('close', (code) => {
        console.log(`[DevServer] Process exited with code ${code}`);
        devServers.delete(sessionId);
        
        if (!serverStarted) {
          // 检查是否是端口被占用
          if (output.includes('already running') || output.includes('EADDRINUSE')) {
            reject(new Error(`Port ${port} is already in use. Please stop the existing server or use a different port.`));
          } else {
            reject(new Error(`Dev server failed to start\n${output}`));
          }
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!serverStarted) {
          devProcess.kill();
          reject(new Error('Dev server start timeout'));
        }
      }, 60000); // 60 秒超时
    });
  });
}

// POST /api/dev-server - 启动开发服务器
export async function POST(request: NextRequest) {
  try {
    console.log('[DevServer API] Received request');
    const { sessionId } = await request.json();
    console.log('[DevServer API] Session ID:', sessionId);

    if (!sessionId) {
      console.error('[DevServer API] Missing sessionId');
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const workspaceDir = join(tmpdir(), 'qwen-bolt', sessionId);
    console.log('[DevServer API] Workspace directory:', workspaceDir);

    // 添加初始日志
    const initialLogs = [
      '[DevServer API] Received request',
      `[DevServer API] Session ID: ${sessionId}`,
      `[DevServer API] Workspace directory: ${workspaceDir}`,
    ];

    const result = await startDevServer(sessionId, workspaceDir) as any;
    console.log('[DevServer API] Result:', result);

    // 合并初始日志和启动日志
    const allLogs = [...initialLogs, ...(result.logs || [])];
    
    // 构建响应对象
    const response = {
      success: result.success,
      port: result.port,
      framework: result.framework,
      url: result.url,
      message: result.message,
      type: result.type,
      logs: allLogs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DevServer API] Error:', error);
    console.error('[DevServer API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/dev-server?sessionId=xxx - 停止开发服务器
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const server = devServers.get(sessionId);

    if (!server) {
      return NextResponse.json({
        success: true,
        message: 'No dev server running for this session',
      });
    }

    // Kill the process
    try {
      server.process.kill('SIGTERM');
      devServers.delete(sessionId);
      console.log(`[DevServer API] Stopped dev server for session ${sessionId} on port ${server.port}`);
      
      return NextResponse.json({
        success: true,
        message: `Dev server stopped (port ${server.port})`,
      });
    } catch (error) {
      console.error('[DevServer API] Error stopping server:', error);
      // Still remove from map even if kill fails
      devServers.delete(sessionId);
      return NextResponse.json({
        success: true,
        message: 'Dev server process terminated',
      });
    }
  } catch (error) {
    console.error('[DevServer API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET /api/dev-server?sessionId=xxx - 获取开发服务器状态
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const server = devServers.get(sessionId);

    if (!server) {
      return NextResponse.json({
        running: false,
        message: 'No dev server running for this session',
      });
    }

    return NextResponse.json({
      running: true,
      port: server.port,
      framework: server.framework,
      url: server.url,
    });
  } catch (error) {
    console.error('[DevServer API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

