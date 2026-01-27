const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { spawn } = require('child_process');
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

    socket.on('start-terminal', ({ containerId }) => {
      console.log('[Socket.IO] Starting terminal for container:', containerId);

      try {
        // 使用 child_process 替代 node-pty（更稳定）
        let shell, shellArgs;
        if (process.platform === 'win32') {
          shell = 'powershell.exe';
          shellArgs = [];
        } else {
          // macOS/Linux - 使用 script 命令创建伪终端
          shell = '/usr/bin/script';
          shellArgs = [
            '-q',  // quiet mode
            '/dev/null',  // 不保存到文件
            process.env.SHELL || '/bin/zsh'  // 使用用户的默认 shell
          ];
        }
        
        console.log('[Socket.IO] Using shell:', shell, shellArgs);
        
        const terminal = spawn(shell, shellArgs, {
          cwd: process.env.HOME || process.cwd(),
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          },
        });

        terminals.set(socket.id, terminal);

        // 发送终端就绪事件
        socket.emit('terminal-ready');

        // 监听标准输出
        terminal.stdout.on('data', (data) => {
          const output = data.toString();
          socket.emit('output', output);
          
          // 检测开发服务器启动
          const detection = detectDevServer(output);
          if (detection.detected && detection.port) {
            console.log(`[Socket.IO] Detected ${detection.framework} dev server on port ${detection.port}`);
            
            devServers.set(containerId, {
              port: detection.port,
              framework: detection.framework,
            });
            
            // 通知前端开发服务器已启动
            socket.emit('dev-server-started', {
              port: detection.port,
              framework: detection.framework,
              proxyUrl: `/dev-server/?sessionId=${containerId}`,
            });
          }
        });

        // 监听标准错误
        terminal.stderr.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        // 监听进程退出
        terminal.on('exit', (code) => {
          console.log('[Socket.IO] Terminal exited with code:', code);
          terminals.delete(socket.id);
          socket.emit('output', `\r\n[Process exited with code ${code}]\r\n`);
        });

        // 监听错误
        terminal.on('error', (error) => {
          console.error('[Socket.IO] Terminal error:', error);
          socket.emit('output', `\r\n[Terminal error: ${error.message}]\r\n`);
        });

        console.log('[Socket.IO] Terminal started successfully');
      } catch (error) {
        console.error('[Socket.IO] Error starting terminal:', error);
        socket.emit('output', `\r\n[Error starting terminal: ${error.message}]\r\n`);
      }
    });

    socket.on('input', (data) => {
      const terminal = terminals.get(socket.id);
      if (terminal && terminal.stdin) {
        terminal.stdin.write(data);
      }
    });

    socket.on('resize', ({ cols, rows }) => {
      // child_process 不支持 resize，忽略
      // 如果需要支持，可以使用 SIGWINCH 信号
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
