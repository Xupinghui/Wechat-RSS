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
  try {
    execSync('npx prisma generate --schema=apps/server/prisma/schema.prisma', { stdio: 'inherit' });
    
    // 如果处于非开发环境，生成Prisma数据库客户端但不执行迁移
    // MongoDB不需要执行migrate deploy，因为它是无模式的
    if (process.env.NODE_ENV === 'production') {
      console.log('MongoDB数据库不需要执行migrate deploy，跳过...');
    }
  } catch (error) {
    console.error('Prisma生成失败:', error.message);
    // 打印详细错误信息但不退出构建过程
    console.log('继续执行构建流程...');
  }
  
  // 确保dist目录存在
  const distDir = path.join(process.cwd(), 'apps', 'server', 'dist');
  if (!fs.existsSync(distDir)) {
    console.log('构建服务端...');
    execSync('npm run build:server', { stdio: 'inherit' });
  }
  
  // 确保客户端构建
  console.log('构建客户端...');
  execSync('npm run build:web', { stdio: 'inherit' });
  
  // 确保客户端文件被正确复制到server/dist/client目录下
  const clientSrcDir = path.join(process.cwd(), 'apps', 'web', 'dist');
  const clientDestDir = path.join(process.cwd(), 'apps', 'server', 'dist', 'client');
  
  if (fs.existsSync(clientSrcDir) && !fs.existsSync(path.join(clientDestDir, 'dash'))) {
    console.log('复制客户端文件到server/dist/client目录...');
    if (!fs.existsSync(clientDestDir)) {
      fs.mkdirSync(clientDestDir, { recursive: true });
    }
    
    // 创建dash子目录
    const dashDir = path.join(clientDestDir, 'dash');
    if (!fs.existsSync(dashDir)) {
      fs.mkdirSync(dashDir, { recursive: true });
    }
    
    // 复制web/dist中的所有文件到server/dist/client/dash
    copyFolderSync(clientSrcDir, dashDir);
  }
  
  console.log('Vercel构建过程完成！');
} catch (error) {
  console.error('构建过程中出错:', error);
  process.exit(1);
}

// 递归复制文件夹的函数
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath); // 递归复制子目录
    } else {
      fs.copyFileSync(sourcePath, targetPath); // 复制文件
    }
  });
} 