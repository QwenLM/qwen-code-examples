# 便签打印机 Sticky Note Printer

> 输入文字，选择颜色，点击打印——便签就会从打印机里吐出来，落到看板上。
> Type text, pick a color, click Print — a sticky note prints out and lands on the board.

---

## 开发提示词 Development Prompt

使用 `/skills brainstorming` 启动开发时，参考以下需求：

```
我想要做一个网页app，一个拟物的卡片打印机：
- 用户可以在输入框输入文字
- 选择便签颜色
- 点击 Print 按钮后，打印文字为便签样式
- 输出的便签出现在网页的 board 中
- 便签可以在 board 中自由拖动位置
- 便签支持删除（悬停显示 × 按钮）
- 打印机有拟物化外观（机身、出纸口、指示灯）
- 打印过程有动画：纸张滑入 → 文字印上 → 纸张弹出 → 飞向看板
- 看板响应式布局：桌面 4 列 / 平板 2 列 / 手机 1 列
- 手写字体（Google Fonts）
- 6 种便签颜色可选
- 字数限制 100 字，实时计数
```

---

## 快速开始 Quick Start

### 第一步：安装依赖 Step 1 — Install Dependencies

```bash
cd printer
npm install
```

### 第二步：启动开发服务器 Step 2 — Start Dev Server

```bash
npm run dev
```

启动成功后，浏览器会自动打开 http://localhost:5173。

### 第三步：开始使用 Step 3 — Start Using

1. **输入文字** — 在输入框中键入便签内容（最多 100 字）
   **Type text** — Enter your note content (up to 100 characters)
2. **选择颜色** — 点击下方的彩色圆点选择便签颜色
   **Pick a color** — Click a color dot below the input
3. **点击 Print** — 观看打印动画：纸张滑入 → 文字印上 → 纸张弹出 → 飞向看板
   **Click Print** — Watch the animation: paper slides in → text prints → paper ejects → flies to board
4. **拖拽便签** — 看板上的便签可以自由拖动，松手后回到原位
   **Drag notes** — Notes on the board are draggable and snap back on release
5. **删除便签** — 鼠标悬停在便签上，点击右上角 × 删除
   **Delete notes** — Hover a note and click × in the top-right corner

---

## 功能 Features

| 功能 Feature | 说明 Description |
|---|---|
| 🖨️ 拟物化打印机 | 真实的打印机机身、出纸口、指示灯 | Skeuomorphic printer body with paper slot and indicator lights |
| 🎬 四阶段动画 | 滑入 → 打印 → 弹出 → 飞走 | 4-phase animation: insert → print → eject → fly |
| 🎨 6 种便签颜色 | 黄、粉、蓝、绿、紫、橙 | 6 pastel colors: yellow, pink, blue, green, purple, orange |
| ✍️ 手写字体 | Google Fonts「马善政」毛笔字体 | Google Fonts "Ma Shan Zheng" handwriting font |
| 📋 响应式看板 | 桌面 4 列 / 平板 2 列 / 手机 1 列 | Responsive grid: 4 cols desktop / 2 cols tablet / 1 col mobile |
| 🗑️ 删除动画 | 缩小 + 旋转 + 淡出的撕纸效果 | Tear-off animation: shrink + rotate + fade |
| ⚠️ 字数限制 | 100 字上限，实时计数，超限提示 | 100-char limit with live counter and overflow warning |

---

## 技术栈 Tech Stack

- **React 18** + **Vite 6** + **TypeScript**（严格模式）
- **Tailwind CSS 3** — 自定义便签颜色 + 手写字体
- **Framer Motion** — 弹簧物理动画、拖拽、布局过渡
- **lucide-react** — 图标库

---

## 项目结构 Project Structure

```
printer/
├── index.html                    # 入口 HTML + Google Fonts 链接
├── package.json                  # 依赖和脚本
├── vite.config.ts                # Vite 配置
├── tailwind.config.js            # Tailwind 配置（自定义颜色）
├── postcss.config.js             # PostCSS 插件
├── tsconfig.json                 # TypeScript 配置（严格模式）
└── src/
    ├── main.tsx                  # 应用入口（StrictMode 包裹）
    ├── App.tsx                   # 根组件（管理便签状态）
    ├── index.css                 # Tailwind 指令 + 全局样式
    └── components/
        ├── Printer.tsx           # 打印机主体 + 四阶段动画调度
        ├── Paper.tsx             # 纸张动画组件
        ├── NoteInput.tsx         # 输入框 + 字数计数
        ├── ColorPicker.tsx       # 6 色选择器
        ├── PrintButton.tsx       # 打印按钮（含图标和状态）
        ├── Board.tsx             # 响应式看板 + 空状态
        └── StickyNote.tsx        # 可拖拽便签卡片 + 删除动画
```

---

## 动画流程 Animation Flow

```
点击 Print ──→ [滑入 300ms] ──→ [打印 500ms] ──→ [弹出 800ms] ──→ [飞走 600ms] ──→ 便签落到看板
   Click         Insert           Print           Eject           Fly           Note lands on board
```

- **滑入 Inserting** — 纸张从打印机上方滑入出纸口
  Paper slides down into the printer slot
- **打印 Printing** — 文字以手写字体出现在纸张上
  Text appears on the paper in handwriting font
- **弹出 Ejecting** — 纸张带着弹簧效果被推出打印机
  Paper pushes out with spring physics overshoot
- **飞走 Flying** — 纸张向上飘出并淡出，最终出现在看板上
  Paper floats upward and fades, appearing on the board

---

## 生产构建 Production Build

```bash
# 类型检查 + 打包
npm run build

# 本地预览构建结果
npm run preview
```

构建产物在 `printer/dist/` 目录，可部署到任何静态托管服务（Vercel、Netlify、GitHub Pages 等）。

Build output is in `printer/dist/` — deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

---

## 自定义 Customization

### 添加更多颜色 Add More Colors

同时修改两个文件：

```js
// tailwind.config.js — 添加颜色
colors: {
  note: {
    coral: "#fecaca",  // 新增颜色
  },
},
```

```tsx
// ColorPicker.tsx — 添加到颜色数组
{ name: "coral", hex: "#fecaca" },
```

### 修改字数限制 Change Character Limit

```tsx
// NoteInput.tsx — 修改常量
const MAX_CHARS = 200;  // 改为 200

// Printer.tsx — 同步修改 canPrint 判断
const canPrint = text.trim().length > 0 && text.length <= 200;
```

### 调整动画速度 Adjust Animation Speed

```ts
// Printer.tsx — 修改 PHASE_TIMING（单位：毫秒）
const PHASE_TIMING = {
  inserting: 300,   // 数值越大越慢
  printing: 500,
  ejecting: 800,
  flying: 600,
};
```

### 更换手写字体 Change Handwriting Font

```html
<!-- index.html — 替换 Google Fonts 链接 -->
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap" rel="stylesheet" />
```

```js
// tailwind.config.js — 更新字体配置
fontFamily: {
  handwriting: ["'Your Font Name'", "cursive"],
},
```

---

## 常见问题 FAQ

**Q: 启动时报错怎么办？**
A: 确保 Node.js 版本 ≥ 18，运行 `npm install` 安装完所有依赖后再启动。

**Q: 便签上的文字不显示？**
A: 需要联网加载 Google Fonts。如果网络受限，可以下载字体文件到本地。

**Q: 刷新页面后便签消失了？**
A: 这是预期行为。当前版本不做持久化存储，刷新页面会清空所有便签。

---

## 许可证 License

MIT
