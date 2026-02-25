# Chat UI Components

Reusable, pure UI components for building AI chat interfaces. All components are **presentational only** — they receive data via props and contain no business logic, state management, or API calls.

## Components

### `ChatPanel`

A layout container that composes header, message list, and input into a vertical chat panel.

```tsx
import { ChatPanel } from '@/components/chat';

<ChatPanel
  header={<YourChatHeader />}
  messageList={<YourMessageList />}
  input={<YourChatInput />}
  widthClass="w-[480px]"  // optional, default: 'w-[480px]'
  className=""             // optional, extra CSS classes
/>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `header` | `ReactNode` | ✅ | — | Header area (title, toolbar, etc.) |
| `messageList` | `ReactNode` | ✅ | — | Scrollable message list area |
| `input` | `ReactNode` | ✅ | — | Chat input area |
| `widthClass` | `string` | — | `'w-[480px]'` | Tailwind width class |
| `className` | `string` | — | `''` | Additional CSS classes |

---

### `UserMessageBubble`

Displays a user message as a blue bubble, with optional attached file badges.

```tsx
import { UserMessageBubble } from '@/components/chat';

<UserMessageBubble
  content="Hello, please help me build a React app"
  attachedFiles={[
    { id: '1', name: 'App.tsx', path: 'src/App.tsx', content: '...', size: 1024 },
  ]}
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | ✅ | Message text content |
| `attachedFiles` | `AttachedFileItem[]` | — | Files/folders attached to this message |

---

### `AssistantMessageBubble`

Displays an AI assistant message with Markdown rendering (supports GFM tables, code blocks, links, etc.).

```tsx
import { AssistantMessageBubble } from '@/components/chat';

<AssistantMessageBubble content="Here is your **React** component:" />
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | ✅ | Markdown content to render |

---

### `StreamingIndicator`

Shows a streaming/typing indicator. Displays bouncing dots when content is empty, or the content with a "Typing..." animation when content is available.

```tsx
import { StreamingIndicator } from '@/components/chat';

// Empty — shows bouncing dots
<StreamingIndicator content="" />

// With content — shows content + "Typing..." indicator
<StreamingIndicator content="I'm generating your code..." />

// With custom children — wraps your component with the typing indicator
<StreamingIndicator content="...">
  <YourCustomComponent />
</StreamingIndicator>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `content` | `string` | ✅ | Streaming text content. Empty string shows bouncing dots. |
| `children` | `ReactNode` | — | Custom content to display instead of default Markdown rendering |

---

### `AttachedFilesDisplay`

Displays attached files and folders as compact badges. Automatically groups files by folder. Supports optional remove buttons.

```tsx
import { AttachedFilesDisplay } from '@/components/chat';

// Read-only display (e.g. in message history)
<AttachedFilesDisplay attachedFiles={files} />

// Interactive with remove buttons (e.g. in chat input)
<AttachedFilesDisplay
  attachedFiles={files}
  onFileRemoved={(fileId) => removeFile(fileId)}
  onFolderRemoved={(folderName) => removeFolder(folderName)}
  className="mb-3 px-4"
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `attachedFiles` | `AttachedFileItem[]` | ✅ | Array of files/folders to display |
| `onFileRemoved` | `(fileId: string) => void` | — | Callback when a file remove button is clicked |
| `onFolderRemoved` | `(folderName: string) => void` | — | Callback when a folder remove button is clicked |
| `removable` | `boolean` | — | Force show/hide remove buttons. Auto-detected from callbacks. |
| `className` | `string` | — | Additional CSS classes |

---

## Types

### `AttachedFileItem`

```typescript
interface AttachedFileItem {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  isFolder?: boolean;
  folderName?: string;
  fileCount?: number;
}
```

---

## Full Example

```tsx
import {
  ChatPanel,
  UserMessageBubble,
  AssistantMessageBubble,
  StreamingIndicator,
  AttachedFilesDisplay,
} from '@/components/chat';

function MyChatApp() {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');

  return (
    <ChatPanel
      header={<div className="p-4 font-bold">My AI Chat</div>}
      messageList={
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <UserMessageBubble
                  content={msg.content}
                  attachedFiles={msg.files}
                />
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <AssistantMessageBubble content={msg.content} />
              </div>
            )
          )}
          {streamingContent && (
            <div className="flex justify-start">
              <StreamingIndicator content={streamingContent} />
            </div>
          )}
        </div>
      }
      input={<div className="p-4 border-t">Your input component here</div>}
    />
  );
}
```

---

## Dependencies

- **Tailwind CSS** — All styling uses Tailwind utility classes with dark mode support
- **lucide-react** — Icons (File, Folder, X)
- **react-markdown** + **remark-gfm** — Markdown rendering in `AssistantMessageBubble`

---

# 聊天 UI 组件

可复用的纯 UI 组件，用于构建 AI 聊天界面。所有组件都是**纯展示组件**——通过 props 接收数据，不包含任何业务逻辑、状态管理或 API 调用。

## 组件列表

### `ChatPanel` — 聊天面板容器

将 header、消息列表和输入框组合为一个垂直布局的聊天面板。

```tsx
import { ChatPanel } from '@/components/chat';

<ChatPanel
  header={<你的聊天头部 />}
  messageList={<你的消息列表 />}
  input={<你的输入框 />}
  widthClass="w-[480px]"  // 可选，默认 'w-[480px]'
/>
```

**属性：**

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `header` | `ReactNode` | ✅ | — | 头部区域（标题、工具栏等） |
| `messageList` | `ReactNode` | ✅ | — | 可滚动的消息列表区域 |
| `input` | `ReactNode` | ✅ | — | 聊天输入区域 |
| `widthClass` | `string` | — | `'w-[480px]'` | Tailwind 宽度类名 |
| `className` | `string` | — | `''` | 额外的 CSS 类名 |

---

### `UserMessageBubble` — 用户消息气泡

以蓝色气泡展示用户消息，可选展示附件文件标签。

```tsx
import { UserMessageBubble } from '@/components/chat';

<UserMessageBubble
  content="你好，请帮我创建一个 React 应用"
  attachedFiles={[
    { id: '1', name: 'App.tsx', path: 'src/App.tsx', content: '...', size: 1024 },
  ]}
/>
```

**属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | `string` | ✅ | 消息文本内容 |
| `attachedFiles` | `AttachedFileItem[]` | — | 附加的文件/文件夹列表 |

---

### `AssistantMessageBubble` — AI 助手消息气泡

展示 AI 助手的消息，内置 Markdown 渲染（支持 GFM 表格、代码块、链接等）。

```tsx
import { AssistantMessageBubble } from '@/components/chat';

<AssistantMessageBubble content="这是你的 **React** 组件：" />
```

**属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | `string` | ✅ | 要渲染的 Markdown 内容 |

---

### `StreamingIndicator` — 流式响应指示器

展示流式/打字中的指示器。内容为空时显示跳动圆点，有内容时显示内容加 "Typing..." 动画。

```tsx
import { StreamingIndicator } from '@/components/chat';

// 空内容 — 显示跳动圆点
<StreamingIndicator content="" />

// 有内容 — 显示内容 + "Typing..." 指示器
<StreamingIndicator content="正在生成代码..." />

// 自定义子组件 — 用打字指示器包裹你的组件
<StreamingIndicator content="...">
  <你的自定义组件 />
</StreamingIndicator>
```

**属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | `string` | ✅ | 流式文本内容。空字符串显示跳动圆点。 |
| `children` | `ReactNode` | — | 自定义内容，替代默认的 Markdown 渲染 |

---

### `AttachedFilesDisplay` — 附件文件展示

以紧凑标签的形式展示附件文件和文件夹。自动按文件夹分组。支持可选的删除按钮。

```tsx
import { AttachedFilesDisplay } from '@/components/chat';

// 只读展示（如在消息历史中）
<AttachedFilesDisplay attachedFiles={files} />

// 带删除按钮的交互模式（如在聊天输入框中）
<AttachedFilesDisplay
  attachedFiles={files}
  onFileRemoved={(fileId) => removeFile(fileId)}
  onFolderRemoved={(folderName) => removeFolder(folderName)}
  className="mb-3 px-4"
/>
```

**属性：**

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `attachedFiles` | `AttachedFileItem[]` | ✅ | 要展示的文件/文件夹数组 |
| `onFileRemoved` | `(fileId: string) => void` | — | 点击文件删除按钮时的回调 |
| `onFolderRemoved` | `(folderName: string) => void` | — | 点击文件夹删除按钮时的回调 |
| `removable` | `boolean` | — | 强制显示/隐藏删除按钮。默认根据回调自动判断。 |
| `className` | `string` | — | 额外的 CSS 类名 |

---

## 类型定义

### `AttachedFileItem`

```typescript
interface AttachedFileItem {
  id: string;       // 唯一标识
  name: string;     // 文件名
  path: string;     // 文件路径
  content: string;  // 文件内容
  size: number;     // 文件大小（字节）
  isFolder?: boolean;    // 是否为文件夹
  folderName?: string;   // 所属文件夹名称
  fileCount?: number;    // 文件夹中的文件数量
}
```

---

## 完整示例

```tsx
import {
  ChatPanel,
  UserMessageBubble,
  AssistantMessageBubble,
  StreamingIndicator,
  AttachedFilesDisplay,
} from '@/components/chat';

function MyChatApp() {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');

  return (
    <ChatPanel
      header={<div className="p-4 font-bold">我的 AI 聊天</div>}
      messageList={
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <UserMessageBubble
                  content={msg.content}
                  attachedFiles={msg.files}
                />
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <AssistantMessageBubble content={msg.content} />
              </div>
            )
          )}
          {streamingContent && (
            <div className="flex justify-start">
              <StreamingIndicator content={streamingContent} />
            </div>
          )}
        </div>
      }
      input={<div className="p-4 border-t">你的输入组件</div>}
    />
  );
}
```

---

## 依赖

- **Tailwind CSS** — 所有样式使用 Tailwind 工具类，支持暗色模式
- **lucide-react** — 图标（File、Folder、X）
- **react-markdown** + **remark-gfm** — `AssistantMessageBubble` 中的 Markdown 渲染
