---
name: computer-use-hybrid
description: Control native macOS, Windows, and Linux desktop apps through the `open-computer-use` MCP server. Use when the user asks to operate local apps with accessibility-tree context plus screenshots, inspect the screen, click UI, type text, press shortcuts, scroll, drag, or interact with OS-level GUI software.
---

# Computer Use Hybrid

Use the MCP tools exposed by the `open-computer-use` server to operate the user's real local desktop through accessibility-tree context and screenshots.

This is a skill, not a subagent. Never invoke the Agent/Subagent tool with `computer-use-hybrid` as the subagent type. Stay in the current agent and call the `open-computer-use` MCP tools directly.

Do not use shell commands to start Playwright or a second desktop automation MCP server, and do not edit Qwen settings as a fallback. If the `open-computer-use` MCP tools are not available in the current tool list, stop and tell the user to restart Qwen Code or reconnect the extension.

Playwright is intentionally not part of this extension. For browser-only DOM automation, use whatever browser-specific extension or MCP server the user has separately enabled.

## Operating Loop

1. Observe first with the platform server's accessibility-state or screenshot tool.
2. Prefer accessibility-tree targets, window identifiers, focused elements, and semantic actions when the server exposes them.
3. Use screenshots to confirm visual state, target bounds, and post-action results.
4. Prefer keyboard shortcuts and typed navigation when practical.
5. Use coordinate clicks only after accessibility metadata or a screenshot confirms the target location.
6. After every meaningful action, verify with another state read or screenshot.
7. Keep actions small and reversible.

## Tool Notes

open-computer-use supports macOS, Windows, and Linux and is launched through `npx -y open-computer-use mcp` by default.

On macOS, the first run may require Accessibility and Screen Recording permissions. If a permission prompt or onboarding window appears, guide the user through granting the permission before continuing.

## Safety

Ask for confirmation before destructive, privacy-sensitive, or externally visible actions, including deleting files, sending messages, submitting forms, making purchases, changing security settings, or entering credentials.

Do not assume the user wants the whole desktop automated. Operate only the app, window, or workflow they asked for.
