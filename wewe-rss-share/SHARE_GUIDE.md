# WeWe RSS 部署使用指南

## 简介

WeWe RSS 是一个优雅的微信公众号订阅工具，可以将微信公众号内容转换为标准的RSS格式，方便在任何RSS阅读器中阅读和管理。

主要功能：
- 支持微信公众号订阅（基于微信读书）
- 获取公众号历史发布文章
- 自动定时更新内容
- 支持全文内容输出
- 多种RSS格式支持（Atom/RSS/JSON）

## 部署方式

### 方式一：使用Docker部署（推荐）

#### 前置条件
- 安装 [Docker](https://www.docker.com/products/docker-desktop/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)（部分Docker Desktop已自带）

#### 部署步骤

1. 创建工作目录并下载配置文件

```bash
mkdir -p wewe-rss/data
cd wewe-rss
curl -o docker-compose.yml https://raw.githubusercontent.com/你的用户名/wewe-rss-share/main/docker-compose.share.yml
```

2. 修改配置文件

编辑 `docker-compose.yml` 文件，修改以下配置：
- 将 `AUTH_CODE` 修改为您自己设定的安全密码
- 将 `SERVER_ORIGIN_URL` 修改为您的公网IP或域名地址

3. 启动服务

```bash
docker-compose up -d
```

4. 访问服务

浏览器访问 `http://localhost:4000/dash` 即可使用

### 方式二：使用公共云服务部署

WeWe RSS 支持在多种云平台一键部署：

- [Zeabur](https://zeabur.com/templates/DI9BBD) (点击链接一键部署)
- [Railway](https://railway.app/) (添加GitHub仓库即可部署)
- [Hugging Face](https://github.com/cooderl/wewe-rss/issues/32) (参考链接教程)

## 配置公网访问

如果要让朋友通过互联网访问您的WeWe RSS服务，可以采用以下方法：

### 方式一：使用端口映射（需公网IP）

如果您有公网IP，可以直接在路由器上配置端口映射，将4000端口映射到运行WeWe RSS的设备。然后在docker-compose.yml中设置：

```yaml
- SERVER_ORIGIN_URL=http://您的公网IP:4000
```

### 方式二：使用内网穿透工具（推荐）

推荐使用 [ngrok](https://ngrok.com/) 或 [frp](https://github.com/fatedier/frp) 等内网穿透工具：

1. 注册并安装ngrok
2. 启动ngrok隧道
   ```bash
   ngrok http 4000
   ```
3. 获取ngrok提供的公网URL（如：https://abc123.ngrok-free.app）
4. 更新docker-compose.yml中的SERVER_ORIGIN_URL为该地址并重启服务
   ```yaml
   - SERVER_ORIGIN_URL=https://abc123.ngrok-free.app
   ```

## 使用方法

1. 进入账号管理，点击添加账号，微信扫码登录微信读书账号
2. 进入公众号源，点击添加，通过提交微信公众号分享链接订阅公众号
   （注意：添加频率过高容易被封控，添加后等待24小时解封）
3. 获取RSS订阅地址：`http://您的服务地址/feeds/所选公众号ID.[rss|atom|json]`
4. 将RSS地址添加到您喜欢的RSS阅读器中

## 注意事项

- 微信公众号添加频率过高会导致账号被封控，建议慢慢添加，每次不超过5个
- 如出现"今日小黑屋"提示，等待24小时后会自动解封
- 数据存储在data目录下，请定期备份该目录
- 默认每天5:35和17:35自动更新订阅源内容

## 常见问题

1. **RSS内容无法更新？**
   检查服务是否正常运行，可以手动触发更新：访问`/feeds/公众号ID.rss?update=true`

2. **账号显示失效？**
   微信读书账号登录状态过期，需要重新登录

3. **订阅链接无法访问？**
   检查SERVER_ORIGIN_URL配置是否正确，需要设置为可以从公网访问的地址

## 更多信息

更多详细信息请参考[官方文档](https://github.com/cooderl/wewe-rss)。 