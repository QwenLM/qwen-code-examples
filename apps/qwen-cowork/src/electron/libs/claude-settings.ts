import type { ClaudeSettingsEnv } from "../types.js";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { loadApiConfig, saveApiConfig, type ApiConfig } from "./config-store.js";

// Get current effective API configuration (prioritize UI config, fallback to file config)
export function getCurrentApiConfig(): ApiConfig | null {
  const uiConfig = loadApiConfig();
  if (uiConfig) {
    return uiConfig;
  }

  // Try ~/.qwen/settings.json
  try {
    const qwenSettingsPath = join(homedir(), ".qwen", "settings.json");
    const raw = readFileSync(qwenSettingsPath, "utf8");
    const parsed = JSON.parse(raw);
    
    // Support both env format and direct format
    let apiKey, baseURL, model;
    
    // Check for env format first
    if (parsed.env) {
      apiKey = parsed.env.QWEN_API_KEY;
      baseURL = parsed.env.QWEN_BASE_URL;
      model = parsed.env.QWEN_MODEL;
    }
    
    // Check for direct format (new Qwen settings format)
    if (!apiKey && parsed.security?.auth) {
      apiKey = parsed.security.auth.apiKey;
      baseURL = parsed.security.auth.baseUrl;
      model = parsed.model?.name;
    }

    if (apiKey && baseURL && model) {
      console.log("[claude-settings] Using Qwen config from ~/.qwen/settings.json");
      const config: ApiConfig = {
        apiKey: String(apiKey),
        baseURL: String(baseURL),
        model: String(model),
        apiType: "openai"
      };
      // Persist to api-config.json
      try {
        saveApiConfig(config);
        console.log("[claude-settings] Persisted config to api-config.json");
      } catch (e) {
        console.error("[claude-settings] Failed to persist config:", e);
      }
      return config;
    }
  } catch {
    // Ignore missing or invalid Qwen settings file
  }
  
  console.log("[claude-settings] No config found");
  return null;
}

// Environment variable keys for Qwen configuration
// These can be configured via ~/.qwen/settings.json or environment variables
const QWEN_SETTINGS_ENV_KEYS = [
  "QWEN_API_KEY",           // Qwen API key
  "QWEN_BASE_URL",          // Qwen base URL
  "QWEN_MODEL",             // Qwen model name
  "QWEN_AUTH_TYPE",         // Qwen auth type (e.g., 'api-key')
  "API_TIMEOUT_MS",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"
] as const;

export function loadClaudeSettingsEnv(): ClaudeSettingsEnv {
  // Try loading from Qwen settings
  try {
    const qwenSettingsPath = join(homedir(), ".qwen", "settings.json");
    const raw = readFileSync(qwenSettingsPath, "utf8");
    const parsed = JSON.parse(raw);
    
    // Support both env format and direct format
    if (parsed.env) {
      for (const [key, value] of Object.entries(parsed.env)) {
        if (process.env[key] === undefined && value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }
    }
    
    // Support direct format (new Qwen settings format)
    if (parsed.security?.auth) {
      if (process.env.QWEN_API_KEY === undefined && parsed.security.auth.apiKey) {
        process.env.QWEN_API_KEY = String(parsed.security.auth.apiKey);
      }
      if (process.env.QWEN_BASE_URL === undefined && parsed.security.auth.baseUrl) {
        process.env.QWEN_BASE_URL = String(parsed.security.auth.baseUrl);
      }
    }
    if (parsed.model?.name && process.env.QWEN_MODEL === undefined) {
      process.env.QWEN_MODEL = String(parsed.model.name);
    }
  } catch {
    // Ignore missing or invalid Qwen settings file
  }

  const env = {} as ClaudeSettingsEnv;
  for (const key of QWEN_SETTINGS_ENV_KEYS) {
    (env as Record<string, string>)[key] = process.env[key] ?? "";
  }
  return env;
}

export const qwenCodeEnv = loadClaudeSettingsEnv();
// Alias for backward compatibility
export const claudeCodeEnv = qwenCodeEnv;
