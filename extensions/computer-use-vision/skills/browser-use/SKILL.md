---
name: browser-use
description: Control browser pages using the Playwright MCP server. Use when the user asks to open, inspect, navigate, click, type, test, or automate websites, localhost web apps, browser tabs, forms, and web UI.
---

# Browser Use

Use the MCP tools from the `playwright` MCP server for browser-specific tasks.

Prefer this skill over `computer-use` when the target is a website, browser tab, localhost web app, web form, DOM element, link, button, input, page content, or browser navigation flow.

Do not use shell commands to start another browser automation server, and do not edit Qwen settings as a fallback.
If the Playwright MCP tools are not available in the current tool list, stop and tell the user to restart Qwen Code or reconnect the `playwright` MCP server.

## Operating Loop

1. Navigate or attach to the requested browser page using the available Playwright MCP tool.
2. Observe the page with the Playwright accessibility snapshot before acting.
3. Prefer semantic element interactions over coordinate clicks.
4. After every meaningful action, verify the resulting page state.
5. Use screenshots only when visual verification is needed.

## Routing

- Use `browser-use` for browser pages and web apps.
- Use `computer-use` for native desktop apps, operating system UI, app switching, dialogs outside the browser page, or anything that cannot be represented through the browser DOM/accessibility tree.
- If a browser task needs an OS-level action, use `computer-use` only for that OS-level step, then return to Playwright tools.

## Safety

Ask for confirmation before destructive, privacy-sensitive, or externally visible actions, including deleting data, sending messages, submitting forms, making purchases, changing security settings, or entering credentials.
