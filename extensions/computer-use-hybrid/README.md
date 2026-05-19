# computer-use-hybrid

Qwen Code extension for cross-platform desktop automation through accessibility trees and screenshots.

It exposes one MCP server:

- `open-computer-use`: `npx -y open-computer-use mcp` from iFurySt open-codex-computer-use.

Playwright is intentionally not included.

## Install

Copy or symlink this directory into Qwen Code's extension directory, then restart Qwen Code.

## Requirements

Node.js and npm are required because the extension launches `open-computer-use` through `npx`.

macOS, Windows, and Linux are supported by upstream open-computer-use.

On macOS, the first run may require Accessibility and Screen Recording permissions. You can trigger upstream onboarding manually:

```bash
npx -y open-computer-use doctor
```

You do not need to run `open-computer-use install-codex-mcp` or `open-computer-use install-codex-plugin` for this extension. `qwen-extension.json` already registers the MCP server.

The MCP server is configured directly in `qwen-extension.json` as:

```bash
npx -y open-computer-use mcp
```
