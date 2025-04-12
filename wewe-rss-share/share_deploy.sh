#!/bin/bash

# WeWe RSS 一键部署脚本
# 作者：您的名字
# 日期：2025年4月6日

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== WeWe RSS 一键部署脚本 ===${NC}"
echo -e "${BLUE}该脚本将帮助您快速部署WeWe RSS并配置内网穿透${NC}"
echo ""

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}[错误] Docker未运行，请先启动Docker服务${NC}"
  exit 1
fi

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
  echo -e "${RED}[错误] 未找到ngrok，请先安装ngrok：https://ngrok.com/download${NC}"
  exit 1
fi

# 检查ngrok认证状态
if ! ngrok config check > /dev/null 2>&1; then
  echo -e "${YELLOW}[警告] ngrok未认证，请先登录ngrok账号${NC}"
  echo -e "请访问 https://dashboard.ngrok.com/get-started/your-authtoken 获取认证令牌"
  read -p "请输入ngrok认证令牌: " NGROK_TOKEN
  ngrok config add-authtoken "$NGROK_TOKEN"
fi

# 设置授权码
echo -e "${YELLOW}设置WeWe RSS服务的授权码${NC}"
read -p "请输入授权码 (默认: wewe-rss): " AUTH_CODE
AUTH_CODE=${AUTH_CODE:-wewe-rss}

# 创建docker-compose.yml
echo -e "${GREEN}创建Docker配置文件...${NC}"
cat > docker-compose.yml << EOL
version: '3.9'

services:
  app:
    image: cooderl/wewe-rss-sqlite:latest
    ports:
      - 4000:4000
    environment:
      - DATABASE_TYPE=sqlite
      - AUTH_CODE=${AUTH_CODE}
      - FEED_MODE=fulltext
      - CRON_EXPRESSION=35 5,17 * * *
      - MAX_REQUEST_PER_MINUTE=60
      # 暂时使用localhost，稍后会更新
      - SERVER_ORIGIN_URL=http://localhost:4000
    volumes:
      - ./data:/app/data
EOL

# 创建data目录
mkdir -p data

# 启动Docker容器
echo -e "${GREEN}启动WeWe RSS服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 5

# 检查服务是否成功启动
if ! curl -s http://localhost:4000 > /dev/null; then
  echo -e "${RED}[错误] WeWe RSS服务启动失败${NC}"
  echo -e "${YELLOW}请检查Docker日志: ${NC}docker-compose logs"
  exit 1
fi

echo -e "${GREEN}WeWe RSS服务已成功启动，本地访问地址: ${NC}http://localhost:4000/dash"

# 启动ngrok内网穿透
echo -e "${BLUE}正在配置ngrok内网穿透...${NC}"
echo -e "${YELLOW}启动ngrok后请保持终端窗口开启，关闭该窗口将会中断内网穿透连接${NC}"
echo -e "${YELLOW}开始配置内网穿透...${NC}"

# 在后台启动ngrok
ngrok http 4000 > ngrok.log 2>&1 &
NGROK_PID=$!

# 等待ngrok启动
echo -e "${YELLOW}等待ngrok启动...${NC}"
sleep 5

# 获取ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')

if [ -z "$NGROK_URL" ]; then
  echo -e "${RED}[错误] 无法获取ngrok URL${NC}"
  echo -e "${YELLOW}请手动检查ngrok状态: ${NC}curl http://localhost:4040/api/tunnels"
  kill $NGROK_PID
  exit 1
fi

echo -e "${GREEN}成功获取ngrok公网地址: ${NC}$NGROK_URL"

# 更新SERVER_ORIGIN_URL
echo -e "${BLUE}更新WeWe RSS服务地址配置...${NC}"
cat > docker-compose.yml << EOL
version: '3.9'

services:
  app:
    image: cooderl/wewe-rss-sqlite:latest
    ports:
      - 4000:4000
    environment:
      - DATABASE_TYPE=sqlite
      - AUTH_CODE=${AUTH_CODE}
      - FEED_MODE=fulltext
      - CRON_EXPRESSION=35 5,17 * * *
      - MAX_REQUEST_PER_MINUTE=60
      - SERVER_ORIGIN_URL=${NGROK_URL}
    volumes:
      - ./data:/app/data
EOL

# 重启服务以应用新配置
echo -e "${YELLOW}重启WeWe RSS服务以应用新配置...${NC}"
docker-compose up -d

echo -e "${GREEN}=== 部署完成! ===${NC}"
echo -e "${GREEN}本地访问地址: ${NC}http://localhost:4000/dash"
echo -e "${GREEN}公网访问地址: ${NC}${NGROK_URL}/dash"
echo -e "${GREEN}授权码: ${NC}${AUTH_CODE}"
echo -e "${YELLOW}提示: 此ngrok地址为临时地址，每次重启ngrok会变更${NC}"
echo -e "${YELLOW}请确保不要关闭此终端窗口，否则内网穿透将停止工作${NC}"
echo -e "${BLUE}如需长期稳定使用，建议：${NC}"
echo -e "1. 购买ngrok付费版以获得固定域名"
echo -e "2. 使用云服务器部署（如阿里云、腾讯云等）"
echo -e "3. 参考SHARE_GUIDE.md文档了解更多部署方式"
echo ""
echo -e "${GREEN}祝您使用愉快！${NC}"

# 保持脚本运行，不要退出，以维持ngrok连接
wait $NGROK_PID 