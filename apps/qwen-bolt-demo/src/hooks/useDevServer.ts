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
      if (!webcontainer || Object.keys(files).length === 0) return;
      
      try {
        const tree = convertFilesToTree(files);
        await webcontainer.mount(tree);
        // Note: We don't log 'Files synced' every time to avoid cluttering the console in typical usage,
        // but it's useful for debugging.
      } catch (error) {
        console.error('[WebContainer] Failed to sync files:', error);
      }
    }
    
    syncFiles();
  }, [webcontainer, files]);

  const startDevServer = useCallback(async () => {
    if (!webcontainer || isStartingServer) return;

    setIsStartingServer(true);
    setServerError('');
    setDevServerLogs([]);
    setDevServerLogs(prev => [...prev, '[WebContainer] Initializing development environment...']);

    try {
      const projectRoot = findProjectRoot(files);
      setDevServerLogs(prev => [...prev, `[WebContainer] Project root detected: ${projectRoot}`]);
      
      const spawnOptions = { 
        cwd: projectRoot === '.' ? '/' : projectRoot,
        env: { CI: 'true' } // Disable progress bars to avoid log spam
      };

      // 1. Install dependencies (Optimized)
      // Check if package.json exists
      const packageJsonPath = Object.keys(files).find(f => 
        f === (projectRoot === '.' ? 'package.json' : `${projectRoot}/package.json`) || 
        f.endsWith(`/${projectRoot}/package.json`) // Handle potential leading slash variations
      );
      
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
            
            // Using 'npm install'
            const installProcess = await webcontainer.spawn('npm', ['install'], spawnOptions);
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
      devProcess.exit.then((code) => {
        if (code !== 0 && !previewUrl) {
           const dir = 'npm run dev exited';
           setServerError(dir);
           setDevServerLogs(prev => [...prev, `[WebContainer Error] ${dir} with code ${code}`]);
           setIsStartingServer(false);
        }
      });

    } catch (error: any) {
      console.error('[WebContainer] Error:', error);
      setServerError(error.message || 'Failed to start dev server');
      setDevServerLogs(prev => [...prev, `[Error] ${error.message}`]);
      setIsStartingServer(false);
    }
  }, [webcontainer, isStartingServer, files]);

  const refreshPreview = useCallback(() => {
    // In WebContainer, usually just reloading the iframe is enough, 
    // but we can't easily force-reload the iframe from here if it's cross-origin.
    // Changing the URL slightly might help.
    if (previewUrl) {
       // WebContainer URLs don't support query params the same way always, but usually safe.
       // setPreviewUrl(prev => ...); 
       // Actually simpler: re-set it to trigger iframe update
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
    refreshPreview,
    setDevServerLogs,
    isWebContainerLoading,
    webContainerError
  };
}
