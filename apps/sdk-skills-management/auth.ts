/**
 * Qwen Code SDK Chimp - Authentication Configuration Module
 * Automatically detects and configures OpenAI or Qwen authentication, completely transparent to users
 */

import type { AuthConfig, OpenAIAuthConfig, QwenAuthConfig } from './types';

// Environment variable name mapping
const ENV_VARS = {
  openai: {
    apiKey: ['OPENAI_API_KEY', 'OPENAI_KEY'],
    baseUrl: 'OPENAI_BASE_URL',
    model: 'OPENAI_MODEL',
    orgId: 'OPENAI_ORG_ID',
    project: 'OPENAI_PROJECT',
  },
  qwen: {
    apiKey: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY', 'DASHSCOPE_APIKEY'],
    baseUrl: 'QWEN_BASE_URL',
    model: 'QWEN_MODEL',
    workspaceId: 'QWEN_WORKSPACE_ID',
    appName: 'QWEN_APP_NAME',
    enableSearch: 'QWEN_ENABLE_SEARCH',
  },
} as const;

/** Default models */
const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  qwen: 'qwen-plus',
} as const;

/** Default API Base URLs */
const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
} as const;

/**
 * Get environment variable value (supports multiple possible keys)
 */
function getEnvValue(keys: string | readonly string[]): string | undefined {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  for (const key of keyArray) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

/**
 * Detect available authentication type
 */
function detectAuthType(): 'openai' | 'qwen' | null {
  for (const key of ENV_VARS.openai.apiKey) {
    if (process.env[key]) return 'openai';
  }
  for (const key of ENV_VARS.qwen.apiKey) {
    if (process.env[key]) return 'qwen';
  }
  return null;
}

/**
 * Create OpenAI configuration
 */
function createOpenAIConfig(): OpenAIAuthConfig {
  const apiKey = getEnvValue(ENV_VARS.openai.apiKey);
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API Key. Please set OPENAI_API_KEY environment variable');
  }

  return {
    type: 'openai',
    apiKey,
    baseUrl: process.env[ENV_VARS.openai.baseUrl] || DEFAULT_BASE_URLS.openai,
    model: process.env[ENV_VARS.openai.model] || DEFAULT_MODELS.openai,
    organizationId: process.env[ENV_VARS.openai.orgId],
    projectName: process.env[ENV_VARS.openai.project],
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  };
}

/**
 * Create Qwen configuration
 */
function createQwenConfig(): QwenAuthConfig {
  const apiKey = getEnvValue(ENV_VARS.qwen.apiKey);
  
  if (!apiKey) {
    throw new Error('Missing Qwen API Key. Please set QWEN_API_KEY or DASHSCOPE_API_KEY environment variable');
  }

  return {
    type: 'qwen',
    apiKey,
    baseUrl: process.env[ENV_VARS.qwen.baseUrl] || DEFAULT_BASE_URLS.qwen,
    model: process.env[ENV_VARS.qwen.model] || DEFAULT_MODELS.qwen,
    organizationId: process.env[ENV_VARS.qwen.workspaceId],
    projectName: process.env[ENV_VARS.qwen.appName],
    timeout: parseInt(process.env.TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    enableSearch: process.env[ENV_VARS.qwen.enableSearch] === 'true',
    resultFormat: 'message',
  };
}

/**
 * Automatically create authentication configuration
 */
export function createAuthConfig(): AuthConfig {
  const authType = detectAuthType();
  
  if (!authType) {
    throw new Error(
      'No API Key detected. Please set one of the following environment variables:\n\n' +
      'OpenAI: OPENAI_API_KEY=sk-...\n' +
      'Qwen: QWEN_API_KEY=sk-... or DASHSCOPE_API_KEY=sk-...'
    );
  }

  return authType === 'openai' ? createOpenAIConfig() : createQwenConfig();
}

/**
 * Get SDK environment variable configuration
 * Returns environment variables to pass to SDK options.env
 */
export function getSDKEnv(config: AuthConfig): Record<string, string> {
  const env: Record<string, string> = {};
  
  // Regardless of which service is used, pass environment variables in OpenAI format
  // Because SDK internally uses OpenAI-compatible interface
  env.OPENAI_API_KEY = config.apiKey;
  
  if (config.baseUrl) {
    env.OPENAI_BASE_URL = config.baseUrl;
  }
  
  if (config.model) {
    env.OPENAI_MODEL = config.model;
  }
  
  // Preserve original variables
  if (config.type === 'qwen') {
    env.QWEN_API_KEY = config.apiKey;
    if (config.baseUrl) {
      env.QWEN_BASE_URL = config.baseUrl;
    }
  }
  
  return env;
}

/**
 * Get SDK authType configuration
 */
export function getSDKAuthType(config: AuthConfig): 'openai' | 'qwen-oauth' {
  // SDK uses 'openai' format to handle Qwen's compatible interface
  // Only use 'qwen-oauth' when using Qwen OAuth
  return 'openai';
}

/**
 * Get configuration information (for display)
 */
export function getConfigInfo(config: AuthConfig): { provider: string; model: string } {
  return {
    provider: config.type === 'openai' ? 'OpenAI' : 'Qwen (Tongyi Qianwen)',
    model: config.model || 'default',
  };
}

/**
 * Get environment variable help information
 */
export function getEnvHelp(): string {
  return `
╔════════════════════════════════════════════════════════════════╗
║         Environment Variable Configuration Guide               ║
╠════════════════════════════════════════════════════════════════╣
║ Configure one of the following environment variable groups:    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ OpenAI:                                                        ║
║   OPENAI_API_KEY=sk-your-api-key                              ║
║   [Optional] OPENAI_MODEL=gpt-4o                              ║
║   [Optional] OPENAI_BASE_URL=https://api.openai.com/v1        ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ Qwen (Tongyi Qianwen):                                         ║
║   QWEN_API_KEY=sk-your-api-key                                ║
║   or DASHSCOPE_API_KEY=sk-your-api-key                        ║
║   [Optional] QWEN_MODEL=qwen-plus                             ║
║   [Optional] QWEN_BASE_URL=https://dashscope.../compatible-mode/v1║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║ General Configuration (Optional):                              ║
║   TIMEOUT=30000        # Timeout (milliseconds)                ║
║   MAX_RETRIES=3        # Maximum retry attempts                ║
║   LOG_LEVEL=error      # Log level                             ║
╚════════════════════════════════════════════════════════════════╝
`;
}

export { DEFAULT_MODELS, DEFAULT_BASE_URLS, detectAuthType };
