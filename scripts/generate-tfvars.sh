#!/bin/bash

# terraform.tfvarsを動的に生成するスクリプト
# GitHub Actionsで実行される

set -euo pipefail

# 引数チェック
if [ $# -ne 1 ]; then
    echo "使用方法: $0 <環境名>"
    echo "環境名: dev または prod"
    exit 1
fi

ENV=$1
TF_DIR="terraform/environments/${ENV}"

# 環境チェック
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo "❌ 無効な環境: $ENV"
    echo "有効な環境: dev, prod"
    exit 1
fi

echo "🔧 terraform.tfvarsを生成中（環境: $ENV）..."

# terraform.tfvarsファイルのパス
TFVARS_FILE="${TF_DIR}/terraform.tfvars"

# 環境変数の確認
required_vars=(
    "GCP_PROJECT_ID"
    "GCP_REGION"
    "GCP_ZONE"
    "DB_NAME"
    "DB_USER"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_SECURE"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "❌ 必須環境変数が設定されていません: $var"
        exit 1
    fi
done

# 環境別の変数設定
if [ "$ENV" = "dev" ]; then
    DB_PASSWORD="${DB_PASSWORD_DEV:-}"
    JWT_SECRET="${JWT_SECRET_DEV:-}"
    PROJECT_NAME="trip-shiori-dev"
else
    DB_PASSWORD="${DB_PASSWORD_PROD:-}"
    JWT_SECRET="${JWT_SECRET_PROD:-}"
    PROJECT_NAME="trip-shiori-prod"
fi

# パスワードとJWT秘密鍵の確認
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB_PASSWORD_${ENV^^}が設定されていません"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET_${ENV^^}が設定されていません"
    exit 1
fi

# Git SHAを取得（Dockerイメージタグ用）
GIT_SHA=$(git rev-parse --short HEAD)
BACKEND_IMAGE="gcr.io/${GCP_PROJECT_ID}/trip-shiori-backend:${GIT_SHA}"
FRONTEND_IMAGE="gcr.io/${GCP_PROJECT_ID}/trip-shiori-frontend:${GIT_SHA}"

# 環境別のURL設定
if [ "$ENV" = "dev" ]; then
    BACKEND_URL="https://dev-api.trip.beita.dev"
    FRONTEND_URL="https://dev-app.trip.beita.dev"
else
    BACKEND_URL="https://api.trip.beita.dev"
    FRONTEND_URL="https://app.trip.beita.dev"
fi

# terraform.tfvarsファイルを生成
cat > "$TFVARS_FILE" << EOF
# ===== ${ENV}環境用変数値 =====
# 自動生成: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Git SHA: ${GIT_SHA}

# 基本設定
project_id   = "${GCP_PROJECT_ID}"
project_name = "${PROJECT_NAME}"
region       = "${GCP_REGION}"
zone         = "${GCP_ZONE}"

# データベース設定
database_name     = "${DB_NAME}"
database_user     = "${DB_USER}"
database_password = "${DB_PASSWORD}"

# JWT設定
jwt_secret = "${JWT_SECRET}"

# Dockerイメージ（デプロイ時に更新）
backend_image  = "${BACKEND_IMAGE}"
frontend_image = "${FRONTEND_IMAGE}"

# アプリケーション設定
app_name = "Trip Shiori"

# SMTP設定（メール送信機能用）
smtp_host     = "${SMTP_HOST}"
smtp_port     = "${SMTP_PORT}"
smtp_user     = "${SMTP_USER}"
smtp_password = "${SMTP_PASSWORD}"
smtp_secure   = "${SMTP_SECURE}"

# OpenAI設定（AI機能用）
openai_api_key = "${OPENAI_API_KEY}"
EOF

echo "✅ terraform.tfvarsが生成されました: $TFVARS_FILE"
echo "📋 生成内容:"
echo "  - 環境: $ENV"
echo "  - プロジェクト: $GCP_PROJECT_ID"
echo "  - リージョン: $GCP_REGION"
echo "  - Git SHA: $GIT_SHA"
echo "  - バックエンドURL: $BACKEND_URL"
echo "  - フロントエンドURL: $FRONTEND_URL"
