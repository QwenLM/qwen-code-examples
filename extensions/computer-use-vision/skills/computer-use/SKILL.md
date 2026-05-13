---
name: computer-use
description: Control the local desktop using the `computer` MCP tool from computer-use-mcp. Use when the user asks to operate local Mac/Windows apps, inspect the screen, click UI, type text, press shortcuts, scroll, drag, or interact with native GUI software.
---

# Computer Use

Use the `computer` MCP tool from the `computer-use` MCP server to operate the user's real local desktop.

The only valid tool path for this skill is the MCP tool named `computer`.
Do not use shell commands to start another desktop automation MCP server, do not install `@anthropic-ai/mcp-computer-use-server`, and do not edit Qwen settings as a fallback.
If the `computer` tool is not available in the current tool list, stop and tell the user to restart Qwen Code or reconnect the `computer-use` MCP server.

For browser pages, websites, localhost web apps, web forms, DOM elements, links, inputs, or browser navigation flows, use the `browser-use` skill and the Playwright MCP server instead. Use `computer-use` only when the task requires native OS or app UI that Playwright cannot see.

## Operating Loop

1. Observe first with `computer` action `get_screenshot`.
2. Prefer keyboard shortcuts and typed navigation when practical.
3. Use coordinate clicks only after a screenshot confirms the target location.
4. After every action, verify with another `get_screenshot`.
5. Keep actions small and reversible.

## Safety

Ask for confirmation before destructive, privacy-sensitive, or externally visible actions, including deleting files, sending messages, submitting forms, making purchases, changing security settings, or entering credentials.

Do not assume the user wants the whole desktop automated. Operate only the app, window, or workflow they asked for.

## Tool Notes

- Use `action: "get_screenshot"` to establish the coordinate frame.
- Use `action: "left_click"`, `action: "right_click"`, `action: "middle_click"`, `action: "double_click"`, `action: "mouse_move"`, and `action: "left_click_drag"` for pointer actions.
- Use `action: "type"` for text input.
- Use `action: "key"` for keys or key combinations.
- Use `action: "scroll"` for scrolling.
- The tool uses a single MCP tool named `computer`; do not look for separate tools named `click` or `screenshot`.

## Platform Notes

On macOS, the user may need to grant Accessibility and Screen Recording permissions to the Node/npm process that runs the MCP server.

On Windows, the desktop must be unlocked and interactive for GUI input to work reliably.
