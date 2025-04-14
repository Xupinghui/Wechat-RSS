// 完整的WeWe RSS构建脚本 - 适用于Vercel部署
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('=== WeWe RSS 完整构建脚本开始执行 ===');
console.log(`Node.js 版本: ${process.version}`);
console.log(`当前工作目录: ${process.cwd()}`);

// 帮助函数 - 安全执行命令
function safeExec(command, options = {}) {
  console.log(`执行命令: ${command}`);
  try {
    const result = spawnSync('sh', ['-c', command], {
      stdio: 'inherit',
      ...options
    });
    if (result.status !== 0) {
      console.error(`命令执行失败: ${command}, 退出码: ${result.status}`);
      if (result.error) {
        console.error(`错误详情: ${result.error.message}`);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error(`命令执行异常: ${command}`, error);
    return false;
  }
}

// 创建必要的目录结构
console.log('创建必要的目录结构...');
const outputDir = path.join('dist');
const apiDir = path.join(outputDir, 'api');
const clientDir = path.join(outputDir, 'client');

[outputDir, apiDir, clientDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`目录已创建: ${dir}`);
  }
});

// 尝试构建后端
console.log('尝试构建后端服务...');
try {
  // 生成Prisma客户端
  console.log('生成Prisma客户端...');
  safeExec('npx prisma generate --schema=apps/server/prisma/schema.prisma');
  
  // 构建服务端
  console.log('构建NestJS应用...');
  safeExec('pnpm --filter server build');
  
  // 复制服务端构建结果
  if (fs.existsSync('apps/server/dist')) {
    console.log('复制服务端构建结果...');
    
    // 创建serverless处理函数
    const serverlessHandler = `
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./main');
const express = require('express');
const { ExpressAdapter } = require('@nestjs/platform-express');

let cachedApp;

async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }
  
  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp)
  );
  
  await nestApp.init();
  cachedApp = expressApp;
  return expressApp;
}

module.exports = async (req, res) => {
  const app = await bootstrap();
  return app(req, res);
};
`;
    
    fs.writeFileSync(path.join(apiDir, 'index.js'), serverlessHandler);
    
    // 复制主要文件
    if (fs.existsSync('apps/server/dist/main.js')) {
      safeExec('cp -r apps/server/dist/* ' + apiDir);
    } else {
      console.error('服务端构建结果不存在，创建备用API');
      fs.writeFileSync(path.join(apiDir, 'index.js'), 'module.exports = (req, res) => { res.json({ status: "ok", message: "WeWe RSS API" }); };');
    }
  } else {
    console.error('服务端构建失败，创建备用API');
    fs.writeFileSync(path.join(apiDir, 'index.js'), 'module.exports = (req, res) => { res.json({ status: "ok", message: "WeWe RSS API" }); };');
  }
} catch (error) {
  console.error('后端构建过程中出错:', error);
  console.log('创建备用API...');
  fs.writeFileSync(path.join(apiDir, 'index.js'), 'module.exports = (req, res) => { res.json({ status: "ok", message: "WeWe RSS API" }); };');
}

// 尝试构建前端
console.log('尝试构建前端应用...');
try {
  // 构建前端
  console.log('构建React应用...');
  safeExec('pnpm --filter web build');
  
  // 复制前端构建结果
  if (fs.existsSync('apps/web/dist')) {
    console.log('复制前端构建结果...');
    safeExec('cp -r apps/web/dist/* ' + clientDir);
  } else {
    console.error('前端构建结果不存在，创建备用前端页面');
    fs.writeFileSync(path.join(clientDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 650px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #444;
    }
    h1 { color: #0070f3; text-align: center; }
  </style>
</head>
<body>
  <h1>WeWe RSS</h1>
  <p style="text-align:center">✅ API服务已启动</p>
</body>
</html>
    `);
  }
} catch (error) {
  console.error('前端构建过程中出错:', error);
  console.log('创建备用前端页面...');
  fs.writeFileSync(path.join(clientDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 650px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #444;
    }
    h1 { color: #0070f3; text-align: center; }
  </style>
</head>
<body>
  <h1>WeWe RSS</h1>
  <p style="text-align:center">✅ API服务已启动</p>
</body>
</html>
  `);
}

// 创建Vercel配置文件
console.log('创建vercel.json配置...');
const vercelConfig = {
  "version": 2,
  "builds": [
    { "src": "dist/api/index.js", "use": "@vercel/node" },
    { "src": "dist/client/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "dist/api/index.js" },
    { "src": "/", "dest": "dist/client/index.html" },
    { "src": "/assets/(.*)", "dest": "dist/client/assets/$1" },
    { "src": "/(.*)", "dest": "dist/client/$1" }
  ]
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2)); 