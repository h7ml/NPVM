#!/bin/sh
set -e

echo "Starting NPVM server..."

# 启动服务器（使用专用启动入口）
node packages/server/dist/start.js
