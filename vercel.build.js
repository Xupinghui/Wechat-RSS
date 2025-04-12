// Vercel构建辅助脚本
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 确保主构建完成
try {
  console.log('开始Vercel构建过程...');
  
  // 确保依赖安装
  console.log('确保依赖安装...');
  if (process.env.CI) {
    // CI环境可能需要重新安装以解决锁文件问题
    try {
      execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit' });
    } catch (err) {
      console.log('依赖安装失败，但继续执行构建流程...');
    }
  }
  
  // 确保Prisma生成
  console.log('生成Prisma客户端...');
  execSync('npx prisma generate --schema=apps/server/prisma/schema.prisma', { stdio: 'inherit' });
  
  // 确保dist目录存在
  const distDir = path.join(process.cwd(), 'apps', 'server', 'dist');
  if (!fs.existsSync(distDir)) {
    console.log('构建服务端...');
    execSync('npm run build:server', { stdio: 'inherit' });
  }
  
  // 确保客户端构建
  console.log('构建客户端...');
  execSync('npm run build:web', { stdio: 'inherit' });
  
  console.log('Vercel构建过程完成！');
} catch (error) {
  console.error('构建过程中出错:', error);
  process.exit(1);
} 