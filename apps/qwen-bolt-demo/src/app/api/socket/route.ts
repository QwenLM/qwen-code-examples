import { Server as SocketIOServer } from 'socket.io';
import { spawn } from 'node-pty';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// 存储终端会话
const terminals = new Map<string, any>();

// 创建 Socket.IO 服务器实例
let io: SocketIOServer | null = null;

function initSocketIO(server: any) {
  if (io) return io;

  io = new SocketIOServer(server, {
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
        // 创建伪终端
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME || process.cwd(),
          env: process.env as any,
        });

        terminals.set(socket.id, ptyProcess);

        // 发送终端就绪事件
        socket.emit('terminal-ready');

        // 监听终端输出
        ptyProcess.onData((data) => {
          socket.emit('output', data);
        });

        // 监听终端退出
        ptyProcess.onExit(({ exitCode }) => {
          console.log('[Socket.IO] Terminal exited with code:', exitCode);
          terminals.delete(socket.id);
          socket.emit('output', `\r\n[Process exited with code ${exitCode}]\r\n`);
        });

        console.log('[Socket.IO] Terminal started successfully');
      } catch (error) {
        console.error('[Socket.IO] Error starting terminal:', error);
        socket.emit('output', `\r\n[Error starting terminal: ${error}]\r\n`);
      }
    });

    socket.on('input', (data) => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.write(data);
      }
    });

    socket.on('resize', ({ cols, rows }) => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.resize(cols, rows);
      }
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

  return io;
}

// Next.js API 路由处理
export async function GET(request: NextRequest) {
  return new Response('WebSocket endpoint. Use Socket.IO client to connect.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
