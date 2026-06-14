#!/bin/bash
set -e

echo "================================================"
echo "  药企展厅访客预约系统 - 启动脚本"
echo "================================================"

MODE=${1:-"dev"}

case $MODE in
  dev)
    echo "→ 开发模式启动（热更新）"
    if [ ! -d "node_modules" ]; then
      echo "→ 首次启动，安装依赖..."
      npm install --no-audit --no-fund
    fi
    echo "→ 启动开发服务器 http://localhost:5173"
    exec npm run dev
    ;;
  build)
    echo "→ 生产构建..."
    if [ ! -d "node_modules" ]; then
      echo "→ 安装依赖..."
      npm install --no-audit --no-fund
    fi
    npm run build
    echo "→ 构建完成！产物在 dist/ 目录"
    ;;
  preview)
    echo "→ 生产预览模式"
    if [ ! -d "dist" ]; then
      echo "→ 未检测到构建产物，先执行构建..."
      $0 build
    fi
    echo "→ 启动预览服务器 http://localhost:4173"
    exec npm run preview
    ;;
  docker)
    echo "→ Docker Compose 方式启动"
    docker compose up -d --build
    echo "→ 容器启动完成"
    echo "→ 访问: http://localhost:4173"
    docker compose ps
    ;;
  docker-logs)
    echo "→ 查看容器日志"
    docker compose logs -f
    ;;
  docker-stop)
    echo "→ 停止并移除容器"
    docker compose down
    ;;
  *)
    echo "用法: $0 {dev|build|preview|docker|docker-logs|docker-stop}"
    echo ""
    echo "  dev         - 开发模式（默认，热更新，端口5173）"
    echo "  build       - 生产构建到 dist/"
    echo "  preview     - 预览构建产物（端口4173）"
    echo "  docker      - 用Docker Compose构建并启动容器"
    echo "  docker-logs - 查看容器日志"
    echo "  docker-stop - 停止并移除容器"
    exit 1
    ;;
esac
