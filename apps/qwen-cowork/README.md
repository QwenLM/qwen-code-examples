
<div align="center">

# Qwen Code Cowork

[![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)

[![Platform](https://img.shields.io/badge/platform-%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)

[中文](README_ZH.md)

</div>

Qwen Code Cowork is an open-source work assistant built using the Qwen Code SDK service, capable of implementing all the features that Claude Cowork can achieve.

It's not just a GUI, but a genuine AI assistant that can help you handle many tedious tasks without requiring any coding foundation. Simply install and start using it.

👇 Practical scenario: Demonstrating organizing messy files in a local folder

[![](https://img.alicdn.com/imgextra/i3/6000000008043/O1CN011UkmDj29Hkg2krP5j_!!6000000008043-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/W4hoEc3Bd4C2I2XGh58u9udG_2SWtvvVuf9SQ-gHc_Q.mp4)

## Join Community

| WeChat Group                                                                                     | DingTalk Group                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| ![](https://gw.alicdn.com/imgextra/i1/O1CN01LF3SYz1Vv42Yrh1zs_!!6000000002714-2-tps-396-396.png) | ![](https://gw.alicdn.com/imgextra/i4/O1CN01oRKsAo1fMqbmM6FW3_!!6000000003993-2-tps-380-380.png) |

## Core Capabilities

### AI Collaboration Partner — More Than Just a GUI

Qwen Code Cowork is your AI collaboration partner that can:

- **Write and edit code** — Supporting any programming language
- **Manage files** — Create, move, organize
- **Run commands** — Build, test, deploy
- **Answer questions** — About your codebase
- **Do anything** — As long as you can describe it in natural language

### Session Management

- Create sessions with **custom working directories**
- Restore any previous conversations
- Complete local session history (stored in SQLite)
- Secure deletion and automatic persistence

### Real-time Streaming Output

- **Character-by-character streaming output**
- View Qwen Code's thought process
- Markdown + syntax-highlighted code rendering
- Tool call visualization and status indicators

### Tool Permission Control

- Sensitive operations require explicit approval
- Allow/Deny by tool
- Interactive decision panel
- Complete control over what Qwen Code can do

## Fully Compatible with Qwen Code

Qwen Cowork **shares configuration with Qwen Code**.

Direct reuse:

```
~/.qwen/settings.json
```

This means:

- Same API keys
- Same Base URL
- Same models
- Same behavior

> Configure Qwen Code once — use everywhere.

## 🚀 Quick Start

### Qwen Code Direct Installation (Recommended)

Just tell Qwen Code, and get it all done within 3 minutes.

```
Help me install and start the cowork project. The repository address is: https://github.com/QwenLM/qwen-code-examples
``` 

👇 Click the image to play the installation video:

[![](https://img.alicdn.com/imgextra/i4/6000000008035/O1CN01HdjX9O29E5VhMZbq8_!!6000000008035-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/tsV-hCkm9vMjGTWsmDr8qcB8LxY_mfwWb7R97SBR2Ps.mp4)

### Source Installation

**Prerequisites**

- [Bun](https://bun.sh/) or Node.js 22+
- [Qwen Code](https://qwenlm.github.io/qwen-code-docs/en/users/overview/) installed and authenticated

If you don't have Bun, you can install it in the terminal using the following command:

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Configure directory
exec /bin/zsh
```

**Download and Install**

```bash
# Clone repository
git clone https://github.com/QwenLM/qwen-code-examples

# Enter qwen-cowork directory
cd qwen-code-examples/apps/qwen-cowork

# Install dependencies
bun install

# Start in development mode
bun run dev

# Or build production version
bun run dist:mac-arm64    # macOS Apple Silicon (M1/M2/M3)
bun run dist:mac-x64      # macOS Intel
bun run dist:win          # Windows
bun run dist:linux        # Linux
```

**Installation Guide Video** 👇

[![](https://img.alicdn.com/imgextra/i3/6000000006120/O1CN01keYBUk1v512mbcjQe_!!6000000006120-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/_gqXY7rjt4OT-snShhh0yyaiEjRUJoFGQ2RYFyPhOTY.mp4)

## Architecture Overview

| Layer            | Technology                      |
| ---------------- | ------------------------------- |
| Framework        | Electron 39                     |
| Frontend         | React 19, Tailwind CSS 4        |
| State Management | Zustand                         |
| Database         | better-sqlite3 (WAL mode)       |
| AI               | @qwen-code/sdk                  |
| Build            | Vite, electron-builder          |

## Development

```shell
# Start development server (hot reload)
bun run dev

# Type checking
bun run build

# Code checking
bun run lint
```

## Roadmap

Planned features:

- GUI configuration interface and KEY
- 🚧 More features coming soon

## Finally

If you've ever wanted:

- A desktop resident AI collaboration partner
- Visual feedback for Qwen Code workflow
- Convenient cross-project session management

This project is made for you.

> Reference open-source project: [https://github.com/DevAgentForge/Claude-Cowork](https://github.com/DevAgentForge/Claude-Cowork/tree/main)
