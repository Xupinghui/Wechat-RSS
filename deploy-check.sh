#!/bin/bash

# 设置错误追踪
set -e

echo "📋 开始部署前检查..."

# 检查必要的环境变量
required_vars=("DATABASE_URL")
missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ 错误: 以下环境变量未设置:"
  for var in "${missing_vars[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

# 检查Node.js版本
node_version=$(node -v)
echo "✓ Node.js版本: $node_version"

# 检查pnpm版本
if command -v pnpm &> /dev/null; then
  pnpm_version=$(pnpm -v)
  echo "✓ pnpm版本: $pnpm_version"
else
  echo "❌ 错误: pnpm未安装"
  exit 1
fi

# 检查Prisma CLI
if npx prisma -v &> /dev/null; then
  prisma_version=$(npx prisma -v | head -n 1)
  echo "✓ Prisma版本: $prisma_version"
else
  echo "❌ 错误: Prisma CLI未找到"
  exit 1
fi

# 验证工作区配置
if [ -f "pnpm-workspace.yaml" ]; then
  echo "✓ 工作区配置正确"
else
  echo "❌ 错误: 找不到pnpm-workspace.yaml文件"
  exit 1
fi

# 检查apps目录结构
if [ -d "apps/server" ] && [ -d "apps/client" ]; then
  echo "✓ 项目结构正确"
else
  echo "❌ 错误: apps目录结构不完整"
  exit 1
fi

echo "✅ 部署前检查完成" 