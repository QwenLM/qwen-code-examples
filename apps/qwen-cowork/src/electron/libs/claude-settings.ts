import type { ClaudeSettingsEnv } from "../types.js";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { loadApiConfig, saveApiConfig, type ApiConfig } from "./config-store.js";

// Get current effective API configuration (prioritize UI config, fallback to file config)
export function getCurrentApiConfig(): ApiConfig | null {
  const uiConfig = loadApiConfig();
  if (uiConfig) {
    console.log("[claude-settings] Using UI config:", {
      baseURL: uiConfig.baseURL,
      model: uiConfig.model,
      apiType: uiConfig.apiType
    });
    return uiConfig;
  }

  // Try ~/.qwen/settings.json
  try {
    const qwenSettingsPath = join(homedir(), ".qwen", "settings.json");
    const raw = readFileSync(qwenSettingsPath, "utf8");
    const parsed = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (parsed.env) {
      // Support Qwen API configuration
      const apiKey = parsed.env.QWEN_API_KEY;
      const baseURL = parsed.env.QWEN_BASE_URL;
      const model = parsed.env.QWEN_MODEL;

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
    const parsed = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (parsed.env) {
      for (const [key, value] of Object.entries(parsed.env)) {
        if (process.env[key] === undefined && value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }
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
