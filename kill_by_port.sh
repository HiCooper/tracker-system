#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "用法: ./kill_by_port.sh <端口号>"
    exit 1
fi

PORT=$1

# 只查 LISTEN 状态的进程（排除 Chrome 等连接方）
PIDS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

if [ -z "$PIDS" ]; then
    echo "端口 $PORT 未被占用（无 LISTEN 进程）"
    exit 0
fi

for pid in $PIDS; do
    kill -9 "$pid" 2>/dev/null && echo "已终止 PID=$pid" || echo "无法终止 PID=$pid"
done

sleep 0.5

# 再次确认
REMAIN=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -z "$REMAIN" ]; then
    echo "端口 $PORT 已释放"
else
    echo "警告: 端口 $PORT 仍被占用: $REMAIN"
    exit 1
fi
