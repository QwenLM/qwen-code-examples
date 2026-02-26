'use client';

import { useEffect, useRef, memo, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from 'next-themes';
import { useWebContainer } from '../../hooks/useWebContainer';
import logger from '@/lib/logger';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  className?: string;
  readonly?: boolean;
  /** Only the primary terminal listens for bolt:run-command and emits bolt:shell-ready */
  isPrimary?: boolean;
}

const SHELL_PROMPT_CHARS = ['$', '>'];

const DARK_THEME = {
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
};

const LIGHT_THEME = {
  background: '#ffffff',
  foreground: '#383a42',
  cursor: '#526eff',
  selectionBackground: '#d7d4f0',
  black: '#383a42',
  red: '#e45649',
  green: '#50a14f',
  yellow: '#c18401',
  blue: '#4078f2',
  magenta: '#a626a4',
  cyan: '#0184bc',
  white: '#a0a1a7',
  brightBlack: '#4f525e',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
};

function getTerminalTheme(theme: string | undefined) {
  return theme === 'light' ? LIGHT_THEME : DARK_THEME;
}

const Terminal = memo(({ className = '', readonly = false, isPrimary = false }: TerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { webcontainer, isLoading, error: webContainerError } = useWebContainer();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const shellProcessRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Effective theme: use resolvedTheme after mount, default to dark before mount
  const effectiveTheme = mounted ? resolvedTheme : 'dark';

  // Update terminal theme when page theme changes
  useEffect(() => {
    if (!terminalRef.current || !mounted) return;
    terminalRef.current.options.theme = getTerminalTheme(effectiveTheme);
  }, [effectiveTheme, mounted]);

  // Initialize Terminal UI
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminalTheme = getTerminalTheme(effectiveTheme);

    // Create terminal instance
    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      disableStdin: readonly,
      theme: terminalTheme,
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

  // Show error if WebContainer boot failed
  useEffect(() => {
    if (!webContainerError || !terminalRef.current) return;
    const term = terminalRef.current;
    term.writeln('');
    term.writeln('\x1b[31mWebContainer failed to start:\x1b[0m');
    term.writeln(`\x1b[31m${webContainerError.message}\x1b[0m`);
    term.writeln('');
    term.writeln('\x1b[33mThis is usually caused by a network issue loading WebAssembly files.\x1b[0m');
    term.writeln('\x1b[33mPlease refresh the page to retry.\x1b[0m');
  }, [webContainerError]);

  // Connect to WebContainer Shell
  useEffect(() => {
    if (isLoading || !webcontainer || !terminalRef.current || initializedRef.current) return;

    const startShell = async () => {
      const maxRetries = 3;
      const retryDelayMs = 2000;

      try {
        initializedRef.current = true;
        const term = terminalRef.current!;
        const fitAddon = fitAddonRef.current;
        
        if (fitAddon) {
            fitAddon.fit();
        }

        term.writeln('\x1b[34mWebContainer connected. Starting jsh...\x1b[0m');

        let shellProcess: any = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            shellProcess = await webcontainer.spawn('jsh', {
              terminal: {
                cols: term.cols,
                rows: term.rows,
              },
            });
            break;
          } catch (spawnError: any) {
            if (attempt < maxRetries && spawnError?.message?.includes('MODULE_NOT_FOUND')) {
              term.writeln(`\x1b[33mjsh not ready, retrying (${attempt}/${maxRetries})...\x1b[0m`);
              await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            } else {
              throw spawnError;
            }
          }
        }

        if (!shellProcess) {
          term.writeln('\x1b[33mShell unavailable. Terminal is in read-only mode.\x1b[0m');
          return;
        }

        shellProcessRef.current = shellProcess;
        
        // Track whether shell prompt has appeared (shell is ready for input)
        let shellReady = false;
        
        // Pipe output directly to xterm, detect shell readiness
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data: string) {
              term.write(data);
              
              // Only the primary terminal emits shell-ready for auto-start
              if (isPrimary && !shellReady && SHELL_PROMPT_CHARS.some(ch => data.includes(ch))) {
                shellReady = true;
                logger.debug('[Terminal] Shell is ready, dispatching shell-ready event');
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

        // Only the primary terminal listens for external commands (auto-start)
        let handleCommand: ((e: CustomEvent) => void) | null = null;
        if (isPrimary) {
          handleCommand = async (e: CustomEvent) => {
            const { command } = e.detail;
            if (command) {
              input.write(command + '\r');
            }
          };
          window.addEventListener('bolt:run-command', handleCommand as unknown as EventListener);
        }

        await shellProcess.exit;
        
        disposable.dispose();
        if (handleCommand) {
          window.removeEventListener('bolt:run-command', handleCommand as unknown as EventListener);
        }
        
      } catch (error) {
        console.error('Terminal shell error:', error);
        terminalRef.current?.writeln(`\r\n\x1b[31mError starting shell: ${error}\x1b[0m`);
        initializedRef.current = false;
      }
    };

    startShell();

  }, [webcontainer, isLoading]);

  const containerBg = effectiveTheme === 'light' ? 'bg-white' : 'bg-[#1a1b26]';

  return (
    <div 
      className={`h-full w-full ${containerBg} overflow-hidden ${className}`}
      ref={containerRef}
    />
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
