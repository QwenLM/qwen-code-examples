# 使用 Node.js 20 Slim 版本作为基础镜像
# Slim 版本比 Alpine 稍微大一点，但在兼容性（特别是构建工具和 C++ 扩展）方面更好
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# -----------------------------------------------------------------------------
# 更换 apt 软件源（解决公司内网无法访问 deb.debian.org 问题）
# 使用 HTTPS 协议的阿里云源，防止公司内网 HTTP 劫持/拦截
# -----------------------------------------------------------------------------
RUN sed -i 's/http:\/\/deb.debian.org/https:\/\/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/http:\/\/security.debian.org/https:\/\/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# -----------------------------------------------------------------------------
# 安装系统级依赖
# 因为这个镜像将作为用戶代码的执行环境（Terminal），所以必须预装常用开发工具
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    nano \
    vim \
    python3 \
    python-is-python3 \
    make \
    g++ \
    build-essential \
    openssh-client \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# NPM 全局配置优化 (关键修复)
# 1. 设置淘宝镜像源，确保国内安装成功率
# 2. 预装全局 vite 和 concurrently 作为兜底，防止项目依赖没装好时报错
# -----------------------------------------------------------------------------
RUN npm config set registry https://registry.npmmirror.com/ \
    && npm install -g vite concurrently

# -----------------------------------------------------------------------------
# 构建项目
# -----------------------------------------------------------------------------

# 1. 先复制依赖文件，利用 Docker 缓存层
COPY package*.json ./

# 2. 安装项目依赖
RUN npm install

# 3. 复制项目所有源代码
COPY . .

# 4. 构建 Next.js 应用
# 注意：这会生成 .next 目录
RUN npm run build

# -----------------------------------------------------------------------------
# 运行时配置
# -----------------------------------------------------------------------------

# 设置环境变量为生产模式
ENV NODE_ENV=production
# 禁用 Next.js 的遥测数据收集
ENV NEXT_TELEMETRY_DISABLED=1

# 暴露端口 3000
EXPOSE 3000

# 启动命令
# 必须使用 server.js 启动，因为只有它包含了 Terminal 所需的 Socket.IO 和 Proxy 逻辑
# 不要使用 "npm start" 除非你也修改了 package.json 中的 start 脚本为 "node server.js"
CMD ["node", "server.js"]
