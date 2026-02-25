#!/bin/sh
set -e

# 初始化数据文件
if [ ! -f /data/prompts.json ]; then
  echo "[]" > /data/prompts.json
fi

# 启动 Express 后端（后台）
echo "[entrypoint] 启动后端服务..."
node /app/server/index.js &

# 启动 Nginx（前台，保持容器运行）
echo "[entrypoint] 启动 Nginx..."
exec nginx -g "daemon off;"
