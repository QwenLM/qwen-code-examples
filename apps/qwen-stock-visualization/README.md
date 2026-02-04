# 股票数据实时可视化系统

这是一个直观、交互性强且个性化的股票数据可视化与模拟投资平台。

## 功能特性

- 用户身份认证（注册、登录）
- 个性化股票仪表盘
- 实时股票价格可视化
- 自选股管理
- 模拟交易功能
- 投资组合管理
- 收益追踪与分析

## 技术栈

- Next.js 14+
- React
- Supabase (PostgreSQL数据库、身份验证)
- Tailwind CSS
- Recharts (数据可视化)

## 快速开始

### 1. 环境配置

首先，您需要在 Supabase 上创建一个项目并获取以下凭据：

- `NEXT_PUBLIC_SUPABASE_URL` - 你的 Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 你的 Supabase 匿名密钥

### 2. 数据库设置

**重要提示：** 你需要手动创建数据库表结构。本项目提供了数据库迁移文件，位于 `supabase/migrations/000001_init_simple_schema.sql`。

你可以通过以下方式之一来创建数据库表：

**选项 A：使用 Supabase CLI**
```bash
# 安装 Supabase CLI 后执行
supabase db push
```

**选项 B：手动执行 SQL**
1. 登录到你的 Supabase 项目控制台
2. 转到 SQL 编辑器
3. 复制并执行 `supabase/migrations/000001_init_simple_schema.sql` 文件中的所有 SQL 语句

### 3. 安装依赖

```bash
npm install
```

### 3. 环境变量配置

复制 `.env.local.example` 文件并填入您的 Supabase 凭据：

```bash
cp .env.local.example .env.local
# 编辑 .env.local 文件并添加您的 Supabase 凭据
```

### 4. 运行开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 上启动。

### 5. 填充模拟数据（可选）

如果您想用模拟数据测试应用，请运行：

```bash
npm run populate-mock-data
```

注意：运行此命令前，请确保您已在 `.env.local` 中设置了正确的 Supabase 凭据。

## 项目结构

```
supabase-demo-stock/
├── app/                 # Next.js 14+ App Router 页面
├── components/          # React 组件
├── lib/                # 工具函数和数据访问层
├── scripts/             # 实用脚本
├── supabase/           # Supabase 配置和迁移
└── ...
```

## 数据库模式

系统包含以下核心表：

- `stocks` - 股票基础信息
- `stock_prices` - 股票实时价格
- `profiles` - 用户资料
- `watchlists` - 自选股列表
- `portfolios` - 模拟投资组合
- `portfolio_positions` - 持仓信息
- `portfolio_transactions` - 交易记录

## 安全特性

- 使用 Supabase 行级安全 (RLS) 保护用户数据
- 用户只能访问自己的数据
- 所有数据库操作都经过适当验证

## 部署

要构建生产版本：

```bash
npm run build
npm start
```

或者使用 Vercel 一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/stock-visualization-demo)