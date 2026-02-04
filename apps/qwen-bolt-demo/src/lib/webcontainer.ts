import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = WebContainer.boot();
  
  try {
    webcontainerInstance = await bootPromise;
    return webcontainerInstance;
  } catch (error) {
    bootPromise = null;
    throw error;
  }
}

export function isWebContainerBooted() {
  return !!webcontainerInstance;
}
