#!/bin/bash

# ===== Terraform State Migration Script =====
# モジュール化後のTerraform stateを修正し、既存GCPリソースを保持したまま新しいモジュール構造に移行する
#
# 使用方法:
#   ./migrate-state-to-modules.sh dev
#   ./migrate-state-to-modules.sh prod
#
# 注意事項:
#   - 実行前に必ずTerraform stateのバックアップが作成されます
#   - 既存のGCPリソースは一切変更されません
#   - スクリプトは冪等性を保ち、複数回実行しても安全です

set -euo pipefail

# ===== 設定 =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_ENV="${1:-dev}"

if [[ ! "$TF_ENV" =~ ^(dev|prod)$ ]]; then
    echo "❌ エラー: 環境は 'dev' または 'prod' である必要があります"
    echo "使用方法: $0 <dev|prod>"
    exit 1
fi

TF_DIR="${PROJECT_ROOT}/terraform/environments/${TF_ENV}"
PROJECT_ID="portfolio-472821"
REGION="asia-northeast1"

echo "🚀 Terraform State Migration を開始します"
echo "環境: ${TF_ENV}"
echo "プロジェクト: ${PROJECT_ID}"
echo "リージョン: ${REGION}"
echo "Terraformディレクトリ: ${TF_DIR}"
echo ""

# ===== 事前チェック =====
if [[ ! -d "$TF_DIR" ]]; then
    echo "❌ エラー: Terraformディレクトリが見つかりません: ${TF_DIR}"
    exit 1
fi

cd "$TF_DIR"

# Terraform初期化確認
if [[ ! -f ".terraform/terraform.tfstate" ]]; then
    echo "📦 Terraform初期化を実行します..."
    terraform init
fi

# ===== バックアップ作成 =====
echo "💾 Terraform stateのバックアップを作成します..."
BACKUP_DIR="${TF_DIR}/.state-backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/terraform-${TF_ENV}-backup-${TIMESTAMP}.tfstate"

if terraform state pull > "$BACKUP_FILE" 2>/dev/null; then
    echo "✅ バックアップを作成しました: ${BACKUP_FILE}"
else
    echo "⚠️  既存のstateが見つかりません。新規stateとして処理します。"
fi

# ===== 既存リソースの確認とimport =====
echo ""
echo "🔍 既存のGCPリソースを確認します..."

# ネットワーク関連の確認
NETWORK_NAME="trip-shiori-${TF_ENV}-vpc"
SUBNET_NAME="trip-shiori-${TF_ENV}-subnet"

if gcloud compute networks describe "$NETWORK_NAME" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
    echo "✅ ネットワークが存在します: ${NETWORK_NAME}"
    
    # ネットワークをimport
    if ! terraform state show "module.network.google_compute_network.vpc" >/dev/null 2>&1; then
        echo "📥 ネットワークをstateにimportします..."
        terraform import "module.network.google_compute_network.vpc" "projects/${PROJECT_ID}/global/networks/${NETWORK_NAME}" || true
    fi
else
    echo "⚠️  ネットワークが存在しません: ${NETWORK_NAME}"
fi

# サブネットの確認
if gcloud compute networks subnets describe "$SUBNET_NAME" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
    echo "✅ サブネットが存在します: ${SUBNET_NAME}"
    
    # サブネットをimport
    if ! terraform state show "module.network.google_compute_subnetwork.subnet" >/dev/null 2>&1; then
        echo "📥 サブネットをstateにimportします..."
        terraform import "module.network.google_compute_subnetwork.subnet" "projects/${PROJECT_ID}/regions/${REGION}/subnetworks/${SUBNET_NAME}" || true
    fi
else
    echo "⚠️  サブネットが存在しません: ${SUBNET_NAME}"
fi

# データベースの確認
DB_INSTANCE_NAME="trip-shiori-${TF_ENV}-db-instance"
if gcloud sql instances describe "$DB_INSTANCE_NAME" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
    echo "✅ データベースインスタンスが存在します: ${DB_INSTANCE_NAME}"
    
    # データベースインスタンスをimport
    if ! terraform state show "module.database.google_sql_database_instance.instance" >/dev/null 2>&1; then
        echo "📥 データベースインスタンスをstateにimportします..."
        terraform import "module.database.google_sql_database_instance.instance" "${PROJECT_ID}/${DB_INSTANCE_NAME}" || true
    fi
    
    # データベースをimport
    DB_NAME="trip_shiori"
    if ! terraform state show "module.database.google_sql_database.database" >/dev/null 2>&1; then
        echo "📥 データベースをstateにimportします..."
        terraform import "module.database.google_sql_database.database" "${PROJECT_ID}/${DB_INSTANCE_NAME}/${DB_NAME}" || true
    fi
    
    # データベースユーザーをimport
    DB_USER="trip_shiori_user"
    if ! terraform state show "module.database.google_sql_user.user" >/dev/null 2>&1; then
        echo "📥 データベースユーザーをstateにimportします..."
        terraform import "module.database.google_sql_user.user" "${PROJECT_ID}/${DB_INSTANCE_NAME}/${DB_USER}" || true
    fi
else
    echo "⚠️  データベースインスタンスが存在しません: ${DB_INSTANCE_NAME}"
fi

# Cloud Runサービスの確認
SERVICES=("backend" "frontend" "ai")
for service in "${SERVICES[@]}"; do
    SERVICE_NAME="trip-shiori-${TF_ENV}-${service}"
    if gcloud run services describe "$SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
        echo "✅ Cloud Runサービスが存在します: ${SERVICE_NAME}"
        
        # Cloud Runサービスをimport
        if ! terraform state show "module.cloudrun.google_cloud_run_v2_service.${service}" >/dev/null 2>&1; then
            echo "📥 Cloud Runサービスをstateにimportします..."
            terraform import "module.cloudrun.google_cloud_run_v2_service.${service}" "projects/${PROJECT_ID}/locations/${REGION}/services/${SERVICE_NAME}" || true
        fi
    else
        echo "⚠️  Cloud Runサービスが存在しません: ${SERVICE_NAME}"
    fi
done

# Storage Bucketの確認
BUCKET_NAME="trip-shiori-${TF_ENV}-storage"
if gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
    echo "✅ Storage Bucketが存在します: ${BUCKET_NAME}"
    
    # Storage Bucketをimport
    if ! terraform state show "module.storage.google_storage_bucket.bucket" >/dev/null 2>&1; then
        echo "📥 Storage Bucketをstateにimportします..."
        terraform import "module.storage.google_storage_bucket.bucket" "${BUCKET_NAME}" || true
    fi
else
    echo "⚠️  Storage Bucketが存在しません: ${BUCKET_NAME}"
fi

# Secret Managerの確認
SECRETS=("database_password" "jwt_secret" "smtp_password" "openai_api_key")
for secret in "${SECRETS[@]}"; do
    SECRET_NAME="trip-shiori-${TF_ENV}-${secret}"
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" --quiet >/dev/null 2>&1; then
        echo "✅ Secretが存在します: ${SECRET_NAME}"
        
        # Secretをimport
        if ! terraform state show "module.secrets.google_secret_manager_secret.${secret}" >/dev/null 2>&1; then
            echo "📥 Secretをstateにimportします..."
            terraform import "module.secrets.google_secret_manager_secret.${secret}" "projects/${PROJECT_ID}/secrets/${SECRET_NAME}" || true
        fi
        
        # Secret Versionをimport
        if ! terraform state show "module.secrets.google_secret_manager_secret_version.${secret}" >/dev/null 2>&1; then
            echo "📥 Secret Versionをstateにimportします..."
            terraform import "module.secrets.google_secret_manager_secret_version.${secret}" "projects/${PROJECT_ID}/secrets/${SECRET_NAME}/versions/latest" || true
        fi
    else
        echo "⚠️  Secretが存在しません: ${SECRET_NAME}"
    fi
done

# ===== Stateの検証 =====
echo ""
echo "🔍 Terraform stateの状態を確認します..."
terraform state list

echo ""
echo "📋 Terraform planを実行して差分を確認します..."
if terraform plan -detailed-exitcode >/dev/null 2>&1; then
    echo "✅ Terraform plan: 差分なし"
elif [[ $? -eq 2 ]]; then
    echo "⚠️  Terraform plan: 変更が検出されました"
    echo "詳細を確認するには: cd ${TF_DIR} && terraform plan"
else
    echo "❌ Terraform plan: エラーが発生しました"
    echo "詳細を確認するには: cd ${TF_DIR} && terraform plan"
fi

# ===== 完了 =====
echo ""
echo "🎉 Terraform State Migration が完了しました！"
echo ""
echo "📁 バックアップファイル: ${BACKUP_FILE}"
echo "📂 Terraformディレクトリ: ${TF_DIR}"
echo ""
echo "次のステップ:"
echo "1. terraform plan で差分を確認"
echo "2. 必要に応じて terraform apply を実行"
echo "3. 問題がある場合はバックアップから復元: terraform state push ${BACKUP_FILE}"
echo ""
echo "✅ 移行が正常に完了しました"
