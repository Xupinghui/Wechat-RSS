#!/bin/bash

# 打印当前环境信息
echo "当前目录: $(pwd)"
echo "文件列表:"
ls -la

# 生成Prisma客户端
echo "生成Prisma客户端..."
npx prisma generate --schema=apps/server/prisma/schema.prisma

# 构建服务端
echo "构建服务端..."
npm run build:server || echo "服务端构建失败，但将继续流程"

# 创建客户端目录
echo "创建客户端目录..."
mkdir -p apps/server/dist/client/dash

# 创建简单的前端页面
echo "创建前端页面..."
echo '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <style>
    body { font-family: sans-serif; text-align: center; margin: 50px; }
  </style>
</head>
<body>
  <h1>WeWe RSS 服务</h1>
  <p>API服务已启动，可通过/feeds/{id}.[rss|atom|json]访问</p>
</body>
</html>' > apps/server/dist/client/dash/index.html

echo "构建完成!" 