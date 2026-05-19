# 飞走的情书 Letter Flying Poster

> 打字机逐字打出 Steve Jobs "Think Different" 演讲全文，所有 "o" 字母脱离文字变成气球，拉着引线飘向页面上方，最终整段文本被气球牵引着飘出屏幕，留下居中的 "Think Different." 标题。
> A typewriter types out Steve Jobs' "Think Different" speech. Every "o" letter detaches as a balloon, pulling a string upward. Eventually the entire text block is carried off-screen by the balloons, leaving only "Think Different." fading in at center.

---

## 开发提示词 Development Prompt

使用 `/skills brainstorming` 启动开发时，参考以下需求：

```
我想要做一个 p5.js 单页动画海报，参考视频效果：
- 竖版画布 720×1080
- 背景是泛黄纸张纹理（Perlin 噪声 + 暗角）
- 使用 Google Fonts "Special Elite" 打字机字体
- 文本从底部开始，打字机效果逐字出现（50ms/字）
- 打字完成后暂停 3 秒
- 所有 "o" 字母脱离文本，变成气球飘向上方
  - 每个 "o" 间隔 300ms 依次启动
  - 气球放大 1×→3×，带正弦左右摆动
  - 气球有贝塞尔曲线连接线（弹性绳子效果）
  - 连接线拉伸时变细变淡，松弛时变粗变浓
- Phase 1：气球单独上升，文本不动
- Phase 2：所有气球越过中线后，弹簧物理牵引文本一起上升
  - 弹簧常数 0.002，阻尼 0.90
  - 有机加速-减速运动
- Phase 3：所有内容完全移出屏幕后，"Think Different." 在居中淡入（1.5s）
- 气球移出屏幕后不再出现
- 响应式缩放适配不同视口
- 性能优化：p.pixelDensity(1)，预渲染背景到 p5.Graphics
```

---

## 快速开始 Quick Start

### 直接在浏览器中打开

```bash
# macOS
open 3.6plus-demo/letter-flying/index.html

# 或任意浏览器拖入 index.html
```

无需构建工具，无需 npm install。单文件即可运行。

No build tools, no npm install. Single HTML file runs directly.

---

## 动画流程 Animation Flow

```
页面加载 ──→ [打字机 逐字] ──→ [暂停 3s] ──→ [气球 Cascade 300ms间隔]
  Load         Typewriter         Pause          Balloon Cascade

──→ [Phase 1 气球上升] ──→ [Phase 2 弹簧牵引文本] ──→ [Phase 3 居中淡入]
     Balloons Rise          Spring Pulls Text        "Think Different." Fade
```

- **打字机 Typewriter** — 字符从底部逐字出现，带 pop-in 缩放动画（1.2→1.0）
  Characters appear one-by-one from bottom with pop-in scale animation
- **暂停 Pause** — 3 秒静止，让观众阅读完整文本
  3-second stillness for audience to read the full text
- **气球 Cascade** — 每个 "o" 间隔 300ms 依次启动，放大 3× 飘向上方随机位置
  Each "o" launches at 300ms intervals, scales 3×, floats to random upper positions
- **Phase 1** — 气球单独上升，文本保持不动
  Balloons rise individually, text stays still
- **Phase 2** — 所有气球越过中线，弹簧物理牵引文本整体上升
  All balloons cross midpoint, spring physics pull entire text block upward
- **Phase 3** — 内容完全消失后，"Think Different." 居中 48px 淡入
  After all content exits, "Think Different." fades in centered at 48px

---

## 技术栈 Tech Stack

- **p5.js 1.9** — 实例模式（instance mode），单文件
- **Google Fonts** — "Special Elite" 打字机字体
- **纯 HTML/CSS/JS** — 零依赖，无构建步骤

---

## 项目结构 Project Structure

```
letter-flying/
├── index.html                    # 单文件应用（HTML + CSS + p5.js 实例模式）
├── README.md                     # 项目文档
└── images/                       # 关键帧参考图
    ├── frame-001.jpg ~ frame-016.jpg   # 动画序列帧
    └── analysis-00.jpg ~ analysis-32.jpg # 分析标注图
```

---

## 性能优化 Performance

| 优化项 Optimization | 说明 Description |
|---|---|
| `p.pixelDensity(1)` | 限制像素密度，避免高 DPI 设备性能开销 |
| 预渲染背景 | Perlin 噪声纸张纹理渲染到 `p5.Graphics`，每帧只 `image()` 一次 |
| 实例模式 | 避免全局命名空间污染，支持多 sketch 共存 |
| 字体加载守卫 | `document.fonts.ready` 确保字体加载后再计算字符位置 |
| 响应式缩放 | `resizeCanvasToFit()` 保持 720×1080 比例适配视口 |

---

## 自定义 Customization

### 修改文本内容 Change Text

```js
// index.html — 修改 FULL_TEXT 数组
const FULL_TEXT = [
  "Your line one here.",
  "Your line two here.",
  // ...
];
```

### 调整打字机速度 Adjust Typewriter Speed

```js
// index.html — 修改常量
const TYPEWRITER_INTERVAL = 30;  // 数值越小越快（毫秒/字）
```

### 调整气球上升速度 Adjust Balloon Rise Speed

```js
// index.html — handleCascade() 中修改
const riseDuration = 2000; // 数值越小越快（毫秒）
```

### 调整弹簧物理参数 Adjust Spring Physics

```js
// index.html — Phase 2 中修改
const springForce = displacement * 0.003; // 增大 = 更快
const damping = 0.88;                     // 减小 = 更少振荡
```

### 更换字体 Change Font

```html
<!-- index.html — 替换 Google Fonts 链接 -->
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap" rel="stylesheet" />
```

```js
// index.html — setup 中修改
p.textFont('Your Font Name');
```

---

## 设计决策 Design Decisions

| 决策 Decision | 原因 Rationale |
|---|---|
| 竖版 720×1080 | 海报比例，适配手机竖屏展示 |
| 弹簧物理代替 lerp | 有机加速-减速运动，更像气球牵引的真实物理 |
| 贝塞尔曲线连接线 | 比直线更有"绳子"的质感 |
| 变量厚度连线 | 拉伸时变细变淡，松弛时变粗变浓 |
| Phase 1/2 分离 | 避免文本过早移动，保持"气球先飘、文本后被拉动"的节奏 |
| 持久化 phase2Triggered | 防止 wobble 导致阈值反复切换产生卡顿 |
| 严格离屏检测 | 确保所有内容消失后再显示 closing 标题 |

---

## 灵感来源 Inspiration

参考视频：[飞走的情书 Ooooooo](https://www.xiaohongshu.com/explore/69a4168e000000000e00e6d6) by 五号博物馆

使用 p5.js + Gemini 制作的动态海报效果：文本从底部打字机出现，"o" 字母脱离变成气球飘向上方，带波浪引线，最终所有文本被带出屏幕。

---

## 许可证 License

MIT
