#!/usr/bin/env bash

# 显示执行的命令
set -x

# 打印诊断信息
echo "当前目录: $(pwd)"
echo "文件列表:"
ls -la

# 生成Prisma客户端
echo "生成Prisma客户端..."
npx prisma generate --schema=apps/server/prisma/schema.prisma

# 构建服务端
echo "构建服务端..."
cd apps/server && npm run build && cd ../..

# 创建客户端目录
echo "创建客户端目录..."
mkdir -p apps/server/dist/client/dash

# 创建简单页面
echo "创建简单页面..."
cat > apps/server/dist/client/dash/index.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <style>body{font-family:system-ui;text-align:center;max-width:800px;margin:0 auto;padding:20px}</style>
</head>
<body>
  <h1>WeWe RSS</h1>
  <p>API服务已启动，访问 /feeds/{id}.rss 获取RSS订阅</p>
</body>
</html>
EOL

echo "构建完成！" 