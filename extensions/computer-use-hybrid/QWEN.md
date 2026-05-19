# Computer Use Hybrid Extension

This extension exposes one cross-platform desktop automation MCP server:

- `open-computer-use`: launches iFurySt open-computer-use through `npx -y open-computer-use mcp`.

Use the `computer-use-hybrid` skill whenever the user asks Qwen Code to operate the local desktop, inspect native app UI, use the accessibility tree, capture screenshots, click UI, type into an app, press shortcuts, scroll, drag, or control native Mac/Windows applications.

Important: `computer-use-hybrid` is a skill and MCP routing guide, not a subagent. Do not call the Agent/Subagent tool with `computer-use-hybrid` as the subagent type. Use the MCP tools exposed by `open-computer-use` directly in the current agent.

Do not use this extension for browser-only DOM automation. Playwright is intentionally not included in this extension.

Routing rule: use the cross-platform MCP tools exposed by `open-computer-use`. Do not try to start another desktop automation server or Playwright from this extension.

The tools operate on the user's real machine. Ask before destructive, privacy-sensitive, or externally visible actions such as sending messages, deleting files, purchasing, submitting forms, entering credentials, or changing security settings.

## Upstream Projects

- Desktop MCP: https://github.com/iFurySt/open-codex-computer-use

## Requirements

All platforms:

- Node.js and npm available to run `npx`.
- macOS, Windows, or Linux.

macOS:

- The first run may require Accessibility and Screen Recording permissions. If desktop actions fail because permissions are missing, ask the user to run `npx -y open-computer-use doctor` once and grant the prompted permissions.
- Do not ask the user to run `open-computer-use install-codex-mcp` or `open-computer-use install-codex-plugin`; this extension already registers the MCP server through `qwen-extension.json`.
