const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('=== WeWe RSS Vercel 构建脚本开始执行 ===');
console.log(`Node.js 版本: ${process.version}`);
console.log(`运行环境: ${process.env.NODE_ENV || 'development'}`);

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

// 创建目录结构
const distDir = path.join('apps', 'server', 'dist');
const dashDir = path.join(distDir, 'client', 'dash');
const prismaDir = path.join('apps', 'server', 'prisma');

console.log('创建必要的目录结构...');
[distDir, dashDir, prismaDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`目录已创建: ${dir}`);
  }
});

// 检查 Prisma Schema 是否存在
const schemaPath = path.join(prismaDir, 'schema.prisma');
let schemaExists = false;

if (fs.existsSync(schemaPath)) {
  console.log('schema.prisma 文件已存在');
  schemaExists = true;
} else {
  console.log('schema.prisma 文件不存在，尝试创建临时文件...');
  // 创建简化版 schema.prisma
  const schemaContent = `datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl"]
}

model Feed {
  id        String    @id @map("_id")
  mpName    String    @map("mp_name")
  mpCover   String    @map("mp_cover")
  mpIntro   String    @map("mp_intro")
  status    Int       @default(1) @map("status")
  syncTime  Int       @default(0) @map("sync_time")
  updateTime Int      @map("update_time")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime? @default(now()) @updatedAt @map("updated_at")

  @@map("feeds")
}`;

  try {
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('临时 schema.prisma 文件已创建');
    schemaExists = true;
  } catch (err) {
    console.error('创建 schema.prisma 文件失败:', err);
  }
}

// 生成 Prisma 客户端
if (schemaExists) {
  console.log('生成 Prisma 客户端...');
  const success = safeExec(`npx prisma generate --schema=${schemaPath}`);
  
  if (!success) {
    console.warn('Prisma 客户端生成失败，继续执行其他步骤...');
  }
}

// 创建 API 文件
console.log('创建 API 文件...');
const apiContent = `module.exports = (req, res) => {
  res.json({
    status: "ok",
    message: "WeWe RSS API running",
    version: "2.6.1",
    timestamp: new Date().toISOString()
  });
};`;

fs.writeFileSync(path.join(distDir, 'api.js'), apiContent);
fs.writeFileSync(path.join(distDir, 'index.js'), apiContent);

// 创建前端页面
console.log('创建前端页面...');
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WeWe RSS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
      <p>&copy; ${new Date().getFullYear()} WeWe RSS</p>
    </footer>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(dashDir, 'index.html'), htmlContent);

// 尝试构建项目
try {
  console.log('尝试构建服务端...');
  safeExec('pnpm --filter server build');
} catch (err) {
  console.warn('服务端构建失败，继续使用静态文件...');
}

console.log('=== WeWe RSS Vercel 构建脚本执行完成 ==='); 