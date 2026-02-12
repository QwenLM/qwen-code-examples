# sdk-typescript 包详尽文档（核心方法 query 全面解析）

## 概述

`sdk-typescript` 是为 Qwen Code 提供的 TypeScript/JavaScript SDK，支持与 Qwen Code CLI 及 MCP（Model Context Protocol）服务器进行深度集成。其核心能力是通过 `query` 方法实现与 AI 的单轮/多轮对话、工具调用、MCP 服务器扩展等。

---

## 目录结构简述

- `src/query/Query.ts`：核心 Query 类，负责消息编排、生命周期管理、异步流式消息消费。
- `src/query/createQuery.ts`：query 工厂方法，简化 Query 实例创建。
- `src/types/types.ts`：QueryOptions、工具权限、MCP 配置等类型定义。
- `src/types/protocol.ts`：SDK 消息协议、消息类型、内容块等定义。
- 其他目录见前文。

---

## 1. 核心方法 query 全面解析

### 1.1 query 方法签名

```typescript
function query({
  prompt,
  options = {},
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: QueryOptions;
}): Query
```

#### 参数说明
- `prompt`：
  - `string`：单轮对话，直接发送文本。
  - `AsyncIterable<SDKUserMessage>`：多轮对话，流式发送用户消息。
- `options`：详见 QueryOptions，支持会话控制、模型选择、工具权限、MCP 服务器、环境变量等。

#### 返回值
- `Query` 实例（实现了 `AsyncIterable<SDKMessage>` 协议，可直接 for-await 消费 AI 消息流）。

### 1.2 QueryOptions 详解

| 字段                | 类型/默认值         | 说明 |
|---------------------|---------------------|------|
| cwd                 | string / process.cwd() | 会话工作目录 |
| model               | string              | 指定 AI 模型 |
| pathToQwenExecutable| string              | Qwen CLI 路径，自动探测或自定义 |
| permissionMode      | 'default'\|'plan'\|'auto-edit'\|'yolo' / 'default' | 工具权限模式（详见下文） |
| canUseTool          | CanUseTool          | 工具权限回调，异步自定义允许/拒绝 |
| env                 | Record<string,string>| 传递给 CLI 的环境变量 |
| mcpServers          | Record<string, McpServerConfig> | MCP 服务器配置（支持外部/SDK内嵌）|
| abortController     | AbortController     | 会话中断控制器 |
| debug               | boolean / false     | 是否输出调试日志 |
| maxSessionTurns     | number / -1         | 最大对话轮数 |
| coreTools           | string[]            | 仅启用指定工具 |
| excludeTools        | string[]            | 排除指定工具（最高优先级）|
| allowedTools        | string[]            | 自动允许指定工具 |
| authType            | 'openai'\|'qwen-oauth' | 认证类型 |
| agents              | SubagentConfig[]    | 子代理配置 |
| includePartialMessages | boolean / false   | 是否流式输出部分消息 |
| resume              | string              | 恢复指定 session |
| timeout             | object              | 各类超时配置（见下）|

#### timeout 配置
- canUseTool: 工具权限回调超时（默认 60000ms）
- mcpRequest: SDK MCP 工具调用超时（默认 60000ms）
- controlRequest: 控制请求超时（默认 60000ms）
- streamClose: 多轮模式下关闭 stdin 前等待超时（默认 60000ms）

### 1.3 权限模式与优先级

1. `excludeTools`（最高优先级，直接拒绝）
2. `permissionMode: 'plan'`（阻断写操作工具）
3. `permissionMode: 'yolo'`（全部自动允许）
4. `allowedTools`（自动允许匹配工具）
5. `canUseTool`（自定义回调）
6. 默认行为（SDK 模式下自动拒绝写操作）

### 1.4 Query 实例方法

- `async next()`/`[Symbol.asyncIterator]()`：异步迭代消息流（SDKUserMessage/SDKAssistantMessage/SDKResultMessage/SDKSystemMessage/SDKPartialAssistantMessage）
- `async streamInput(messages: AsyncIterable<SDKUserMessage>)`：多轮输入流式发送
- `async close()`：关闭会话，释放资源
- `async interrupt()`：中断当前操作
- `async setPermissionMode(mode: string)`：动态切换权限模式
- `async setModel(model: string)`：动态切换模型
- `async supportedCommands()`：查询 CLI 支持的控制命令
- `async mcpServerStatus()`：查询 MCP 服务器状态
- `getSessionId()`：获取当前会话 ID
- `isClosed()`：会话是否已关闭

---

## 2. 消息类型与流式消费

- `SDKUserMessage`：用户输入
- `SDKAssistantMessage`：AI 回复
- `SDKSystemMessage`：系统信息（如工具/模型/环境变更）
- `SDKResultMessage`：最终结果（success/error）
- `SDKPartialAssistantMessage`：流式部分消息（如 token/块增量）

可用 type guard：
```typescript
import {
  isSDKUserMessage,
  isSDKAssistantMessage,
  isSDKSystemMessage,
  isSDKResultMessage,
  isSDKPartialAssistantMessage,
} from '@qwen-code/sdk';
```

---

## 3. 工具与 MCP 服务器扩展

- 支持外部 MCP 服务器（stdio/SSE/HTTP/WebSocket）
- 支持 SDK 内嵌 MCP 服务器（`createSdkMcpServer` + `tool`）
- 工具权限可通过 `canUseTool` 回调精细控制

---

## 4. 典型用法示例

### 单轮对话
```typescript
import { query } from '@qwen-code/sdk';
const result = query({ prompt: 'Hello world' });
for await (const msg of result) {
  // 消费消息流
}
```

### 多轮对话
```typescript
import { query, type SDKUserMessage } from '@qwen-code/sdk';
async function* gen() {
  yield { type: 'user', session_id: 'sid', message: { role: 'user', content: 'A' }, parent_tool_use_id: null };
  yield { type: 'user', session_id: 'sid', message: { role: 'user', content: 'B' }, parent_tool_use_id: null };
}
const result = query({ prompt: gen() });
for await (const msg of result) {
  // 消费消息流
}
```

### 工具权限回调
```typescript
import { query, type CanUseTool } from '@qwen-code/sdk';
const canUseTool: CanUseTool = async (tool, input) => {
  if (tool.startsWith('read_')) return { behavior: 'allow', updatedInput: input };
  return { behavior: 'deny', message: '不允许写操作' };
};
const result = query({ prompt: '写文件', options: { canUseTool } });
```

### SDK 内嵌 MCP 服务器
```typescript
import { tool, createSdkMcpServer, query } from '@qwen-code/sdk';
const myTool = tool('echo', 'Echo', { text: z.string() }, async (args) => ({ content: [{ type: 'text', text: args.text }] }));
const server = createSdkMcpServer({ name: 'echo', tools: [myTool] });
const result = query({ prompt: 'echo hello', options: { mcpServers: { echo: server } } });
```

---

## 5. 错误与中断处理

- `AbortError`：会话被中断时抛出
- `isAbortError`：类型守卫
- `close()`/`abortController.abort()`：主动关闭/中断

---

## 6. 参考
- 详见 `README.md`、`src/query/Query.ts`、`src/types/types.ts`、`src/types/protocol.ts`
- 变更日志见根目录 `CHANGELOG.md`

---

如需更细致的类型、参数、消息结构说明，请查阅源码注释与类型定义。
