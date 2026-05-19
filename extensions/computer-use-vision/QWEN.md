# Computer And Browser Use Extension

This extension exposes two local automation MCP servers:

- `computer-use`: local desktop control through domdomegg/computer-use-mcp.
- `playwright`: browser and web app control through Microsoft Playwright MCP.

Use the `computer-use` skill whenever the user asks Qwen Code to operate the local desktop, inspect the screen, click UI, type into an app, use keyboard shortcuts, or control native Mac/Windows applications.

Use the `browser-use` skill whenever the user asks Qwen Code to operate a website, browser tab, localhost web app, web form, DOM element, link, input, or browser navigation flow.

Routing rule: native desktop and OS-level UI should use `computer-use`; browser-specific work should use `browser-use`. If a browser task temporarily requires OS-level interaction, use `computer-use` only for that step and then return to `browser-use`.

The tools operate on the user's real machine. Ask before destructive, privacy-sensitive, or externally visible actions such as sending messages, deleting files, purchasing, submitting forms, or changing security settings.
