import { NextRequest, NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, access, writeFile } from 'fs/promises';

export const runtime = 'nodejs';

// 存储运行中的开发服务器进程
const devServers = new Map<string, {
  process: ChildProcess;
  port: number;
  framework: string;
  url: string;
}>();

// 检测项目类型和可用的启动命令
async function detectProjectType(workspaceDir: string): Promise<{
  type: 'react' | 'vue' | 'vite' | 'static' | 'unknown';
  framework: string;
  startCommand: string;
  actualWorkspaceDir: string; // 实际的项目目录
}> {
  try {
    // 先检查根目录是否有 package.json
    let packageJsonPath = join(workspaceDir, 'package.json');
    let actualWorkspaceDir = workspaceDir;
    
    try {
      await access(packageJsonPath);
    } catch {
      // 根目录没有 package.json，检查是否有子目录包含项目
      const fs = require('fs');
      const entries = fs.readdirSync(workspaceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = join(workspaceDir, entry.name);
          const subPackageJsonPath = join(subDirPath, 'package.json');
          
          try {
            await access(subPackageJsonPath);
            // 找到了包含 package.json 的子目录
            packageJsonPath = subPackageJsonPath;
            actualWorkspaceDir = subDirPath;
            console.log(`[DevServer] Found project in subdirectory: ${entry.name}`);
            break;
          } catch {
            // 继续检查下一个子目录
          }
        }
      }
    }
    
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    // 获取可用的脚本
    const scripts = packageJson.scripts || {};
    
    // 优先级：dev > start > serve
    let startCommand = 'npm start'; // 默认
    if (scripts.dev) {
      startCommand = 'npm run dev';
    } else if (scripts.start) {
      startCommand = 'npm start';
    } else if (scripts.serve) {
      startCommand = 'npm run serve';
    }

    // 检测 React
    if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
      if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
        return {
          type: 'vite',
          framework: 'React + Vite',
          startCommand,
          actualWorkspaceDir,
        };
      }
      return {
        type: 'react',
        framework: 'React',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 检测 Vue
    if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
      return {
        type: 'vue',
        framework: 'Vue',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 检测 Vite
    if (packageJson.dependencies?.vite || packageJson.devDependencies?.vite) {
      return {
        type: 'vite',
        framework: 'Vite',
        startCommand,
        actualWorkspaceDir,
      };
    }

    // 有 package.json 但不确定类型
    return {
      type: 'unknown',
      framework: 'Node.js',
      startCommand,
      actualWorkspaceDir,
    };
  } catch {
    // 没有 package.json，可能是静态 HTML
    return {
      type: 'static',
      framework: 'Static HTML',
      startCommand: '',
      actualWorkspaceDir: workspaceDir,
    };
  }
}

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
  // 如果已经有运行中的服务器，先停止
  const existing = devServers.get(sessionId);
  if (existing) {
    existing.process.kill();
    devServers.delete(sessionId);
  }

  const projectInfo = await detectProjectType(workspaceDir);
  
  // 使用检测到的实际工作目录
  const actualWorkspaceDir = projectInfo.actualWorkspaceDir;
  console.log(`[DevServer] Using workspace directory: ${actualWorkspaceDir}`);
  
  // 静态 HTML 项目不需要启动服务器
  if (projectInfo.type === 'static') {
    return {
      success: true,
      type: 'static',
      framework: projectInfo.framework,
      message: 'Static HTML project, using built-in preview',
    };
  }

  // 查找可用端口
  const port = await findAvailablePort();

  return new Promise((resolve, reject) => {
    // 先安装依赖
    console.log(`[DevServer] Installing dependencies for session ${sessionId}...`);
    const installProcess = spawn('npm', ['install'], {
      cwd: actualWorkspaceDir,
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });

    let installOutput = '';
    installProcess.stdout?.on('data', (data) => {
      installOutput += data.toString();
      console.log(`[DevServer Install] ${data.toString()}`);
    });

    installProcess.stderr?.on('data', (data) => {
      installOutput += data.toString();
      console.error(`[DevServer Install Error] ${data.toString()}`);
    });

    installProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`npm install failed with code ${code}\n${installOutput}`));
        return;
      }

      console.log(`[DevServer] Starting dev server for session ${sessionId} on port ${port}...`);
      console.log(`[DevServer] Using command: ${projectInfo.startCommand}`);
      
      // 为 Create React App 创建 .env 文件来指定端口
      if (projectInfo.type === 'react' && projectInfo.startCommand.includes('start')) {
        try {
          const envPath = join(actualWorkspaceDir, '.env');
          await writeFile(envPath, `PORT=${port}\nBROWSER=none\n`, 'utf-8');
          console.log(`[DevServer] Created .env file with PORT=${port}`);
        } catch (error) {
          console.error(`[DevServer] Failed to create .env file:`, error);
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
        output += data.toString();
        console.log(`[DevServer] ${data.toString()}`);

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
          });
        }
      });

      devProcess.stderr?.on('data', (data) => {
        output += data.toString();
        console.error(`[DevServer Error] ${data.toString()}`);
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

    const result = await startDevServer(sessionId, workspaceDir);
    console.log('[DevServer API] Result:', result);

    return NextResponse.json(result);
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

// DELETE /api/dev-server - 停止开发服务器
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const server = devServers.get(sessionId);

    if (server) {
      server.process.kill();
      devServers.delete(sessionId);
      return NextResponse.json({
        success: true,
        message: 'Dev server stopped',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No dev server running for this session',
    });
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
