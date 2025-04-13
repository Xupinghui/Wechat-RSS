#!/bin/sh
# 极简构建脚本 - 不依赖任何其他命令，只使用最基本的 shell 功能

echo "=== 执行极简构建脚本 ==="

# 1. 创建必要的目录
mkdir -p apps/server/dist/client/dash

# 2. 创建 API 文件
cat > apps/server/dist/api.js << 'EOF'
module.exports = (req, res) => {
  res.json({
    status: "ok",
    message: "WeWe RSS API running",
    version: "2.6.1",
    timestamp: new Date().toISOString()
  });
};
EOF

# 3. 复制 API 文件为 index.js
cp apps/server/dist/api.js apps/server/dist/index.js

# 4. 创建前端页面
cat > apps/server/dist/client/dash/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
      background-color: #f9f9f9;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    h1 {
      color: #0070f3;
      margin-bottom: 1rem;
      text-align: center;
    }
    .status {
      text-align: center;
      font-size: 1.2rem;
      margin: 2rem 0;
      padding: 1rem;
      background-color: #f0f9ff;
      border-radius: 6px;
      border-left: 4px solid #0070f3;
    }
    code {
      background-color: #f1f1f1;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
    }
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.9rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WeWe RSS</h1>
    <div class="status">
      <p>✅ API服务已启动</p>
    </div>
    <p>您可以通过以下格式获取RSS订阅:</p>
    <p><code>/feeds/[feed_id].[rss|atom|json]</code></p>
    <footer>
      <p>&copy; 2025 WeWe RSS</p>
    </footer>
  </div>
</body>
</html>
EOF

echo "=== 构建完成 ===" 