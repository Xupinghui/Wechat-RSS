// 简化版构建脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始执行Vercel构建...');

// 当前目录
const currentDir = process.cwd();
console.log('当前目录:', currentDir);

// 列出当前目录的内容
console.log('当前目录内容:');
console.log(fs.readdirSync(currentDir));

// 检查apps目录
const appsDir = path.join(currentDir, 'apps');
if (fs.existsSync(appsDir)) {
  console.log('apps目录存在，内容:', fs.readdirSync(appsDir));
} else {
  console.error('apps目录不存在!');
}

// 检查server目录
const serverDir = path.join(appsDir, 'server');
if (fs.existsSync(serverDir)) {
  console.log('server目录存在，内容:', fs.readdirSync(serverDir));
} else {
  console.error('server目录不存在!');
}

// 检查prisma目录
const prismaDir = path.join(serverDir, 'prisma');
if (fs.existsSync(prismaDir)) {
  console.log('prisma目录存在，内容:', fs.readdirSync(prismaDir));
} else {
  console.error('prisma目录不存在!');
}

// 检查schema.prisma文件
const schemaPath = path.join(prismaDir, 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  console.log('schema.prisma文件存在!');
} else {
  console.error('schema.prisma文件不存在!');
}

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
  try {
    execSync('npx prisma generate --schema=./apps/server/prisma/schema.prisma', {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('生成Prisma客户端失败:', error.message);
    console.log('尝试使用不同的路径...');
    execSync('find . -name "schema.prisma"', { stdio: 'inherit' });
    execSync('npx prisma generate --schema=`find . -name "schema.prisma" | grep -v node_modules | head -1`', {
      stdio: 'inherit'
    });
  }

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
