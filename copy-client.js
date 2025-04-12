// 专门用于Vercel构建的文件复制脚本
const fs = require('fs');
const path = require('path');

console.log('开始复制客户端文件到server/dist/client目录...');

// 定义源目录和目标目录
const clientSrcDir = path.join(process.cwd(), 'apps', 'web', 'dist');
const clientDestDir = path.join(process.cwd(), 'apps', 'server', 'dist', 'client');

// 检查源目录是否存在
if (!fs.existsSync(clientSrcDir)) {
  console.error('源目录不存在:', clientSrcDir);
  process.exit(1);
}

// 创建目标目录
if (!fs.existsSync(clientDestDir)) {
  fs.mkdirSync(clientDestDir, { recursive: true });
  console.log('创建目标目录:', clientDestDir);
}

// 创建dash子目录
const dashDir = path.join(clientDestDir, 'dash');
if (!fs.existsSync(dashDir)) {
  fs.mkdirSync(dashDir, { recursive: true });
  console.log('创建dash子目录:', dashDir);
}

// 复制文件函数
function copyFolderSync(source, target) {
  console.log(`复制 ${source} 到 ${target}`);
  
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
      console.log(`复制文件: ${sourcePath} -> ${targetPath}`);
    }
  });
}

// 开始复制
try {
  console.log('开始复制文件...');
  copyFolderSync(clientSrcDir, dashDir);
  console.log('文件复制完成！');
} catch (error) {
  console.error('复制过程中出错:', error);
  process.exit(1);
} 