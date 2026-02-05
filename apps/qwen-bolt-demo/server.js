const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { spawn } = require('child_process');
const pty = require('node-pty');
const httpProxy = require('http-proxy');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 存储终端会话
const terminals = new Map();

// 存储开发服务器信息
const devServers = new Map(); // sessionId -> { port, framework, proxy }

// 创建代理服务器
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // 处理代理请求
      if (req.url.startsWith('/dev-server/')) {
        const sessionId = parsedUrl.query.sessionId;
        if (sessionId && devServers.has(sessionId)) {
          const devServer = devServers.get(sessionId);
          const targetUrl = `http://localhost:${devServer.port}`;
          const proxyPath = req.url.replace(/^\/dev-server\//, '/');
          
          console.log(`[Proxy] Forwarding ${proxyPath} to ${targetUrl}`);
          
          req.url = proxyPath;
          proxy.web(req, res, { target: targetUrl }, (err) => {
            console.error('[Proxy] Error:', err);
            res.statusCode = 502;
            res.end('Bad Gateway');
          });
          return;
        }
      }
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 创建 Socket.IO 服务器
  const io = new SocketIOServer(server, {
    path: '/api/socket/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id);

    socket.on('start-terminal', ({ containerId, sessionId }) => {
      console.log('[Socket.IO] Starting terminal for container:', containerId);

      try {
        const platform = process.platform;
        let cwd = process.cwd();
        
        // 尝试切换到会话工作目录
        if (sessionId) {
            try {
                const path = require('path');
                const fs = require('fs');
                const os = require('os');
                const workspaceDir = path.join(os.tmpdir(), 'qwen-bolt', sessionId);
                
                if (fs.existsSync(workspaceDir)) {
                    cwd = workspaceDir;
                    console.log('[Socket.IO] Switching CWD to workspace:', cwd);
                } else {
                     console.log('[Socket.IO] Workspace dir not found, using default CWD:', cwd);
                }
            } catch (e) {
                console.error('[Socket.IO] Error resolving workspace cwd:', e);
            }
        }
        
        let terminal;

        if (platform === 'win32') {
          // Windows: 使用 PowerShell
          terminal = spawn('powershell.exe', [], {
            cwd,
            env: process.env,
          });
          console.log('[Socket.IO] Started PowerShell (Windows)');
        } else {
          // macOS/Linux: 使用 Python 的 pty 模块
          // 这是一个完全使用标准库的方案，不需要编译原生模块
          // -u 参数强制 python 使用无缓冲 I/O，这对于实时终端至关重要
          const shell = process.env.SHELL || '/bin/zsh';
          
          // 修改 Prompt 环境变量，隐藏长路径，只显示当前目录名或自定义提示符
          // 注意：不同 Shell 配置 Prompt 的环境变量不同，这里主要针对 Zsh/Bash
          const env = {
              ...process.env,
              TERM: 'xterm-256color',
              // 尝试覆盖 PS1 环境变量以简化路径显示
              // \W: basename of cwd, \$: prompt char
              PS1: '\\W \\$ ', 
          };
          
          const pythonScript = `import pty; pty.spawn("${shell}")`;
          
          console.log('[Socket.IO] Starting Python PTY bridge for:', shell);
          
          terminal = spawn('python3', ['-u', '-c', pythonScript], {
            cwd,
            env
          });
        }

        terminals.set(socket.id, terminal);
        socket.emit('terminal-ready');

        // 处理输出 (PTY -> Socket)
        terminal.stdout.on('data', (data) => {
          socket.emit('output', data.toString());
          
          // 顺便检测 dev server
          const output = data.toString();
          const detection = detectDevServer(output);
          if (detection.detected && detection.port) {
            console.log(`[Socket.IO] Detected ${detection.framework} dev server on port ${detection.port}`);
            devServers.set(containerId, { port: detection.port, framework: detection.framework });
            socket.emit('dev-server-started', {
              port: detection.port,
              framework: detection.framework,
              proxyUrl: `/dev-server/?sessionId=${containerId}`,
            });
          }
        });

        // 错误处理
        terminal.stderr.on('data', (data) => {
          console.error('[Terminal Stderr]:', data.toString());
          socket.emit('output', data.toString());
        });

        terminal.on('exit', (code) => {
          console.log('[Socket.IO] Terminal process exited:', code);
          terminals.delete(socket.id);
          socket.emit('output', `\r\n[Process exited with code ${code}]\r\n`);
        });

        terminal.on('error', (err) => {
             console.error('[Socket.IO] Failed to spawn terminal:', err);
             socket.emit('output', `\r\n[Error spawning terminal. ensure python3 is installed: ${err.message}]\r\n`);
        });

      } catch (error) {
        console.error('[Socket.IO] Setup error:', error);
        socket.emit('output', `\r\n[Setup Error: ${error.message}]\r\n`);
      }
    });



    socket.on('input', (data) => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
          // 将输入直接写入到 Python 桥接进程的标准输入
          // Python 的 pty.spawn 会自动处理这些输入并转发给 Shell
          try {
            terminal.stdin.write(data);
          } catch(e) {
             console.error('[Terminal Input Error]:', e);
          }
      }
    });

    socket.on('resize', ({ cols, rows }) => {
       // Python PTY 桥接模式下很难调整大小，我们可以尝试发送 SIGWINCH 但需要 native 模块
       // 暂时忽略 resize，保证核心输入输出可用
    });

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', socket.id);
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.kill();
        terminals.delete(socket.id);
      }
    });
  });
  
  // 开发服务器检测函数
  function detectDevServer(output) {
    const patterns = [
      // Vite
      { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'Vite' },
      { regex: /Local:\s+http:\/\/127\.0\.0\.1:(\d+)/, framework: 'Vite' },
      
      // React (Create React App)
      { regex: /webpack compiled|Compiled successfully!/, framework: 'React', defaultPort: 3000 },
      { regex: /On Your Network:\s+http:\/\/\d+\.\d+\.\d+\.\d+:(\d+)/, framework: 'React' },
      
      // Next.js
      { regex: /ready - started server on.*http:\/\/localhost:(\d+)/, framework: 'Next.js' },
      { regex: /Ready on http:\/\/localhost:(\d+)/, framework: 'Next.js' },
      
      // Vue CLI
      { regex: /App running at:/, framework: 'Vue' },
      { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'Vue' },
      
      // Angular
      { regex: /Angular Live Development Server is listening/, framework: 'Angular', defaultPort: 4200 },
      { regex: /Local:\s+http:\/\/localhost:(\d+)/, framework: 'Angular' },
      
      // 通用模式
      { regex: /http:\/\/localhost:(\d+)/, framework: 'Unknown' },
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern.regex);
      if (match) {
        const port = match[1] ? parseInt(match[1], 10) : pattern.defaultPort;
        return {
          detected: true,
          port,
          framework: pattern.framework,
        };
      }
    }
    return { detected: false };
  }

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running on ws://${hostname}:${port}/api/socket/socket.io`);
    });
});
