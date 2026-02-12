'use client';

import { useEffect, useRef, memo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebContainer } from '@webcontainer/api';
import { useWebContainer } from '../../hooks/useWebContainer';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  className?: string;
  readonly?: boolean;
  onServerReady?: (port: number) => void;
}

const Terminal = memo(({ className = '', readonly = false, onServerReady }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { webcontainer: webContainer, isLoading } = useWebContainer();
  const isReady = !isLoading && !!webContainer;
  const shellProcessRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Initialize Terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      disableStdin: readonly,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure container has settled
      requestAnimationFrame(() => {
        fitAddon.fit();
      });
    });
    
    resizeObserver.observe(containerRef.current);

    // Initial greeting
    term.writeln('\x1b[32mTarget environment ready.\x1b[0m');
    term.writeln('Waiting for WebContainer...');

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      initializedRef.current = false;
    };
  }, [readonly]);

  // Connect to WebContainer
  useEffect(() => {
    if (!isReady || !webContainer || !terminalRef.current || initializedRef.current) return;

    const startShell = async () => {
      try {
        initializedRef.current = true;
        const term = terminalRef.current!;
        
        term.writeln('\x1b[34mWebContainer connected. Starting shell...\x1b[0m');

        const shellProcess = await webContainer.spawn('jsh', {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
        });

        shellProcessRef.current = shellProcess;
        
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              term.write(data);
              // Simple check for server ready (Vite/Next/others)
              const match = data.match(/Local:\s+http:\/\/localhost:(\d+)/) || 
                            data.match(/Ready on http:\/\/localhost:(\d+)/) ||
                            data.match(/http:\/\/localhost:(\d+)/);
              if (match) {
                const port = parseInt(match[1], 10);
                if (!isNaN(port) && onServerReady) {
                  onServerReady(port);
                }
              }
            },
          })
        );

        const input = shellProcess.input.getWriter();
        const disposable = term.onData((data) => {
          input.write(data);
        });

        // Handle terminal resize for shell
        const handleResize = (evt: { cols: number; rows: number }) => {
          shellProcess.resize({
            cols: evt.cols,
            rows: evt.rows,
          });
        };
        term.onResize(handleResize);

        // Listen for external commands
        const handleCommand = async (e: CustomEvent) => {
          const { command } = e.detail;
          if (command) {
            term.writeln(`\r\n> ${command}`);
            input.write(command + '\r');
          }
        };
        window.addEventListener('bolt:run-command', handleCommand as unknown as EventListener);

        await shellProcess.exit;
        
        // Cleanup if process exits
        disposable.dispose();
        window.removeEventListener('bolt:run-command', handleCommand as unknown as EventListener);
        
      } catch (error) {
        console.error('Terminal shell error:', error);
        terminalRef.current?.writeln(`\r\n\x1b[31mError starting shell: ${error}\x1b[0m`);
        initializedRef.current = false;
      }
    };

    startShell();

    return () => {
      // No cleanup here to persist shell across tab switches if component unmounts
      // but in our implementation we use display:none so it shouldn't unmount often
    };
  }, [webContainer, isReady]);

  return (
    <div 
      className={`h-full w-full bg-[#1a1b26] overflow-hidden ${className}`}
      ref={containerRef}
    />
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
