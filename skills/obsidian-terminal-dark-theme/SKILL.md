---
name: obsidian-terminal-dark-theme
description: Configure the Obsidian Terminal plugin to use an independent dark theme, separate from Obsidian's main theme settings. Use this skill when users want the Terminal to display a dark background while keeping the rest of Obsidian in a light theme.
---

# Obsidian Terminal Dark Theme

Configure the Obsidian Terminal plugin to use an independent dark theme, separate from Obsidian's main theme.

## Configuration Steps

### 1. Modify Terminal Plugin Configuration

Edit the `.obsidian/plugins/terminal/data.json` file:

**Disable Theme Following:**

Replace all `"followTheme": true` with `"followTheme": false`

**Add Dark Theme Configuration:**

Add a `theme` configuration within `terminalOptions`:

```json
"terminalOptions": {
  "documentOverride": null,
  "theme": {
    "background": "#1e1e1e",
    "foreground": "#d4d4d4",
    "cursor": "#d4d4d4",
    "cursorAccent": "#1e1e1e",
    "selectionBackground": "#264f78"
  }
}
```

### 2. Restart Obsidian

Press `Cmd+R` (macOS) or restart Obsidian for the changes to take effect.

## Complete Configuration Example

```json
{
  "profiles": {
    "darwinIntegratedDefault": {
      "followTheme": false,
      ...
    }
  },
  "terminalOptions": {
    "documentOverride": null,
    "theme": {
      "background": "#1e1e1e",
      "foreground": "#d4d4d4",
      "cursor": "#d4d4d4",
      "cursorAccent": "#1e1e1e",
      "selectionBackground": "#264f78"
    }
  }
}
```

## Theme Color Reference

| Property | Color Value | Purpose |
|----------|-------------|---------|
| background | #1e1e1e | Terminal background color |
| foreground | #d4d4d4 | Text color |
| cursor | #d4d4d4 | Cursor color |
| cursorAccent | #1e1e1e | Cursor background color |
| selectionBackground | #264f78 | Selected text background color |

This color scheme is based on the VS Code default dark theme.