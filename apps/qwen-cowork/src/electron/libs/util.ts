import { query, type SDKResultMessage, type SDKResultMessageSuccess } from "@qwen-code/sdk";
import { app } from "electron";
import { join } from "path";
import { homedir } from "os";
import { getCurrentApiConfig } from "./claude-settings.js";
import { isDev } from "../util.js";

// Get Qwen Code CLI path for packaged app
export function getQwenCodePath(): string | undefined {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/@qwen-code/sdk/dist/cli/cli.js'
    );
  }
  return undefined;
}

// Build enhanced PATH for packaged environment
export function getEnhancedEnv(): Record<string, string> {
  const home = homedir();
  const additionalPaths = [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${home}/.bun/bin`,
    `${home}/.nvm/versions/node/v20.0.0/bin`,
    `${home}/.nvm/versions/node/v22.0.0/bin`,
    `${home}/.nvm/versions/node/v18.0.0/bin`,
    `${home}/.volta/bin`,
    `${home}/.fnm/aliases/default/bin`,
    '/usr/bin',
    '/bin',
  ];

  const currentPath = process.env.PATH || '';
  const newPath = [...additionalPaths, currentPath].join(':');

  // Filter out undefined values for type compatibility
  const filteredEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      filteredEnv[key] = value;
    }
  }

  // Add API configuration from getCurrentApiConfig
  const apiConfig = getCurrentApiConfig();
  if (apiConfig) {
    filteredEnv.QWEN_API_KEY = apiConfig.apiKey;
    filteredEnv.QWEN_BASE_URL = apiConfig.baseURL;
    filteredEnv.QWEN_MODEL = apiConfig.model;
    
    // For OpenAI-compatible auth, also set OPENAI_API_KEY
    filteredEnv.OPENAI_API_KEY = apiConfig.apiKey;
    filteredEnv.OPENAI_BASE_URL = apiConfig.baseURL;
    filteredEnv.OPENAI_MODEL = apiConfig.model;
  } else {
    console.warn('[getEnhancedEnv] No API config found, Qwen SDK may fail');
  }

  // ELECTRON_RUN_AS_NODE=1 prevents multiple Dock icons on macOS by running Electron as Node.js
  if (process.platform === 'darwin') {
    const script = join(app.getAppPath(), isDev() ? './src/electron/libs/hide-dock.js' : '../dist-electron/libs/hide-dock.js');
    filteredEnv.NODE_OPTIONS = `${filteredEnv.NODE_OPTIONS || ''} --require "${script}"`.trim();
  }

  return {
    ...filteredEnv,
    ELECTRON_RUN_AS_NODE: '1',
    PATH: newPath,
  };
}

export const qwenCodePath = getQwenCodePath();
// Note: enhancedEnv should be obtained dynamically via getEnhancedEnv() to ensure latest config
export const enhancedEnv = getEnhancedEnv();

export const generateSessionTitle = async (userIntent: string | null): Promise<string> => {
  if (!userIntent) return "New Session";

  // In packaged app, skip title generation to avoid blocking - use simple fallback
  if (app.isPackaged) {
    const words = userIntent.trim().split(/\s+/).slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words || "New Session";
  }

  try {
    const timeoutMs = 10000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    
    const q = query({
      prompt: `Please analyze the following user input and generate a short, clear title to identify this conversation theme:
${userIntent}

Directly output the title only, do not include any other content.`,
      options: {
        pathToQwenExecutable: qwenCodePath,
        env: getEnhancedEnv(),
        authType: 'openai',
        permissionMode: "yolo",
        maxSessionTurns: 1,
        abortController,
      }
    });

    for await (const message of q) {
      if (message.type === "result" && message.subtype === "success") {
        clearTimeout(timeoutId);
        const successMsg = message as SDKResultMessageSuccess;
        return successMsg.result || "New Session";
      }
    }
    clearTimeout(timeoutId);
  } catch {
    // Ignore errors and return default title
  }

  return "New Session";
};
