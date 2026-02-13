'use client';

import { useEffect, useRef, memo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWebContainer } from '../../hooks/useWebContainer';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  className?: string;
  readonly?: boolean;
}

const SHELL_PROMPT_CHARS = ['$', '>'];

const Terminal = memo(({ className = '', readonly = false }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { webcontainer, isLoading } = useWebContainer();
  const shellProcessRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Initialize Terminal UI
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
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial greeting
    term.writeln('\x1b[32mTarget environment ready.\x1b[0m');
    term.writeln('Waiting for WebContainer...');

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!fitAddonRef.current || !terminalRef.current) return;
        
        try {
          fitAddonRef.current.fit();
          
          if (shellProcessRef.current) {
            const { cols, rows } = terminalRef.current;
            shellProcessRef.current.resize({ cols, rows });
          }
        } catch (e) {
          console.error('Resize error:', e);
        }
      });
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [readonly]);

  // Connect to WebContainer Shell
  useEffect(() => {
    if (isLoading || !webcontainer || !terminalRef.current || initializedRef.current) return;

    const startShell = async () => {
      try {
        initializedRef.current = true;
        const term = terminalRef.current!;
        const fitAddon = fitAddonRef.current;
        
        if (fitAddon) {
            fitAddon.fit();
        }

        term.writeln('\x1b[34mWebContainer connected. Starting jsh...\x1b[0m');

        const shellProcess = await webcontainer.spawn('jsh', {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
        });

        shellProcessRef.current = shellProcess;
        
        // Track whether shell prompt has appeared (shell is ready for input)
        let shellReady = false;
        
        // Pipe output directly to xterm, detect shell readiness
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data: string) {
              term.write(data);
              
              // Detect shell prompt: jsh shows prompt chars when ready
              if (!shellReady && SHELL_PROMPT_CHARS.some(ch => data.includes(ch))) {
                shellReady = true;
                console.log('[Terminal] Shell is ready, dispatching shell-ready event');
                window.dispatchEvent(new CustomEvent('bolt:shell-ready'));
              }
            },
          })
        );

        // Pipe input from xterm to shell
        const input = shellProcess.input.getWriter();
        const disposable = term.onData((data: string) => {
          input.write(data);
        });

        // External commands listener
        const handleCommand = async (e: CustomEvent) => {
          const { command } = e.detail;
          if (command) {
            input.write(command + '\r');
          }
        };
        window.addEventListener('bolt:run-command', handleCommand as unknown as EventListener);

        await shellProcess.exit;
        
        disposable.dispose();
        window.removeEventListener('bolt:run-command', handleCommand as unknown as EventListener);
        
      } catch (error) {
        console.error('Terminal shell error:', error);
        terminalRef.current?.writeln(`\r\n\x1b[31mError starting shell: ${error}\x1b[0m`);
        initializedRef.current = false;
      }
    };

    startShell();

  }, [webcontainer, isLoading]);

  return (
    <div 
      className={`h-full w-full bg-[#1a1b26] overflow-hidden ${className}`}
      ref={containerRef}
    />
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
