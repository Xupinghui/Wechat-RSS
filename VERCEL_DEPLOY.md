# WeWe RSS - Vercel + MongoDB Atlas 部署指南

## 前提准备

1. 注册 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 账号
2. 注册 [Vercel](https://vercel.com/signup) 账号
3. 拥有 GitHub 账号或将代码托管到 GitHub

## 步骤1: 创建 MongoDB Atlas 数据库

1. 登录 MongoDB Atlas
2. 点击 "Create" 创建一个新集群 (选择免费的 M0 类型)
3. 选择云服务商和地区 (建议选择离你近的区域)
4. 点击 "Create Cluster" 创建集群
5. 在 "Security" -> "Database Access" 中创建一个数据库用户，记住用户名和密码
6. 在 "Security" -> "Network Access" 中，点击 "Add IP Address" 并选择 "Allow Access from Anywhere"
7. 返回到 "Databases"，点击 "Connect"，选择 "Connect your application"，复制连接字符串

## 步骤2: 修改配置文件

1. 复制 `.env.example` 文件为 `.env`
2. 编辑 `.env` 文件:
   ```
   DATABASE_URL="mongodb+srv://你的用户名:你的密码@你的集群地址/wewe-rss?retryWrites=true&w=majority"
   DATABASE_TYPE="mongodb"
   AUTH_CODE="自定义一个安全的授权码"
   ```
   
## 步骤3: 将项目推送到 GitHub

1. 创建一个新的 GitHub 仓库
2. 将修改后的代码推送到该仓库:
   ```bash
   git init
   git add .
   git commit -m "准备Vercel部署"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```

## 步骤4: 在 Vercel 上部署

1. 登录 [Vercel](https://vercel.com/)
2. 点击 "Add New" -> "Project"
3. 导入你的 GitHub 仓库
4. 配置项目:
   - Framework Preset: 选择 "Other"
   - Build Command: 将自动使用配置文件中的命令
   - Output Directory: 将自动使用配置文件中的目录
5. 环境变量设置:
   - 点击 "Environment Variables"
   - 添加以下变量:
     - `DATABASE_URL`: MongoDB Atlas 连接字符串
     - `DATABASE_TYPE`: mongodb
     - `AUTH_CODE`: 你的授权码
     - `SERVER_ORIGIN_URL`: 部署后的Vercel域名 (可在首次部署后再添加)
6. 点击 "Deploy" 开始部署

## 步骤5: 添加 Vercel 域名

1. 部署成功后，Vercel 会自动分配一个域名 (例如 `your-app.vercel.app`)
2. 在 Vercel 控制台，进入项目设置，添加环境变量:
   - `SERVER_ORIGIN_URL`: `https://your-app.vercel.app`
3. 点击 "Redeploy" 重新部署

## 使用方法

1. 访问 `https://your-app.vercel.app/dash` 进入管理界面
2. 使用你在 `.env` 文件设置的 `AUTH_CODE` 进行授权
3. 按照正常流程添加微信读书账号和公众号订阅

## 注意事项

1. MongoDB Atlas 免费层有存储容量限制 (512MB)，适合个人使用和少量订阅
2. Vercel 免费计划对带宽有限制，大量访问可能需要升级
3. 首次部署后，需要手动添加微信读书账号和配置订阅源

## 常见问题

1. **数据库连接问题**: 确保 MongoDB 连接字符串正确且已允许 Vercel IP 访问
2. **构建失败**: 检查 Vercel 构建日志，确认环境变量是否正确配置
3. **无法登录**: 确保微信读书账号有效且未被封禁

如有其他问题，请查看 [WeWe RSS GitHub 仓库](https://github.com/cooderl/wewe-rss) 获取支持。 