# City Running - 城市跑步游戏实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 cyble-city 项目复制创建 city-running，改造成第三人称城市跑步游戏

**Architecture:** 复用现有 Three.js 场景管理、建筑生成、街道家具代码，改造人物控制为自动前进+左右移动+跳跃，添加收集物系统，设计固定城市布局

**Tech Stack:** Three.js r163, JavaScript (单文件), GLTFLoader, AnimationMixer

---

## 文件结构概览

**项目根目录**: `demo-3.6plus/city-running/`

| 文件 | 职责 | 来源 |
|------|------|------|
| `index.html` | 主入口，HTML 结构 + CSS 样式 | 从 cyble-city 复制并修改 |
| `game.js` | 全部游戏逻辑 | 从 cyble-city 复制并大幅改造 |
| `README.md` | 项目文档 | 新建 |

**代码模块划分**（game.js 内部）:
- SceneManager: 场景初始化、光照、雾效
- CityGenerator: 道路网络、建筑布置、街道家具
- PlayerController: 人物控制（跑步、跳跃、边界）
- CollectibleManager: 收集物生成、碰撞检测、分数
- CameraController: 第三人称追尾相机
- HUD: 界面更新

---

### Task 1: 复制项目并清理基础代码

**Files:**
- Create: `demo-3.6plus/city-running/index.html`
- Create: `demo-3.6plus/city-running/game.js`
- Create: `demo-3.6plus/city-running/README.md`
- Create: `demo-3.6plus/city-running/.gitignore`

- [ ] **Step 1: 复制 cyble-city 项目**

```bash
cd /Users/joeytoday/github-repo/qwen-code-examples/demo-3.6plus
cp -r cyble-city city-running
cd city-running
rm -rf .worktrees ref-city
rm index.html.p5-backup
```

- [ ] **Step 2: 修改 index.html 标题和 HUD**

修改内容：
- 标题改为 "City Running - 城市跑步"
- 开始界面："CITY RUNNING" + "在城市中奔跑" + "开始奔跑" 按钮
- HUD：分数计数器（左上）、速度表（右上）、跳跃提示（底部中央）、相机模式（右上）
- 控制说明改为：A/D 左右移动、SPACE 跳跃、R 重置、C 相机
- 背景色改为浅蓝色天空渐变
- 移除小地图相关 HTML

- [ ] **Step 3: 创建 .gitignore 和 README.md**

.gitignore:
```
.DS_Store
*.log
node_modules/
```

README.md 包含游戏说明、控制方式、技术栈、运行方法

- [ ] **Step 4: 提交**

```bash
git add city-running/
git commit -m "feat: create city-running project from cyble-city"
```

---

### Task 2: 清理 game.js 并保留复用代码

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 保留以下函数**

从 cyble-city/game.js 保留：
- 所有导入语句
- COLORS 常量（新增 collectibleGold: '#FFD700', collectibleBlue: '#4A90E2'）
- `setupLight()`
- `createGround()`（修改背景色为 0x87ceeb）
- 所有建筑生成函数（10 种）
- 所有街道家具函数（11 种）
- 车辆函数（3 种）
- `loadModel()`, `mkPlaceholder()`
- `animate()`, `setupEvents()`, `updateHUD()`, `updateCamera()`
- `updateAnim()`, `fadeTo()`

- [ ] **Step 2: 删除以下函数**

删除：
- `createTrack()`, `mkBorder()`
- `createObs()`, `createCPs()`
- `updateCar()`, `drawMinimap()`, `resetCar()`
- 所有 RC 车相关状态变量
- 漂移相关代码
- 小地图相关代码

- [ ] **Step 3: 修改常量定义**

```javascript
const CITY_SIZE = 400;
const ROAD_WIDTH = 20;
const SIDE_ROAD_WIDTH = 12;
const SIDEWALK_WIDTH = 5;

const MAX_SPEED = 7.5;
const BASE_SPEED = 5.0;
const LATERAL_SPEED = 4.0;
const JUMP_HEIGHT = 2.5;
const JUMP_DURATION = 0.6;
const GRAVITY = 9.8;
```

- [ ] **Step 4: 修改状态变量**

```javascript
let started = false, scene, camera, renderer, clock, player, mixer;
let acts = {}, curAnim = 'idle';
let score = 0;
let collectibles = [];
let camMode = 0;
const playerState = { x: 0, z: 0, y: 0, vy: 0, isJumping: false, jumpTime: 0, heading: 0 };
const keys = {};
const camState = { x: 0, y: 20, z: -30, lx: 0, ly: 3, lz: 0 };
```

- [ ] **Step 5: 提交**

```bash
git add city-running/game.js
git commit -m "refactor: clean up game.js and keep reusable code"
```

---

### Task 3: 实现城市道路网络

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 实现 createRoadNetwork()**

创建：
- 主干道（沿 Z 轴，宽 20，长 400）
- 3 条横向街道（Z = -100, 0, 100，宽 12）
- 人行道（道路两侧，宽 5）
- 道路中心线（白色虚线）
- 返回道路信息用于后续布置

- [ ] **Step 2: 修改 init() 调用**

替换 `createTrack()` 为 `createRoadNetwork()`
移除 `createObs()` 和 `createCPs()`
修改场景背景色为 0x87ceeb
修改雾效为 `new THREE.Fog(0x87ceeb, 100, 400)`

- [ ] **Step 3: 提交**

```bash
git add city-running/game.js
git commit -m "feat: implement road network for city running"
```

---

### Task 4: 实现城市建筑布置

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 重写 createScenery()**

改为网格状城市布局：
- 沿主干道两侧布置建筑（X = ±25 到 ±40）
- 每隔 40 单位放置一栋建筑
- 跳过横向街道交叉口
- 随机选择建筑类型和颜色
- 总共约 30-40 栋建筑

- [ ] **Step 2: 实现 addStreetFurniture()**

沿道路放置：
- 路灯（每 20 单位）
- 树木（每 30 单位）
- 长椅（每 50 单位）
- 垃圾桶（每 40 单位）
- 消防栓（每 35 单位）

- [ ] **Step 3: 实现 addVehicles()**

在横向街道停放：
- 出租车（每条街 2 辆）
- 警车（每条街 1 辆）
- 公交车（每条街 1 辆）

- [ ] **Step 4: 实现 createCentralPark()**

城市中心（0, 0）创建公园：
- 60x60 草地
- 12 棵树木
- 4 张长椅

- [ ] **Step 5: 提交**

```bash
git add city-running/game.js
git commit -m "feat: implement city building layout and street furniture"
```

---

### Task 5: 实现人物跑步控制

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 实现 updatePlayer()**

逻辑：
- 自动前进：`playerState.z += BASE_SPEED * dt * 10`
- 横向移动：A/D 键控制 X 位置
- 跳跃：SPACE 键触发，应用重力模拟
- 边界限制：X 钳位在道路宽度内
- 更新人物模型位置和旋转

- [ ] **Step 2: 实现 updatePlayerAnim()**

根据状态选择动画：
- 跳跃时：run 动画
- 正常前进：run 动画（BASE_SPEED > 2）
- 平滑过渡（fadeTo 0.3s）

- [ ] **Step 3: 修改 loadModel()**

- `car` 改为 `player`
- 缩放从 3 改为 1.5
- 错误处理调用 `mkPlayerPlaceholder()`

- [ ] **Step 4: 实现 mkPlayerPlaceholder()**

简单人物占位符：
- 圆柱体身体
- 球体头部
- 适当缩放

- [ ] **Step 5: 实现 resetPlayer()**

重置所有玩家状态到初始位置

- [ ] **Step 6: 提交**

```bash
git add city-running/game.js
git commit -m "feat: implement player running controller"
```

---

### Task 6: 实现相机系统

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 实现 updateCamera()**

三种视角模式：
1. 追尾视角（默认）：人物后上方 45 度，距离 30，高度 20
2. 侧视角：人物侧面 90 度
3. 俯视视角：正上方垂直向下

平滑跟随：lerp 0.08
相机始终看向人物前方

- [ ] **Step 2: 修改 setupEvents()**

C 键切换相机模式（0→1→2→0 循环）
更新相机模式指示器文本

- [ ] **Step 3: 提交**

```bash
git add city-running/game.js
git commit -m "feat: implement third-person chase camera"
```

---

### Task 7: 实现收集物系统

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`

- [ ] **Step 1: 实现 createCollectibles()**

在道路上生成能量球：
- 普通收集物（金色）：沿主干道每 15 单位一个，+10 分
- 特殊收集物（蓝色）：需要跳跃获取的高处，每 50 单位一个，+50 分
- 使用发光球体（SphereGeometry + emissive material）
- 添加旋转和上下浮动动画

- [ ] **Step 2: 实现 checkCollectibleCollision()**

检测人物与收集物的距离：
- 距离 < 2 单位即收集
- 播放收集特效（粒子效果或简单缩放动画）
- 更新分数
- 从场景移除收集物

- [ ] **Step 3: 修改 updatePlayer()**

在每帧更新中调用 `checkCollectibleCollision()`

- [ ] **Step 4: 实现 collectible 动画更新**

在 `animate()` 中：
- 遍历所有收集物
- 应用旋转（`rotation.y += 0.02`）
- 应用浮动（`position.y = baseY + Math.sin(time * 2) * 0.3`）

- [ ] **Step 5: 提交**

```bash
git add city-running/game.js
git commit -m "feat: implement collectible system with scoring"
```

---

### Task 8: 实现 HUD 和界面

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`
- Modify: `demo-3.6plus/city-running/index.html`

- [ ] **Step 1: 实现 updateHUD()**

更新界面元素：
- 分数计数器：`#score-value`
- 速度表：`#speed-value`（m/s → km/h 转换）
- 跳跃提示：跳跃时显示 "跳跃中"
- 相机模式：`#cam-indicator`（"追尾视角"/"侧视角"/"俯视视角"）

- [ ] **Step 2: 修改 setupEvents()**

开始按钮点击：
- 隐藏开始界面
- 显示 HUD
- 设置 `started = true`
- 调用 `createCollectibles()`

R 键重置：
- 调用 `resetPlayer()`
- 分数归零

- [ ] **Step 3: 修改 animate()**

移除 `drawMinimap()` 调用
确保 `updatePlayer()`, `updateCamera()`, `updateHUD()` 正确调用

- [ ] **Step 4: 提交**

```bash
git add city-running/game.js city-running/index.html
git commit -m "feat: implement HUD and UI updates"
```

---

### Task 9: 优化和打磨

**Files:**
- Modify: `demo-3.6plus/city-running/game.js`
- Modify: `demo-3.6plus/city-running/index.html`

- [ ] **Step 1: 性能优化**

- 确保阴影质量适中（1024x1024）
- 限制雾效距离
- 优化建筑数量（最多 40 栋）
- 测试 60 FPS 稳定性

- [ ] **Step 2: 视觉优化**

- 调整光照亮度和角度
- 优化建筑颜色搭配
- 确保收集物明显可见
- 相机跟随平滑度调整

- [ ] **Step 3: 游戏体验优化**

- 跳跃手感调优（重力、高度、持续时间）
- 横向移动响应速度
- 边界碰撞反馈
- 收集特效明显度

- [ ] **Step 4: 测试完整游戏流程**

1. 打开页面
2. 点击"开始奔跑"
3. 人物自动前进
4. 测试左右移动
5. 测试跳跃
6. 收集能量球
7. 切换相机视角
8. 重置位置

- [ ] **Step 5: 提交**

```bash
git add city-running/
git commit -m "polish: optimize performance, visuals, and game feel"
```

---

### Task 10: 最终测试和文档更新

**Files:**
- Modify: `demo-3.6plus/city-running/README.md`

- [ ] **Step 1: 更新 README.md**

包含：
- 游戏截图描述
- 完整的游戏特性列表
- 控制说明
- 技术细节
- 运行方法
- 已知问题和限制

- [ ] **Step 2: 最终测试**

完整游戏流程测试：
- 加载时间 < 3 秒
- 60 FPS 稳定
- 所有控制正常工作
- 收集物系统正常
- 相机切换流畅
- 无控制台错误

- [ ] **Step 3: 提交**

```bash
git add city-running/
git commit -m "docs: update README and finalize project"
```

---

## 自审检查

### 1. 规范覆盖
- ✅ 城市布局：Task 3-4 实现道路网络和建筑布置
- ✅ 人物控制：Task 5 实现跑步、跳跃、边界
- ✅ 相机系统：Task 6 实现三种视角
- ✅ 收集物系统：Task 7 实现生成、碰撞、分数
- ✅ HUD 界面：Task 8 实现所有 UI 元素
- ✅ 优化打磨：Task 9-10 性能和视觉优化

### 2. 占位符扫描
- ✅ 无 "TBD"、"TODO"、"implement later"
- ✅ 所有步骤包含具体代码或明确描述
- ✅ 无 "Similar to Task N"

### 3. 类型一致性
- ✅ `player` 变量在所有任务中一致
- ✅ `playerState` 结构一致
- ✅ 函数命名一致（`updatePlayer`, `updateCamera`, `updateHUD`）

---

## 执行建议

**推荐方式**：使用 subagent-driven-development
- 每个 Task 分配一个子代理
- 完成后审查代码质量
- 快速迭代，频繁提交

**备选方式**：inline execution
- 在当前会话依次执行每个 Task
- 每 2-3 个 Task 检查一次
