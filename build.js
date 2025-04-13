// 简化版构建脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始执行Vercel构建...');

// 当前目录
const currentDir = process.cwd();
console.log('当前目录:', currentDir);

try {
  // 输出package.json内容以便调试
  console.log('Package.json内容:');
  if (fs.existsSync(path.join(currentDir, 'package.json'))) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
    console.log('Scripts:', packageJson.scripts);
  } else {
    console.log('package.json不存在');
  }

  // 生成Prisma客户端
  console.log('生成Prisma客户端...');
  execSync('npx prisma generate --schema=apps/server/prisma/schema.prisma', {
    stdio: 'inherit'
  });

  // 构建服务端
  console.log('构建服务端...');
  execSync('pnpm --filter server build', {
    stdio: 'inherit'
  });

  // 确保目录存在
  const dashDir = path.join(currentDir, 'apps/server/dist/client/dash');
  
  if (!fs.existsSync(path.join(currentDir, 'apps/server/dist/client'))) {
    fs.mkdirSync(path.join(currentDir, 'apps/server/dist/client'), { recursive: true });
  }
  
  if (!fs.existsSync(dashDir)) {
    fs.mkdirSync(dashDir, { recursive: true });
  }

  // 创建简单的前端页面
  console.log('创建前端页面...');
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>WeWe RSS</h1>
  <p>API服务已启动，您可以通过以下方式访问：</p>
  <code>/feeds/[feed_id].[rss|atom|json]</code>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(dashDir, 'index.html'), html);
  console.log('前端页面创建成功');

  console.log('构建过程完成！');
} catch (error) {
  console.error('构建过程中出错:', error);
  process.exit(1);
}
