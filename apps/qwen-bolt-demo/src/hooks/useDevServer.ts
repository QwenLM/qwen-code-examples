import { useState, useCallback, useRef, useEffect } from 'react';
import type { DevServer } from '@/components/workspace';
import { useWebContainer } from './useWebContainer';
import { convertFilesToTree, findProjectRoot } from '@/lib/file-utils';

export function useDevServer(sessionId: string, files: Record<string, string>) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [devServer, setDevServer] = useState<DevServer | null>(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [devServerLogs, setDevServerLogs] = useState<string[]>([]);
  
  const { webcontainer, isLoading: isWebContainerLoading, error: webContainerError } = useWebContainer();
  const installProcessRef = useRef<any>(null);
  const devProcessRef = useRef<any>(null);
  const lastInstalledPackageJsonRef = useRef<string>('');

  // Sync files to WebContainer whenever they change
  useEffect(() => {
    async function syncFiles() {
      if (!webcontainer || Object.keys(files).length === 0) {
          console.log('[DevServer] syncFiles skipped. WC ready:', !!webcontainer, 'FileCount:', Object.keys(files).length);
          return;
      }
      
      try {
        console.log('[DevServer] Syncing files to WebContainer. Count:', Object.keys(files).length);
        const tree = convertFilesToTree(files);
        await webcontainer.mount(tree);
        console.log('[DevServer] Files synced successfully.');
        // Note: We don't log 'Files synced' every time to avoid cluttering the console in typical usage,
        // but it's useful for debugging.
      } catch (error) {
        console.error('[WebContainer] Failed to sync files:', error);
      }
    }
    
    syncFiles();
  }, [webcontainer, files]);

  const startDevServer = useCallback(async () => {
    console.log('[DevServer Debug] startDevServer called. WC ready:', !!webcontainer, 'isStarting:', isStartingServer);
    
    if (isWebContainerLoading) {
        setDevServerLogs(prev => [...prev, '[Info] WebContainer is still initializing... please wait.']);
        console.log('[DevServer Debug] Waiting for WebContainer to initialize...');
        return;
    }

    if (webContainerError) {
        setDevServerLogs(prev => [...prev, `[Error] WebContainer failed to start: ${webContainerError.message}`]);
        console.error('[DevServer Debug] WebContainer boot error:', webContainerError);
        return;
    }
    
    // If we are not loading and have no error, but webcontainer is still null, it's a critical state.
    if (!webcontainer) {
        setDevServerLogs(prev => [...prev, '[Error] WebContainer environment is not available. Check browser compatibility (Cross-Origin Isolation).']);
        console.error('[DevServer Debug] Aborting start: WebContainer is null but not loading/erroring.');
        return;
    }

    if (isStartingServer) {
        console.log('[DevServer Debug] Aborting start: Already starting.');
        return;
    }

    setIsStartingServer(true);
    setServerError('');
    setDevServerLogs([]);
    setDevServerLogs(prev => [...prev, '[WebContainer] Initializing development environment...']);

    try {
      const projectRoot = findProjectRoot(files);
      console.log(`[DevServer Debug] Project root detected: ${projectRoot}`);
      setDevServerLogs(prev => [...prev, `[WebContainer] Project root detected: ${projectRoot}`]);
      
      // force jsh to avoid 'Cannot find module /bin/zsh' errors if npm tries to auto-detect shell from env
      const spawnOptions = { 
        cwd: projectRoot === '.' ? '/' : projectRoot,
        env: { 
            CI: 'true'
        }
      };

      // 1. Install dependencies (Optimized)
      // Check if package.json exists
      const packageJsonPath = Object.keys(files).find(f => 
        f === (projectRoot === '.' ? 'package.json' : `${projectRoot}/package.json`) || 
        f.endsWith(`/${projectRoot}/package.json`) // Handle potential leading slash variations
      );
      
      console.log(`[DevServer Debug] Package.json search. Root: ${projectRoot}, Found Path: ${packageJsonPath}`);

      const packageJsonContent = packageJsonPath ? files[packageJsonPath] : null;
      let startCommand = 'dev'; // default

      if (packageJsonContent) {
         try {
            const pkg = JSON.parse(packageJsonContent);
            // Check available scripts
            if (!pkg.scripts?.dev && pkg.scripts?.start) {
                startCommand = 'start';
            }
         } catch (e) {
             console.warn('Failed to parse package.json for script detection');
         }

         if (packageJsonContent !== lastInstalledPackageJsonRef.current) {
            setDevServerLogs(prev => [...prev, '[WebContainer] Installing dependencies... (This may take a few minutes for the first run)']);
            
            // Using 'npm install' with optimizations
            const installProcess = await webcontainer.spawn('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline', '--no-optional'], spawnOptions);
            installProcessRef.current = installProcess;
            
            // Stream output
            installProcess.output.pipeTo(new WritableStream({
              write(data) {
                setDevServerLogs(prev => [...prev, data]);
              }
            }));
            
            const installExitCode = await installProcess.exit;
            if (installExitCode !== 0) {
              throw new Error(`npm install failed with code ${installExitCode}. See logs for details.`);
            }
            
            setDevServerLogs(prev => [...prev, '[WebContainer] Dependencies installed successfully.']);
            lastInstalledPackageJsonRef.current = packageJsonContent;
         } else {
             setDevServerLogs(prev => [...prev, '[WebContainer] Dependencies unchanged, skipping install.']);
         }
      } else {
         setDevServerLogs(prev => [...prev, '[WebContainer] No package.json found, skipping install.']);
      }

      // 2. Start Dev Server
      setDevServerLogs(prev => [...prev, `[WebContainer] Starting dev server (npm run ${startCommand})...`]);
      console.log(`[DevServer] Spawning npm run ${startCommand}`);
      
      const devProcess = await webcontainer.spawn('npm', ['run', startCommand], spawnOptions);
      devProcessRef.current = devProcess;
      
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          setDevServerLogs(prev => [...prev, data]);
        }
      }));

      // Listen for server-ready event
      webcontainer.on('server-ready', (port, url) => {
        console.log('[WebContainer] Server ready:', port, url);
        setDevServerLogs(prev => [...prev, `[WebContainer] Server ready on ${url}`]);
        setPreviewUrl(url);
        setDevServer({
          port,
          framework: 'WebContainer',
          url
        });
        setIsStartingServer(false);
      });

      // Handle exit
      devProcess.exit.then((code: number) => {
        // If we killed it manually (isStartingServer might be false or devServer might be null), ignore error
        // But here we check code
        if (code !== 0 && !previewUrl && isStartingServer) {  // Only report error if we were EXPECTING it to start
           const dir = 'npm run dev exited';
           setServerError(dir);
           setDevServerLogs(prev => [...prev, `[WebContainer Error] ${dir} with code ${code}`]);
           setIsStartingServer(false);
        } else if (code === 0 || code === 143 || code === 137) { // 143/137 are typical kill signals
            setDevServerLogs(prev => [...prev, '[WebContainer] Server stopped.']);
        }
      });

    } catch (error: any) {
      console.error('[WebContainer] Error:', error);
      setServerError(error.message || 'Failed to start dev server');
      setDevServerLogs(prev => [...prev, `[Error] ${error.message}`]);
      setIsStartingServer(false);
    }
  }, [webcontainer, isStartingServer, files, previewUrl]);

  const stopDevServer = useCallback(() => {
    if (devProcessRef.current) {
      try {
        devProcessRef.current.kill();
      } catch (e) {
        console.error('Failed to kill dev process', e);
      }
      devProcessRef.current = null;
    }
    setDevServer(null);
    setPreviewUrl('');
    setIsStartingServer(false);
  }, []);

  const restartDevServer = useCallback(async () => {
    stopDevServer();
    // Use setTimeout to ensure state clears before restarting
    setTimeout(() => {
        startDevServer();
    }, 100);
  }, [stopDevServer, startDevServer]);

  const refreshPreview = useCallback(() => {
    // In WebContainer, usually just reloading the iframe is enough, 
    // but we can't easily force-reload the iframe from here if it's cross-origin.
    // Changing the URL slightly might help.
    if (previewUrl) {
       // WebContainer URLs don't support query params the same way always, but usually safe.
       // setPreviewUrl(prev => prev); // Trigger re-render?
       // Actually the PreviewPanel handles iframe reload if we expose a ref or method.
       // For now, let's just re-set the URL to trigger effect potentially?
       const current = previewUrl;
       setPreviewUrl(''); 
       setTimeout(() => setPreviewUrl(current), 10);
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
