# ── Stage 1: 构建前端 ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 安装前端依赖
COPY package.json package-lock.json ./
RUN npm ci

# 构建前端（Docker 部署使用根路径 /）
COPY . .
RUN VITE_BASE=/ npm run build


# ── Stage 2: 运行时镜像 ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 安装 nginx
RUN apk add --no-cache nginx

# 安装后端依赖
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# 复制后端代码
COPY server/ ./server/

# 复制前端构建产物
COPY --from=builder /app/dist ./dist

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 复制启动脚本
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 数据目录（挂载 volume 持久化 prompts.json 和 .env）
RUN mkdir -p /data \
  && ln -sf /data/prompts.json /app/prompts.json \
  && ln -sf /data/.env /app/.env

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
