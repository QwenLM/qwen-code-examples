# @qwen-code/sdk 中文全量开发指南

`@qwen-code/sdk` 是一个用于以编程方式访问 Qwen Code 能力的 TypeScript SDK。它允许开发者在 Node.js 环境中通过代码与 Qwen 的 AI 助手进行交互，支持单轮/多轮对话、文件系统操作、以及通过 MCP (Model Context Protocol) 扩展自定义工具。

本指南涵盖了 SDK 的所有公开导出成员：核心查询方法、辅助类、工具函数及类型定义。

---

## 目录

1.  [安装](#安装)
2.  [核心方法: query](#核心方法-query)
3.  [核心类: Query](#核心类-query)
4.  [MCP 扩展工具](#mcp-扩展工具)
5.  [错误处理 (AbortError)](#错误处理-aborterror)
6.  [日志调试 (SdkLogger)](#日志调试-sdklogger)
7.  [类型守卫 (Type Guards)](#类型守卫-type-guards)

---

## 安装

```bash
npm install @qwen-code/sdk
```
> 要求: Node.js >= 20.0.0

---

## 核心方法: `query`

`query` 是 SDK 的主入口函数，用于创建一个新的 AI 会话。

### 函数签名

```typescript
import { query } from '@qwen-code/sdk';

function query(config: {
    prompt: string | AsyncIterable<SDKUserMessage>;
    options?: QueryOptions;
}): Query
```

### 1. `prompt` 参数

*   **`string` (单轮模式)**: 适合一次性任务。
    ```typescript
    query({ prompt: "帮我写一个 Hello World" })
    ```
*   **`AsyncIterable` (流式/多轮模式)**: 传入一个异步迭代器，持续发送消息。
    ```typescript
    async function* chat() {
        yield { type: 'user', message: { role: 'user', content: '你好' }, ... };
        // ...逻辑...
    }
    query({ prompt: chat() })
    ```

### 2. `options` 参数詳解 (`QueryOptions`)

`QueryOptions` 用于配置会话的运行环境、权限、模型和扩展能力。

| 选项名称 | 类型 | 默认值 | 详细说明 |
| :--- | :--- | :--- | :--- |
| **`cwd`** | `string` | `process.cwd()` | **工作目录**。指定 AI 在执行文件操作（读写文件）或运行 Shell 命令时的基准目录。 |
| **`model`** | `string` | (自动) | **模型名称**。指定使用的 AI 模型（如 `qwen-plus`）。优先级高于环境变量。 |
| **`pathToQwenExecutable`** | `string` | (自动) | **CLI 路径**。手动指定 `qwen` 可执行文件的路径。支持 `node:/path/to/cli.js` 强制 Node 运行。 |
| **`authType`** | `'openai' \| 'qwen-oauth' ...` | `'openai'` | **认证方式**。指定使用哪种认证类型。通常 `qwen-oauth` 用于 CLI 登录态，`openai` 用于 API Key。 |
| **`logLevel`** | `'debug' \| 'info' \| 'warn' \| 'error'` | `'info'` | **日志级别**。控制 SDK 内部日志的输出详细程度。 |
| **`debug`** | `boolean` | `false` | **调试模式**。快捷开启调试日志（相当于 `logLevel: 'debug'`）。 |
| **`permissionMode`** | `'default' \| 'plan' \| 'auto-edit' \| 'yolo'` | `'default'` | **权限模式**。<br>• `default`: 写入操作(写文件/命令)需确认，读取自动允许。<br>• `plan`: AI 只能提出计划，禁止任何副作用操作。<br>• `auto-edit`: 自动允许编辑类操作，其他高风险操作需确认。<br>• `yolo`: 自动允许所有操作（慎用，"You Only Live Once"）。 |
| **`canUseTool`** | `CanUseTool` | - | **自定义权限回调**。当工具需要用户确认时（非自动允许的工具）会调用此函数。<br>需返回 `{ behavior: 'allow', updatedInput }` 或 `{ behavior: 'deny', message }`。<br>若超时未响应（默认60s）会自动拒绝。 |
| **`mcpServers`** | `Record<string, McpServerConfig>` | - | **MCP 服务器配置**。在此注入自定义工具或连接外部知识库。<br>支持配置外部命令、HTTP/SSE URL，或直接传入 SDK 创建的内存服务器实例。 |
| **`env`** | `Record<string, string>` | - | **环境变量**。传递给 Qwen Code 进程的环境变量。会与当前进程的 `process.env` 合并。 |
| **`includePartialMessages`** | `boolean` | `false` | **流式输出**。设为 `true` 时，SDK 会通过迭代器实时抛出 AI 正在生成的片段消息（打字机效果）。 |
| **`abortController`** | `AbortController` | - | **取消控制器**。用于从外部强制中断查询会话。 |
| **`timeout`** | `Object` | (默认配置) | **超时设置**。<br>• `canUseTool`: 权限回调超时 (60s)<br>• `mcpRequest`: MPC 工具调用超时 (10min)<br>• `controlRequest`: 控制类操作超时 (60s) |
| **`maxSessionTurns`** | `number` | -1 | **最大对话轮数**。防止对话死循环，达到指定轮数后自动结束会话。 |
| **`coreTools`** | `string[]` | - | **核心工具覆盖**。指定 AI 仅能使用哪些核心工具（如 `['read_file']`）。 |
| **`excludeTools`** | `string[]` | - | **黑名单工具**。完全禁止 AI 使用特定工具，优先级最高。 |
| **`allowedTools`** | `string[]` | - | **白名单工具**。该列表中的工具将跳过权限检查，直接执行。 |
| **`stderr`** | `(message: string) => void` | - | **标准错误流钩子**。捕获底层 CLI 进程的 stderr 输出。 |
| **`continue`** | `boolean` | `false` | **继续之前的会话**。尝试恢复上一次的会话上下文。 |
| **`resume`** | `string` | - | **恢复指定会话**。传入具体的 `sessionId` 来恢复该会话。 |

---

## 核心类: `Query`

`query()` 函数返回的是 `Query` 类的实例。它既是**响应迭代器**，也是**会话控制器**。

### 迭代用法

`Query` 实现了 `AsyncIterable` 接口，可直接遍历：

```typescript
const q = query({ ... });
for await (const msg of q) {
    console.log(msg); // 处理 AI 消息
}
```

### 实例方法列表

#### `getSessionId(): string`
获取当前会话的唯一 ID（UUID）。

#### `isClosed(): boolean`
检查当前会话连接是否已关闭。

#### `close(): Promise<void>`
优雅地关闭会话。这将断开与后台 AI 进程的连接并清理资源。

#### `interrupt(): Promise<void>`
发送中断信号。类似于在终端按下 `Ctrl+C`。用于停止当前正在生成的长回复或取消正在执行的耗时操作，但不结束整个会话。

#### `setModel(model: string): Promise<void>`
在会话进行中动态切换模型。
```typescript
await q.setModel('qwen-max'); // 切换到更强模型
```

#### `setPermissionMode(mode: PermissionMode): Promise<void>`
在会话进行中动态更改权限模式。
```typescript
await q.setPermissionMode('yolo'); // 开启自动执行模式
```

---

## MCP 扩展工具

SDK 导出了两个核心辅助函数，用于快速构建和挂载自定义工具（Function Calling）。

### 1. `tool(name, description, schema, handler)`

用于定义工具及其参数校验逻辑。利用 Zod 进行类型推断。

```typescript
import { tool } from '@qwen-code/sdk';
import { z } from 'zod';

const myTool = tool(
  'get_stock_price',
  '查询股票价格',
  { symbol: z.string() }, // 参数定义
  async ({ symbol }) => {
    // 业务逻辑
    return { content: [{ type: 'text', text: '100.5' }] };
  }
);
```

### 2. `createSdkMcpServer(options)`

创建一个运行在 SDK 进程内的轻量级 MCP 服务器实例。

```typescript
import { createSdkMcpServer } from '@qwen-code/sdk';

const server = createSdkMcpServer({
  name: 'finance-tools',
  version: '1.0.0',
  tools: [myTool]
});

// 在 query 中使用
query({
  prompt: '...',
  options: {
    mcpServers: { 'finance': server }
  }
});
```

---

## 错误处理 (`AbortError`)

当会话被用户取消（调用 `abortController.abort()`）时，SDK 会抛出 `AbortError`。

SDK 导出了类和检测函数：
*   **`AbortError`**: 错误类。
*   **`isAbortError(error: unknown): boolean`**: 类型守卫函数。

```typescript
import { query, isAbortError } from '@qwen-code/sdk';

try {
  // ... run query
} catch (err) {
  if (isAbortError(err)) {
    console.log('任务已取消');
  } else {
    throw err;
  }
}
```

---

## 日志调试 (`SdkLogger`)

SDK 内部使用 `SdkLogger` 进行日志记录。你可以通过它配置 SDK 的日志行为，方便调试。

```typescript
import { SdkLogger } from '@qwen-code/sdk';

SdkLogger.configure({
  logLevel: 'debug', // 'debug' | 'info' | 'warn' | 'error'
  debug: true,       // 快捷开启 debug 级别
  stderr: (msg) => console.error(`[SDK LOG] ${msg}`) // 自定义输出目标
});
```

---

## 类型守卫 (Type Guards)

SDK 返回的 `SDKMessage` 是一个联合类型。SDK 导出一系列函数来帮助你安全地判断消息类型。

| 函数名 | 说明 | 对应类型 |
| :--- | :--- | :--- |
| **`isSDKUserMessage(msg)`** | 判断是否为用户消息 | `SDKUserMessage` |
| **`isSDKAssistantMessage(msg)`** | 判断是否为 AI 完整回复 | `SDKAssistantMessage` |
| **`isSDKPartialAssistantMessage(msg)`** | 判断是否为 AI 流式片段 (需开启 `includePartialMessages`) | `SDKPartialAssistantMessage` |
| **`isSDKSystemMessage(msg)`** | 判断是否为系统通知 (如错误、状态) | `SDKSystemMessage` |
| **`isSDKResultMessage(msg)`** | 判断是否为任务最终结果摘要 | `SDKResultMessage` |
| **`isControlRequest(msg)`** | (高级) 判断是否为底层控制请求 | `CLIControlRequest` |
| **`isControlResponse(msg)`** | (高级) 判断是否为底层控制响应 | `CLIControlResponse` |

### 使用示例

```typescript
import { isSDKAssistantMessage, isSDKResultMessage } from '@qwen-code/sdk';

for await (const msg of q) {
  if (isSDKAssistantMessage(msg)) {
    console.log("AI 说:", msg.message.content);
  } else if (isSDKResultMessage(msg)) {
    console.log("任务结束，耗时:", msg.duration_ms);
  }
}
```
