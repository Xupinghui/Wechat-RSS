# WeWe RSS - Vercel + MongoDB Atlas 部署指南 (更新版)

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
   git commit -m "修复MongoDB Prisma模式和Vercel部署问题"
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
   - Root Directory: 保持默认 (不变)
   - Build Command: 留空 (使用配置文件中的命令)
   - Output Directory: 留空 (使用配置文件中的目录)
5. 环境变量设置:
   - 点击 "Environment Variables"
   - 添加以下变量:
     ```
     DATABASE_URL=mongodb+srv://你的用户名:你的密码@你的集群地址/wewe-rss?retryWrites=true&w=majority
     DATABASE_TYPE=mongodb
     AUTH_CODE=你的授权码
     NODE_ENV=production
     ```
6. 点击 "Deploy" 开始部署

## 常见部署问题解决

### 1. 构建失败

如果遇到构建失败问题，可以尝试以下操作：

1. 查看构建日志了解具体错误
2. 确认MongoDB连接字符串格式正确
3. 确认环境变量已正确设置
4. 如果是依赖问题，可以尝试：
   - 在项目根目录添加 `.npmrc` 文件：
     ```
     legacy-peer-deps=true
     node-linker=hoisted
     ```
   - 确保Vercel使用的Node.js版本正确（建议使用18或更高版本）

### 2. 部署成功但访问出错

如果部署成功但访问时出现错误：

1. 确认MongoDB连接是否成功
2. 添加环境变量 `SERVER_ORIGIN_URL` 设置为你的Vercel域名
3. 检查Vercel函数日志以获取更多信息

## 使用和测试

1. 部署完成后，访问 `https://<你的域名>/dash` 进入管理界面
2. 使用你设置的 `AUTH_CODE` 进行登录
3. 添加微信读书账号（需要扫码）
4. 添加微信公众号源

## 数据库维护提示

1. MongoDB Atlas免费版有512MB存储限制
2. 定期检查数据库大小，必要时清理旧数据
3. 考虑增加定期备份机制

## 进阶设置：自定义域名

1. 在Vercel项目设置中，找到"Domains"部分
2. 添加你的自定义域名
3. 按照Vercel提供的指引设置DNS记录
4. 设置完成后，更新环境变量 `SERVER_ORIGIN_URL` 为你的自定义域名

如有其他问题，请参考[Vercel官方文档](https://vercel.com/docs)或[WeWe RSS GitHub仓库](https://github.com/cooderl/wewe-rss)。 