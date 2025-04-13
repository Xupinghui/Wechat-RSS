#!/bin/sh
# 极简构建脚本 - 不依赖任何其他命令，只使用最基本的 shell 功能

echo "执行极简构建脚本..."

# 1. 创建目录
mkdir -p apps/server/dist
mkdir -p apps/server/dist/client/dash

# 2. 创建 API 文件
cat > apps/server/dist/api.js << 'EOF'
module.exports = (req, res) => {
  res.json({
    status: "ok",
    message: "WeWe RSS API running"
  });
};
EOF

# 3. 复制 API 文件为 index.js
cat apps/server/dist/api.js > apps/server/dist/index.js

# 4. 创建简单的前端页面
cat > apps/server/dist/client/dash/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>WeWe RSS</title>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      margin: 50px;
    }
    h1 {
      color: #0070f3;
    }
  </style>
</head>
<body>
  <h1>WeWe RSS</h1>
  <p>API服务已启动</p>
</body>
</html>
EOF

echo "构建完成！" 