#!/bin/bash
# GitHub Actions用サービスアカウント設定スクリプト

set -euo pipefail

PROJECT_ID="portfolio-472821"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-actions-key.json"

echo "GitHub Actions用サービスアカウントを設定します..."
echo "プロジェクト: ${PROJECT_ID}"

# 1. サービスアカウント作成
echo "1/4: サービスアカウントを作成中..."
gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME} \
    --display-name="GitHub Actions" \
    --description="GitHub Actions用サービスアカウント" \
    --project=${PROJECT_ID} || echo "⚠️  サービスアカウントは既に存在します"

# 2. 必要な権限を付与
echo "2/4: 権限を付与中..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/editor" || echo "⚠️  権限は既に設定されています"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser" || echo "⚠️  権限は既に設定されています"

# 3. キーを生成
echo "3/4: サービスアカウントキーを生成中..."
gcloud iam service-accounts keys create ${KEY_FILE} \
    --iam-account=${SERVICE_ACCOUNT_EMAIL} \
    --project=${PROJECT_ID}

# 4. Base64エンコード
echo "4/4: キーをBase64エンコード中..."
BASE64_KEY=$(base64 -i ${KEY_FILE})
echo ""
echo "✅ 設定完了！"
echo ""
echo "GitHub Secretsに以下を設定してください："
echo "Secret Name: GCP_SA_KEY"
echo "Secret Value:"
echo "${BASE64_KEY}"
echo ""
echo "GitHub Secrets設定URL:"
echo "https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/settings/secrets/actions"
echo ""
echo "⚠️  注意: 生成されたキーファイル(${KEY_FILE})は安全に保管し、不要になったら削除してください"
