import { useState, useCallback, useRef, useEffect } from 'react';
import type { DevServer } from '@/components/workspace';
import { useWebContainer } from './useWebContainer';
import { convertFilesToTree, findProjectRoot } from '@/lib/file-utils';

// .npmrc content for faster npm install using China mirror
const NPMRC_CONTENT = `registry=https://registry.npmmirror.com
fetch-retries=3
fetch-retry-mintimeout=5000
fetch-retry-maxtimeout=30000
`;

export function useDevServer(sessionId: string, files: Record<string, string>) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [devServer, setDevServer] = useState<DevServer | null>(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [devServerLogs, setDevServerLogs] = useState<string[]>([]);
  
  const { webcontainer, isLoading: isWebContainerLoading, error: webContainerError } = useWebContainer();
  const npmrcWrittenRef = useRef(false);
  const lastMountedFilesCountRef = useRef(0);

  // Mount/sync files to WebContainer FS when files change
  // webcontainer.mount() is additive/merge, so calling it multiple times is safe
  useEffect(() => {
    async function mountFiles() {
      const fileCount = Object.keys(files).length;
      if (!webcontainer || fileCount === 0) return;

      // Only re-mount when file count actually changed (new files arrived)
      if (fileCount === lastMountedFilesCountRef.current) return;

      try {
        console.log('[DevServer] Mounting files to WebContainer FS:', fileCount, '(was:', lastMountedFilesCountRef.current, ')');
        const tree = convertFilesToTree(files);
        await webcontainer.mount(tree);
        lastMountedFilesCountRef.current = fileCount;
        setDevServerLogs(prev => [...prev, `[System] File system synced (${fileCount} files).`]);
      } catch (error) {
        console.error('[DevServer] Failed to mount files:', error);
      }
    }

    mountFiles();
  }, [webcontainer, files]);

  // Reset state when WebContainer changes
  useEffect(() => {
    if (!webcontainer) {
      npmrcWrittenRef.current = false;
      lastMountedFilesCountRef.current = 0;
    }
  }, [webcontainer]);

  // Write .npmrc and .env to WebContainer for faster npm install and proper host binding
  useEffect(() => {
    async function writeConfigFiles() {
      if (!webcontainer || npmrcWrittenRef.current) return;
      
      try {
        // Write .npmrc for faster installs
        await webcontainer.fs.writeFile('.npmrc', NPMRC_CONTENT);
        
        // Write .env with HOST=0.0.0.0 so frameworks (Vite, Next.js, etc.) bind correctly
        // This ensures preview works regardless of how the user starts the dev server
        await webcontainer.fs.writeFile('.env', 'HOST=0.0.0.0\n');
        
        npmrcWrittenRef.current = true;
        console.log('[DevServer] .npmrc and .env written to WebContainer');
        setDevServerLogs(prev => [...prev, '[System] npm mirror and host binding configured.']);
      } catch (error) {
        console.warn('[DevServer] Failed to write config files:', error);
      }
    }
    
    writeConfigFiles();
  }, [webcontainer]);

  // Listen for server-ready events from WebContainer
  useEffect(() => {
    if (!webcontainer) return;

    const handleServerReady = (port: number, url: string) => {
      console.log('[DevServer] Server Ready:', url);
      setPreviewUrl(url);
      setDevServer({
        port,
        framework: 'WebContainer',
        url
      });
      setIsStartingServer(false);
      setDevServerLogs(prev => [...prev, `[System] Server ready at ${url}`]);
    };

    webcontainer.on('server-ready', handleServerReady);
  }, [webcontainer]);

  const hasAutoStartedRef = useRef(false);

  const startDevServer = useCallback(async () => {
    if (!webcontainer || isStartingServer) return;

    setIsStartingServer(true);
    setServerError('');
    setDevServerLogs(prev => [...prev, '[System] Initiating development environment...']);

    // Ensure all current files are mounted before starting
    try {
      const fileCount = Object.keys(files).length;
      if (fileCount > 0) {
        console.log('[DevServer] Pre-start mount: syncing', fileCount, 'files to WebContainer FS');
        const tree = convertFilesToTree(files);
        await webcontainer.mount(tree);
        lastMountedFilesCountRef.current = fileCount;
      }
    } catch (mountError) {
      console.error('[DevServer] Pre-start mount failed:', mountError);
    }

    try {
      const projectRoot = findProjectRoot(files);
      const rootPath = projectRoot === '.' ? '' : projectRoot;
      const cdCommand = rootPath ? `cd ${rootPath} && ` : '';

      // Find package.json to determine dev script
      const packageJsonPath = Object.keys(files).find(f => {
        const cleanPath = f.startsWith('/') ? f.substring(1) : f;
        return cleanPath === (projectRoot === '.' ? 'package.json' : `${projectRoot}/package.json`);
      });

      if (packageJsonPath) {
          const content = files[packageJsonPath];
          let devScript = 'npm run dev';
          try {
              const pkg = JSON.parse(content);
              if (!pkg.scripts?.dev && pkg.scripts?.start) {
                  devScript = 'npm start';
              }
          } catch (parseError) {
              console.warn('[DevServer] Failed to parse package.json:', parseError);
          }

          // Dispatch install + dev command to the terminal shell
          // HOST=0.0.0.0 is already configured via .env file written at boot time,
          // so the user can also manually run these commands and preview will still work
          const command = `${cdCommand}npm install && ${devScript}`;
          
          let dispatched = false;
          const dispatchCommand = () => {
            if (dispatched) return;
            dispatched = true;
            console.log('[DevServer] Dispatching command:', command);
            window.dispatchEvent(new CustomEvent('bolt:run-command', { 
              detail: { command } 
            }));
          };

          // Wait for shell to be ready before sending command
          const shellReadyHandler = () => {
            window.removeEventListener('bolt:shell-ready', shellReadyHandler);
            // Brief delay to let the prompt fully render
            setTimeout(dispatchCommand, 150);
          };

          window.addEventListener('bolt:shell-ready', shellReadyHandler);
          
          // Fallback: if shell-ready was already fired before we started listening
          setTimeout(() => {
            window.removeEventListener('bolt:shell-ready', shellReadyHandler);
            dispatchCommand();
          }, 2000);

      } else {
          setServerError('No package.json found');
          setDevServerLogs(prev => [...prev, '[Error] No package.json found.']);
          setIsStartingServer(false);
      }

    } catch (error: any) {
      console.error('[DevServer] Error:', error);
      setServerError(error.message);
      setIsStartingServer(false);
    }
  }, [webcontainer, isStartingServer, files]);

  // Auto-start: when WebContainer is ready AND files with package.json are available
  // This covers both new generation (files arrive after AI finishes) and history restore
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    if (!webcontainer || isWebContainerLoading) return;
    if (Object.keys(files).length === 0) return;
    if (isStartingServer) return;

    // Find package.json to confirm this is a runnable project
    const hasPackageJson = Object.keys(files).some(f => {
      const cleanPath = f.startsWith('/') ? f.substring(1) : f;
      return cleanPath.endsWith('package.json');
    });

    if (!hasPackageJson) return;

    console.log('[DevServer] Auto-start: WebContainer ready + files available, starting dev server...');
    hasAutoStartedRef.current = true;
    startDevServer();
  }, [webcontainer, isWebContainerLoading, files, isStartingServer, startDevServer]);

  const stopDevServer = useCallback(() => {
    if (webcontainer) {
        webcontainer.spawn('killall', ['node']);
        setDevServerLogs(prev => [...prev, '[System] Server process terminated.']);
        setPreviewUrl('');
        setDevServer(null);
        setIsStartingServer(false);
    }
  }, [webcontainer]);

  const restartDevServer = useCallback(() => {
     stopDevServer();
     setTimeout(() => startDevServer(), 1000);
  }, [stopDevServer, startDevServer]);

  const refreshPreview = useCallback(() => {
     if (previewUrl) {
       const current = previewUrl;
       setPreviewUrl('');
       setTimeout(() => setPreviewUrl(current), 50);
     }
  }, [previewUrl]);

  return {
    previewUrl,
    setPreviewUrl,
    devServer,
    setDevServer,
    isStartingServer,
    serverError,
    devServerLogs,
    startDevServer,
    stopDevServer,
    restartDevServer,
    refreshPreview,
    isWebContainerLoading,
    webContainerError
  };
}
