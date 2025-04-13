const fs = require('fs');
const path = require('path');

// 创建目录结构
const distDir = path.join('apps', 'server', 'dist');
const dashDir = path.join(distDir, 'client', 'dash');

console.log('Creating directory structure...');
fs.mkdirSync(dashDir, { recursive: true });

// 创建 API 文件
console.log('Creating API files...');
const apiContent = `module.exports = (req, res) => {
  res.json({
    status: "ok",
    message: "WeWe RSS API running"
  });
};`;

fs.writeFileSync(path.join(distDir, 'api.js'), apiContent);
fs.writeFileSync(path.join(distDir, 'index.js'), apiContent);

// 创建前端页面
console.log('Creating frontend page...');
const htmlContent = `<!DOCTYPE html>
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
</html>`;

fs.writeFileSync(path.join(dashDir, 'index.html'), htmlContent);

console.log('Build completed successfully!'); 