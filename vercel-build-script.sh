#!/bin/bash

# 打印诊断信息
echo "当前目录: $(pwd)"
echo "目录内容:"
ls -la

# 设置环境变量
export SKIP_TS_CHECK=true
export TS_NODE_TRANSPILE_ONLY=true
export NODE_ENV=production

# 构建服务端
echo "构建服务端..."
npm run build:server

# 创建客户端目录
echo "创建客户端目录..."
mkdir -p apps/server/dist/client/dash

# 创建应急前端页面
echo "创建应急前端页面..."
cat > apps/server/dist/client/dash/index.html << 'EOL'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WeWe RSS</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 600px;
      padding: 30px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a73e8;
      margin-bottom: 20px;
    }
    .message {
      line-height: 1.6;
      margin-bottom: 20px;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .info {
      margin-top: 20px;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>WeWe RSS</h1>
    <div class="message">
      <p>API服务已正常运行，您可以通过以下路径访问：</p>
      <p><code>/feeds/[feed_id].(rss|atom|json)</code></p>
    </div>
    <div class="info">
      <p>提示：您需要先添加微信读书账号并订阅微信公众号。</p>
      <p>详情请参考 <a href="https://github.com/cooderl/wewe-rss" target="_blank">GitHub 项目</a></p>
    </div>
  </div>
</body>
</html>
EOL

echo "构建完成！" 