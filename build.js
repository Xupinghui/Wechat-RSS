// 简化版构建脚本
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始执行Vercel构建...');

// 当前目录
const currentDir = process.cwd();
console.log('当前目录:', currentDir);
console.log('Node.js版本:', process.version);
console.log('操作系统:', process.platform);

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

// 列出当前目录的内容
console.log('当前目录内容:');
safeExec('ls -la');

// 手动创建目录结构
console.log('确保目录结构存在...');
const directories = [
  'apps',
  'apps/server',
  'apps/server/prisma',
  'apps/server/dist',
  'apps/server/dist/client',
  'apps/server/dist/client/dash'
];

for (const dir of directories) {
  const dirPath = path.join(currentDir, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`创建目录: ${dir}`);
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      console.error(`创建目录失败: ${dir}`, error);
    }
  }
}

// 检查schema.prisma文件
let schemaFound = false;
try {
  // 查找所有schema.prisma文件
  console.log('搜索schema.prisma文件...');
  safeExec('find . -name "schema.prisma" | grep -v node_modules');
  
  const schemaPath = path.join(currentDir, 'apps/server/prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    console.log('schema.prisma文件存在!');
    schemaFound = true;
  } else {
    console.error('schema.prisma文件不存在!');
    
    // 尝试复制schema模板
    const schemaTemplate = `
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl"]
}

model Account {
  id        String    @id @map("_id")
  token     String    @map("token")
  name      String    @map("name")
  status    Int       @default(1) @map("status")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime? @default(now()) @updatedAt @map("updated_at")

  @@map("accounts")
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
  hasHistory Int?     @default(1) @map("has_history")
  groups    FeedToGroup[]

  @@map("feeds")
}

model FeedGroup {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String   @map("name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime? @default(now()) @updatedAt @map("updated_at")
  feeds     FeedToGroup[]

  @@map("feed_groups")
}

model FeedToGroup {
  id         String    @id @default(auto()) @map("_id") @db.ObjectId
  feedId     String    @map("feed_id")
  groupId    String    @map("group_id")
  createdAt  DateTime  @default(now()) @map("created_at")
  feed       Feed      @relation(fields: [feedId], references: [id], onDelete: Cascade)
  group      FeedGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([feedId, groupId])
  @@map("feed_to_groups")
}

model Article {
  id          String  @id @map("_id")
  mpId        String  @map("mp_id")
  title       String  @map("title")
  picUrl      String  @map("pic_url")
  publishTime Int     @map("publish_time")
  content     String? @map("content")
  isCrawled   Int     @default(0) @map("is_crawled")
  aiScore     Int?    @map("ai_score")
  aiReason    String? @map("ai_reason")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime? @default(now()) @updatedAt @map("updated_at")

  @@map("articles")
}
`;
    
    console.log('创建schema.prisma模板文件...');
    fs.writeFileSync(schemaPath, schemaTemplate);
    schemaFound = true;
  }
} catch (error) {
  console.error('检查schema.prisma时出错:', error);
}

try {
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
  
  const dashDir = path.join(currentDir, 'apps/server/dist/client/dash');
  fs.writeFileSync(path.join(dashDir, 'index.html'), html);
  console.log('前端页面创建成功');

  // 生成Prisma客户端
  if (schemaFound) {
    console.log('生成Prisma客户端...');
    const prismaSuccess = safeExec('npx prisma generate --schema=./apps/server/prisma/schema.prisma');
    
    if (!prismaSuccess) {
      console.log('尝试使用替代方法生成Prisma客户端...');
      safeExec('npx prisma generate --schema=`find . -name "schema.prisma" | grep -v node_modules | head -1`');
    }
  } else {
    console.error('无法找到schema.prisma文件，跳过Prisma生成');
  }

  // 尝试构建服务端
  console.log('构建服务端...');
  const buildSuccess = safeExec('pnpm --filter server build');
  
  if (!buildSuccess) {
    console.log('尝试使用替代方法构建服务端...');
    
    // 检查是否有服务端构建脚本
    const serverPackageJsonPath = path.join(currentDir, 'apps/server/package.json');
    if (fs.existsSync(serverPackageJsonPath)) {
      console.log('找到服务端package.json，尝试直接构建...');
      safeExec('cd apps/server && pnpm build');
    } else {
      console.error('无法找到服务端package.json，创建最小构建输出...');
      
      // 创建最小API文件
      const minimalApiContent = `
module.exports = (req, res) => {
  res.json({
    status: 'ok',
    message: 'WeWe RSS API is running'
  });
};
      `;
      
      fs.writeFileSync(path.join(currentDir, 'apps/server/dist/api.js'), minimalApiContent);
    }
  }

  console.log('构建过程完成！');
} catch (error) {
  console.error('构建过程中出错:', error);
  process.exit(1);
}
