import { query, type SDKResultMessage, type SDKResultMessageSuccess } from "@qwen-code/sdk";
import { app } from "electron";
import { join } from "path";
import { homedir } from "os";
import { getCurrentApiConfig } from "./claude-settings.js";

// Get Qwen Code CLI path for packaged app
export function getQwenCodePath(): string | undefined {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/@qwen-code/sdk/cli.mjs'
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

  return {
    ...filteredEnv,
    PATH: newPath,
  };
}

export const qwenCodePath = getQwenCodePath();
// Note: enhancedEnv should be obtained dynamically via getEnhancedEnv() to ensure latest config
export const enhancedEnv = getEnhancedEnv();

export const generateSessionTitle = async (userIntent: string | null): Promise<string> => {
  if (!userIntent) return "New Session";

  try {
    const q = query({
      prompt: `Please analyze the following user input and generate a short, clear title to identify this conversation theme:
${userIntent}

Directly output the title only, do not include any other content.`,
      options: {
        pathToQwenExecutable: qwenCodePath,
        env: getEnhancedEnv(), // Get latest env with API config
        authType: 'openai',  // Use OpenAI-compatible API authentication
        permissionMode: "yolo",
        maxSessionTurns: 1,
      }
    });

    for await (const message of q) {
      if (message.type === "result" && message.subtype === "success") {
        const successMsg = message as SDKResultMessageSuccess;
        return successMsg.result || "New Session";
      }
    }
  } catch {
    // Ignore errors and return default title
  }

  return "New Session";
};
