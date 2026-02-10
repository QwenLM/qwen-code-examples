import { WebContainer } from '@webcontainer/api';

// Use globalThis to persist instance across HMR in development
const globalContext = globalThis as unknown as {
  _webcontainerInstance: WebContainer | null;
  _webcontainerBootPromise: Promise<WebContainer> | null;
};

export async function getWebContainer(): Promise<WebContainer> {
  if (globalContext._webcontainerInstance) {
    return globalContext._webcontainerInstance;
  }

  if (globalContext._webcontainerBootPromise) {
    return globalContext._webcontainerBootPromise;
  }

  // Add COOP/COEP check
  if (typeof window !== 'undefined' && window.crossOriginIsolated === false) {
    console.warn('[WebContainer] App is not cross-origin isolated. WebContainer will not boot.');
    // Ideally throw error, but let's try to boot anyway so error is caught in logs
  }

  console.log('[WebContainer] Booting...');
  globalContext._webcontainerBootPromise = WebContainer.boot();
  
  try {
    globalContext._webcontainerInstance = await globalContext._webcontainerBootPromise;
    console.log('[WebContainer] Booted successfully.');
    return globalContext._webcontainerInstance;
  } catch (error) {
    console.error('[WebContainer] Boot failed:', error);
    globalContext._webcontainerBootPromise = null;
    throw error;
  }
}

export function isWebContainerBooted() {
  return !!globalContext._webcontainerInstance;
}
