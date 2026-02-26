import { WebContainer } from '@webcontainer/api';
import logger from '@/lib/logger';

// Boot timeout in milliseconds (2 minutes)
const BOOT_TIMEOUT_MS = 120_000;

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
    console.warn('[WebContainer] App is not cross-origin isolated. WebContainer may not boot.');
  }

  logger.debug('[WebContainer] Booting...');

  // Use a cancellable timeout to avoid unhandled rejection when boot succeeds after timeout fires
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  globalContext._webcontainerBootPromise = new Promise<WebContainer>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutId = null;
      reject(new Error(
        `WebContainer boot timed out after ${BOOT_TIMEOUT_MS / 1000}s. ` +
        'This is usually caused by slow network or WebAssembly compilation issues. ' +
        'Please refresh the page to retry.'
      ));
    }, BOOT_TIMEOUT_MS);

    WebContainer.boot({ workdirName: 'project' }).then(
      (instance) => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
          resolve(instance);
        }
        // If timeout already fired, boot result is discarded
      },
      (error) => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        reject(error);
      }
    );
  });

  try {
    globalContext._webcontainerInstance = await globalContext._webcontainerBootPromise;
    logger.debug('[WebContainer] Booted successfully.');
    return globalContext._webcontainerInstance;
  } catch (error) {
    console.warn('[WebContainer] Boot failed:', error);
    globalContext._webcontainerBootPromise = null;
    throw error;
  }
}

export function isWebContainerBooted() {
  return !!globalContext._webcontainerInstance;
}
