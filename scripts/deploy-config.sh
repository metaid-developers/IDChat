#!/bin/bash

# 环境配置部署脚本
# 用于根据不同环境复制对应的配置文件

ENV=$1

if [ -z "$ENV" ]; then
  echo "请指定环境: dev, test, prod"
  echo "用法: ./deploy-config.sh [dev|test|prod]"
  exit 1
fi

SOURCE_FILE="public/app-config.${ENV}.json"
TARGET_FILE="public/app-config.json"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "错误: 配置文件 $SOURCE_FILE 不存在"
  exit 1
fi

echo "正在部署 $ENV 环境配置..."
cp "$SOURCE_FILE" "$TARGET_FILE"

if [ $? -eq 0 ]; then
  echo "✓ 配置文件已更新: $TARGET_FILE"
  echo "环境: $ENV"
  echo ""
  echo "配置预览:"
  cat "$TARGET_FILE" | head -20
  echo "..."
else
  echo "✗ 配置文件更新失败"
  exit 1
fi
