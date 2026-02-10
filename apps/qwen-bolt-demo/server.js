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

// Store terminal sessions
const terminals = new Map();

// Store dev server info
const devServers = new Map(); // sessionId -> { port, framework, proxy }

// Create proxy server
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Handle proxy requests
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

  // Create Socket.IO server
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
        
        // Try to switch to the session workspace directory
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
          // Windows: use PowerShell
          terminal = spawn('powershell.exe', [], {
            cwd,
            env: process.env,
          });
          console.log('[Socket.IO] Started PowerShell (Windows)');
        } else {
          // macOS/Linux: use Python's pty module
          // This is a pure stdlib approach that doesn't require compiling native modules
          // The -u flag forces Python to use unbuffered I/O, which is critical for real-time terminal
          const shell = process.env.SHELL || '/bin/zsh';
          
          // Override the prompt env var to hide long paths, showing only the current directory name or a custom prompt
          // Note: different shells use different env vars for the prompt; this mainly targets Zsh/Bash
          const env = {
              ...process.env,
              TERM: 'xterm-256color',
              // Try to override PS1 env var to simplify path display
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

        // Handle output (PTY -> Socket)
        terminal.stdout.on('data', (data) => {
          socket.emit('output', data.toString());
          
          // Also detect dev server
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

        // Error handling
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
          // Write input directly to the Python bridge process's stdin
          // Python's pty.spawn will automatically handle and forward these inputs to the shell
          try {
            terminal.stdin.write(data);
          } catch(e) {
             console.error('[Terminal Input Error]:', e);
          }
      }
    });

    socket.on('resize', ({ cols, rows }) => {
       // Resizing is difficult under the Python PTY bridge; we could try sending SIGWINCH but that requires a native module
       // For now, ignore resize to keep core I/O functional
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
  
  // Dev server detection function
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
      
      // Generic pattern
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
