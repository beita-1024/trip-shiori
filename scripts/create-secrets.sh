#!/bin/bash

# GitHub SecretsからGCP Secret Managerへ機密情報を移行するスクリプト
# GitHub Actionsで実行される

set -euo pipefail

# 引数チェック
if [ $# -ne 1 ]; then
    echo "使用方法: $0 <環境名>"
    echo "環境名: dev または prod"
    exit 1
fi

ENV=$1
PROJECT_ID="portfolio-472821"
REGION="asia-northeast1"

# 環境チェック
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
    echo "❌ 無効な環境: $ENV"
    echo "有効な環境: dev, prod"
    exit 1
fi

echo "🔧 GCP Secret Managerにシークレットを作成中（環境: $ENV）..."

# GCPプロジェクト設定
gcloud config set project $PROJECT_ID

# Secret Manager API有効化（初回のみ）
gcloud services enable secretmanager.googleapis.com

# シークレット作成関数
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    echo "Creating secret: $secret_name"
    
    # シークレットが既に存在するかチェック
    if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
        echo "⚠️  Secret $secret_name already exists, skipping creation..."
        return 0
    fi
    
    # シークレット作成
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
        --data-file=- \
        --replication-policy="user-managed" \
        --locations="$REGION" \
        --labels="environment=$ENV,project=trip-shiori"
    
    echo "✅ Secret $secret_name created successfully"
}

# 環境変数の確認
required_vars=(
    "SMTP_USER"
    "SMTP_PASSWORD"
    "OPENAI_API_KEY"
    "INTERNAL_AI_TOKEN"
    "CEREBRAS_API_KEY"
    "TAVILY_API_KEY"
    "REFRESH_TOKEN_FINGERPRINT_SECRET"
)

# 環境別の必須変数
if [ "$ENV" = "dev" ]; then
    required_vars+=("DB_PASSWORD_DEV" "JWT_SECRET_DEV")
else
    required_vars+=("DB_PASSWORD_PROD" "JWT_SECRET_PROD")
fi

# 必須環境変数の確認
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "❌ 必須環境変数が設定されていません: $var"
        exit 1
    fi
done

# 共通シークレットの作成
create_secret "trip-shiori-$ENV-smtp-user" "${SMTP_USER}"
create_secret "trip-shiori-$ENV-smtp-password" "${SMTP_PASSWORD}"
create_secret "trip-shiori-$ENV-openai-api-key" "${OPENAI_API_KEY}"
create_secret "trip-shiori-$ENV-internal-ai-token" "${INTERNAL_AI_TOKEN}"
create_secret "trip-shiori-$ENV-cerebras-api-key" "${CEREBRAS_API_KEY}"
create_secret "trip-shiori-$ENV-tavily-api-key" "${TAVILY_API_KEY}"
create_secret "trip-shiori-$ENV-refresh-token-fingerprint-secret" "${REFRESH_TOKEN_FINGERPRINT_SECRET}"

# 環境別シークレットの作成
if [ "$ENV" = "dev" ]; then
    create_secret "trip-shiori-dev-database-password" "${DB_PASSWORD_DEV}"
    create_secret "trip-shiori-dev-jwt-secret" "${JWT_SECRET_DEV}"
else
    create_secret "trip-shiori-prod-database-password" "${DB_PASSWORD_PROD}"
    create_secret "trip-shiori-prod-jwt-secret" "${JWT_SECRET_PROD}"
fi

echo "✅ All secrets created successfully for environment: $ENV"
echo "📋 Created secrets:"
gcloud secrets list --filter="labels.environment=$ENV" --format="table(name,createTime)"
