 

<div align="center">

# Qwen Code Cowork

[![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)

[![Platform](https://img.shields.io/badge/platform-%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/DevAgentForge/Claude-Cowork/releases)

[英文](README.md)

</div>

Qwen Code Cowork 是使用 Qwen Code SDK 服务构建开源工作助手，可以实现所有 Claude Cowork 能够实现的功能。

不仅仅是一个 GUI，而是真正能够帮你处理很多繁琐工作的 AI 助理，不需要任何代码基础，直接安装就可以开始使用。

👇 实战场景：整理本地文件夹中乱七八糟的文件演示

[![](https://img.alicdn.com/imgextra/i3/6000000008043/O1CN011UkmDj29Hkg2krP5j_!!6000000008043-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/W4hoEc3Bd4C2I2XGh58u9udG_2SWtvvVuf9SQ-gHc_Q.mp4)

## 加入交流

| 微信群                                                                                              | 钉钉群                                                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| ![](https://gw.alicdn.com/imgextra/i1/O1CN01LF3SYz1Vv42Yrh1zs_!!6000000002714-2-tps-396-396.png) | ![](https://gw.alicdn.com/imgextra/i4/O1CN01oRKsAo1fMqbmM6FW3_!!6000000003993-2-tps-380-380.png) |

## 核心能力

### AI 协作伙伴 — 不只是 GUI

Qwen Code Cowork 是你的 AI 协作伙伴，可以：

- **编写和编辑代码** — 支持任何编程语言
- **管理文件** — 创建、移动、整理
- **运行命令** — 构建、测试、部署
- **回答问题** — 关于你的代码库
- **做任何事** — 只要你能用自然语言描述

### 会话管理

- 创建会话并指定**自定义工作目录**
- 恢复任何之前的对话
- 完整的本地会话历史（SQLite 存储）
- 安全删除和自动持久化

### 实时流式输出

- **逐字流式输出**
- 查看 Qwen Code 的思考过程
- Markdown + 语法高亮代码渲染
- 工具调用可视化及状态指示

### 工具权限控制

- 敏感操作需要明确批准
- 按工具允许/拒绝
- 交互式决策面板
- 完全控制 Qwen Code 能做什么

## 与 Qwen Code 完全兼容

Qwen Cowork **与 Qwen Code 共享配置**。

直接复用：

```
~/.qwen/settings.json
```

这意味着：

- 相同的 API 密钥
- 相同的 Base URL
- 相同的模型
- 相同的行为

> 配置一次 Qwen Code —— 到处使用。

## 🚀 快速开始

### Qwen Code 直接安装（推荐）

直接告诉 Qwen Code，3 分钟内全搞定。

```
帮我安装 cowork 项目并启动，仓库地址是：https://github.com/QwenLM/qwen-code-examples
```

👇 点击图片播放安装视频：

[![](https://img.alicdn.com/imgextra/i4/6000000008035/O1CN01HdjX9O29E5VhMZbq8_!!6000000008035-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/tsV-hCkm9vMjGTWsmDr8qcB8LxY_mfwWb7R97SBR2Ps.mp4)
### 源码安装

**前置条件**

- [Bun](https://bun.sh/) or Node. js 22+
- [Qwen Code](https://qwenlm.github.io/qwen-code-docs/en/users/overview/) installed and authenticated

如果没有 Bun 可以在终端使用以下命令安装：

```bash
#安装 bun
curl -fsSL https://bun.sh/install | bash

#配置目录
exec /bin/zsh
```

**下载安装**

```bash
#克隆仓库
git clone https://github.com/QwenLM/qwen-code-examples

#进入qwen-cowork目录
cd qwen-code-examples/apps/qwen-cowork

#安装依赖
bun install

#启动开发模式
bun run dev

#或构建生成版本
bun run dist:mac-arm64    # macOS Apple Silicon (M1/M2/M3)
bun run dist:mac-x64      # macOS Intel
bun run dist:win          # Windows
bun run dist:linux        # Linux
```

**安装指导视频**👇

[![](https://img.alicdn.com/imgextra/i3/6000000006120/O1CN01keYBUk1v512mbcjQe_!!6000000006120-0-tbvideo.jpg)](https://cloud.video.taobao.com/vod/_gqXY7rjt4OT-snShhh0yyaiEjRUJoFGQ2RYFyPhOTY.mp4)

## 架构概览

| 层级   | 技术                       |
| ---- | ------------------------ |
| 框架   | Electron 39              |
| 前端   | React 19, Tailwind CSS 4 |
| 状态管理 | Zustand                  |
| 数据库  | better-sqlite3 (WAL 模式)  |
| AI   | @qwen-code/sdk           |
| 构建   | Vite, electron-builder   |

## 开发

```shell
# 启动开发服务器（热重载）
bun run dev

# 类型检查
bun run build

# 代码检查
bun run lint
```

## 路线图

计划中的功能：

- GUI 配置接口与 KEY
- 🚧 更多功能即将推出

## 最后

如果你曾经想要：

- 一个常驻桌面的 AI 协作伙伴
- Qwen Code 工作过程的可视化反馈
- 跨项目的便捷会话管理

这个项目就是为你准备的。

> 参考开源项目：[https://github.com/DevAgentForge/Claude-Cowork](https://github.com/DevAgentForge/Claude-Cowork/tree/main)
