import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { DevServer } from '@/components/workspace';
import { useWebContainer } from './useWebContainer';
import { convertFilesToTree, findProjectRoot } from '@/lib/file-utils';
import logger from '@/lib/logger';

export type ProjectType = 'node' | 'static-html' | 'empty';

// .npmrc content optimized for fast npm install in WebContainer
const NPMRC_CONTENT = `registry=https://registry.npmmirror.com
fetch-retries=3
fetch-retry-mintimeout=5000
fetch-retry-maxtimeout=30000
prefer-offline=true
audit=false
fund=false
loglevel=error
update-notifier=false
`;

export function useDevServer(sessionId: string, files: Record<string, string>, isChatLoading: boolean = false) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [devServer, setDevServer] = useState<DevServer | null>(null);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [devServerLogs, setDevServerLogs] = useState<string[]>([]);
  
  const { webcontainer, isLoading: isWebContainerLoading, error: webContainerError } = useWebContainer();
  const npmrcWrittenRef = useRef(false);
  const lastMountedFilesCountRef = useRef(0);
  const staticBlobUrlRef = useRef<string | null>(null);

  // Detect project type based on files
  const projectType: ProjectType = useMemo(() => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) return 'empty';
    
    const hasPackageJson = fileKeys.some(f => {
      const cleanPath = f.startsWith('/') ? f.substring(1) : f;
      return cleanPath.endsWith('package.json');
    });
    
    if (hasPackageJson) return 'node';
    
    const hasHtmlFile = fileKeys.some(f => {
      const cleanPath = f.startsWith('/') ? f.substring(1) : f;
      return cleanPath.endsWith('.html');
    });
    
    if (hasHtmlFile) return 'static-html';
    
    return 'empty';
  }, [files]);

  // Static HTML preview: generate Blob URL from HTML content
  useEffect(() => {
    if (projectType !== 'static-html') {
      // Clean up old blob URL if project type changed
      if (staticBlobUrlRef.current) {
        URL.revokeObjectURL(staticBlobUrlRef.current);
        staticBlobUrlRef.current = null;
      }
      return;
    }

    // Don't preview while AI is still generating
    if (isChatLoading) return;

    const fileKeys = Object.keys(files);
    
    // Find the best HTML entry file: index.html > first .html file
    const findHtmlEntry = (): string | null => {
      const cleanPaths = fileKeys.map(f => ({
        original: f,
        clean: f.startsWith('/') ? f.substring(1) : f,
      }));
      
      // Prefer index.html at any level (root first)
      const indexHtml = cleanPaths
        .filter(p => p.clean.endsWith('index.html'))
        .sort((a, b) => a.clean.split('/').length - b.clean.split('/').length)[0];
      
      if (indexHtml) return indexHtml.original;
      
      // Fallback to first .html file (prefer shorter paths)
      const anyHtml = cleanPaths
        .filter(p => p.clean.endsWith('.html'))
        .sort((a, b) => a.clean.split('/').length - b.clean.split('/').length)[0];
      
      return anyHtml?.original || null;
    };

    const entryFile = findHtmlEntry();
    if (!entryFile || !files[entryFile]) return;

    let htmlContent = files[entryFile];

    // Inline CSS/JS references if they exist in the project files
    // Handle <link rel="stylesheet" href="..."> and <script src="...">
    htmlContent = htmlContent.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, href) => {
        const cssPath = resolveRelativePath(entryFile, href);
        const cssContent = files[cssPath];
        if (cssContent) {
          return `<style>\n${cssContent}\n</style>`;
        }
        return match;
      }
    );

    htmlContent = htmlContent.replace(
      /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src) => {
        const jsPath = resolveRelativePath(entryFile, src);
        const jsContent = files[jsPath];
        if (jsContent) {
          return `<script>\n${jsContent}\n</script>`;
        }
        return match;
      }
    );

    // Revoke old blob URL
    if (staticBlobUrlRef.current) {
      URL.revokeObjectURL(staticBlobUrlRef.current);
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    staticBlobUrlRef.current = blobUrl;

    setPreviewUrl(blobUrl);
    setDevServer({
      port: 0,
      framework: 'Static HTML',
      url: blobUrl,
    });
    setDevServerLogs(prev => [...prev, `[System] Static HTML preview: ${entryFile}`]);

    return () => {
      // Cleanup is handled on next run or unmount
    };
  }, [projectType, files, isChatLoading]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (staticBlobUrlRef.current) {
        URL.revokeObjectURL(staticBlobUrlRef.current);
        staticBlobUrlRef.current = null;
      }
    };
  }, []);

  // Mount/sync files to WebContainer FS when files change
  // webcontainer.mount() is additive/merge, so calling it multiple times is safe
  useEffect(() => {
    async function mountFiles() {
      const fileCount = Object.keys(files).length;
      if (!webcontainer || fileCount === 0) return;

      // Only re-mount when file count actually changed (new files arrived)
      if (fileCount === lastMountedFilesCountRef.current) return;

      try {
        logger.debug('[DevServer] Mounting files to WebContainer FS:', fileCount, '(was:', lastMountedFilesCountRef.current, ')');
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
        logger.debug('[DevServer] .npmrc and .env written to WebContainer');
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
      logger.debug('[DevServer] Server Ready:', url);
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
        logger.debug('[DevServer] Pre-start mount: syncing', fileCount, 'files to WebContainer FS');
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
          // Lock files are already filtered out during file mounting (see file-utils.ts).
          // Use --prefer-offline to leverage WebContainer's internal cache when available,
          // and skip audit/fund/progress for faster install.
          const command = `${cdCommand}npm install --prefer-offline --no-audit --no-fund && ${devScript}`;
          
          let dispatched = false;
          const dispatchCommand = () => {
            if (dispatched) return;
            dispatched = true;
            logger.debug('[DevServer] Dispatching command:', command);
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

  // Auto-start: when WebContainer is ready AND files with package.json are available AND chat is not loading
  // Wait for AI to finish generating before starting npm install to avoid resource contention
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    if (!webcontainer || isWebContainerLoading) return;
    if (Object.keys(files).length === 0) return;
    if (isStartingServer) return;
    if (isChatLoading) return;

    // Find package.json to confirm this is a runnable project
    const hasPackageJson = Object.keys(files).some(f => {
      const cleanPath = f.startsWith('/') ? f.substring(1) : f;
      return cleanPath.endsWith('package.json');
    });

    if (!hasPackageJson) return;

        logger.debug('[DevServer] Auto-start: WebContainer ready + files available + chat idle, starting dev server...');
    hasAutoStartedRef.current = true;
    startDevServer();
  }, [webcontainer, isWebContainerLoading, files, isStartingServer, startDevServer, isChatLoading]);

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
    webContainerError,
    projectType
  };
}

/** Resolve a relative path (like "./style.css" or "js/app.js") against an entry file path */
function resolveRelativePath(entryFile: string, relativePath: string): string {
  const cleanEntry = entryFile.startsWith('/') ? entryFile.substring(1) : entryFile;
  const entryDir = cleanEntry.includes('/') ? cleanEntry.substring(0, cleanEntry.lastIndexOf('/')) : '';
  
  let resolved = relativePath;
  // Remove leading ./
  if (resolved.startsWith('./')) {
    resolved = resolved.substring(2);
  }
  
  return entryDir ? `${entryDir}/${resolved}` : resolved;
}
