'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Cable } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  containerId: string;
  socketUrl: string;
  onDevServerDetected?: (info: { port: number; framework: string; proxyUrl: string }) => void;
}

const Terminal = React.forwardRef<any, TerminalProps>(({ containerId, socketUrl, onDevServerDetected }, ref) => {
  const xtermRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<any>(null);
  const hasEmittedInitialResize = useRef<boolean>(false);
  const [disconnected, setDisconnected] = useState(false);
  const [reconnectSignal, setReconnectSignal] = useState(0);

  const handleDisconnected = useCallback(() => setDisconnected(true), []);
  const handleConnected = useCallback(() => setDisconnected(false), []);
  const handleReconnect = useCallback(() => setReconnectSignal((s) => s + 1), []);

  const sendTerminalResize = useCallback((socket: Socket, terminal: any) => {
    if (!socket || !terminal) return;
    const cols = terminal.cols;
    const rows = terminal.rows;
    socket.emit('resize', { cols, rows });
  }, []);

  useEffect(() => {
    if (!containerId || !xtermRef.current) return;

    hasEmittedInitialResize.current = false;

    const initTerminal = async () => {
      const [{ Terminal: XTerm }, { FitAddon }, { ClipboardAddon }, { SearchAddon }] =
        await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-clipboard'),
          import('@xterm/addon-search'),
        ]);

      const term = new XTerm({
        fontSize: 14,
        cursorBlink: true,
        theme: { background: '#1e1e1e' },
      });

      const fitAddon = new FitAddon();
      const clipboardAddon = new ClipboardAddon();
      const searchAddon = new SearchAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(clipboardAddon);
      term.loadAddon(searchAddon);

      if (xtermRef.current) {
        term.open(xtermRef.current);
      }

      termRef.current = term;
      fitAddonRef.current = fitAddon;
      fitAddon.fit();

      const socket = io(socketUrl, {
        path: '/api/socket/socket.io',
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Terminal] Connected to WebSocket');
        socket.emit('start-terminal', { containerId });
        handleConnected();
      });

      socket.on('terminal-ready', () => {
        console.log('[Terminal] Terminal ready');
        sendTerminalResize(socket, term);
        hasEmittedInitialResize.current = true;
      });

      socket.on('output', (data: string) => {
        term.write(data);

        if (!hasEmittedInitialResize.current) {
          sendTerminalResize(socket, term);
          hasEmittedInitialResize.current = true;
        }
      });

      term.onData((data) => {
        socket.emit('input', data);
      });

      socket.on('disconnect', () => {
        console.log('[Terminal] Disconnected from WebSocket');
        term.writeln('\r\n[Disconnected]\r\n');
        handleDisconnected();
      });

      socket.on('dev-server-started', (info) => {
        console.log('[Terminal] Dev server detected:', info);
        term.writeln(`\r\n\x1b[32m✓ Detected ${info.framework} dev server on port ${info.port}\x1b[0m\r\n`);
        term.writeln(`\x1b[36mPreview will update automatically\x1b[0m\r\n`);
        if (onDevServerDetected) {
          onDevServerDetected(info);
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        setTimeout(() => {
          if (socket && term) {
            sendTerminalResize(socket, term);
          }
        }, 10);
      });

      if (xtermRef.current) {
        resizeObserver.observe(xtermRef.current);
      }

      return () => {
        term.dispose();
        socket.disconnect();
        resizeObserver.disconnect();
      };
    };

    const cleanup = initTerminal();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, [containerId, socketUrl, reconnectSignal, sendTerminalResize, handleConnected, handleDisconnected]);

  useEffect(() => {
    const handleWindowResize = () => {
      if (fitAddonRef.current && termRef.current && socketRef.current) {
        fitAddonRef.current.fit();
        setTimeout(() => {
          if (termRef.current && socketRef.current) {
            sendTerminalResize(socketRef.current, termRef.current);
          }
        }, 10);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [sendTerminalResize]);

  React.useImperativeHandle(ref, () => ({
    clear: () => {
      if (termRef.current) {
        termRef.current.clear();
      }
    },
  }));

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex-1 overflow-y-auto rounded-b-lg bg-[#1e1e1e] p-2">
        <div className="h-full w-full min-w-0" ref={xtermRef} />
        {disconnected && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <button
              className="pointer-events-auto rounded border border-gray-300 bg-white/90 px-4 py-2 font-semibold text-black shadow hover:bg-white"
              title="Reconnect Terminal"
              onClick={handleReconnect}
            >
              <Cable className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
