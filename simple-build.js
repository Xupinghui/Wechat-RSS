// 极简构建脚本
const fs = require('fs');

// 创建目录
fs.mkdirSync('api', { recursive: true });
fs.mkdirSync('client/dash', { recursive: true });

// 创建API文件
fs.writeFileSync('api/index.js', 'module.exports = (req, res) => { res.json({status:"ok"}) }');

// 创建前端页面
fs.writeFileSync('client/dash/index.html', '<h1>WeWe RSS</h1><p>API服务已启动</p>'); 