#!/bin/bash

# GCPサービスアカウント設定スクリプト
# GitHub Actions用のサービスアカウントを作成し、JSONキーを生成する

set -euo pipefail

# 設定
PROJECT_ID="portfolio-472821"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="github-actions-key.json"

# 色付き出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェック中..."
    
    # gcloud CLIの確認
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLIがインストールされていません"
        log_info "インストール方法: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # 認証状態の確認
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "GCPにログインしていません"
        log_info "以下のコマンドでログインしてください:"
        log_info "  gcloud auth login"
        exit 1
    fi
    
    # プロジェクトの確認
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "現在のプロジェクト: $CURRENT_PROJECT"
        log_info "プロジェクトを設定中: $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    fi
    
    log_success "前提条件チェック完了"
}

# サービスアカウントの存在確認
check_service_account_exists() {
    log_info "サービスアカウントの存在確認中..."
    
    if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" &>/dev/null; then
        log_warning "サービスアカウント '$SERVICE_ACCOUNT_EMAIL' は既に存在します"
        return 0
    else
        log_info "サービスアカウント '$SERVICE_ACCOUNT_EMAIL' は存在しません"
        return 1
    fi
}

# サービスアカウント作成
create_service_account() {
    log_info "サービスアカウントを作成中..."
    
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="GitHub Actions" \
        --description="GitHub Actions用サービスアカウント"
    
    log_success "サービスアカウント '$SERVICE_ACCOUNT_EMAIL' を作成しました"
}

# 権限付与
grant_permissions() {
    log_info "権限を付与中..."
    
    # Editor権限（Cloud Run、Cloud SQL、その他GCPリソースの管理）
    log_info "Editor権限を付与中..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/editor"
    
    # Service Account User権限（サービスアカウントの使用）
    log_info "Service Account User権限を付与中..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/iam.serviceAccountUser"
    
    # Storage Admin権限（Terraform状態ファイル管理用）
    log_info "Storage Admin権限を付与中..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="roles/storage.admin"
    
    log_success "権限の付与が完了しました"
}

# JSONキー生成
generate_json_key() {
    log_info "JSONキーを生成中..."
    
    # 既存のキーファイルがある場合は削除
    if [ -f "$KEY_FILE" ]; then
        log_warning "既存のキーファイル '$KEY_FILE' を削除します"
        rm -f "$KEY_FILE"
    fi
    
    # JSONキーを生成
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SERVICE_ACCOUNT_EMAIL"
    
    log_success "JSONキーを生成しました: $KEY_FILE"
}

# 権限確認
verify_permissions() {
    log_info "権限を確認中..."
    
    # サービスアカウントの権限確認
    log_info "サービスアカウント '$SERVICE_ACCOUNT_EMAIL' の権限:"
    gcloud projects get-iam-policy "$PROJECT_ID" \
        --flatten="bindings[].members" \
        --format="table(bindings.role)" \
        --filter="bindings.members:$SERVICE_ACCOUNT_EMAIL"
    
    log_success "権限確認完了"
}

# JSONキー表示
display_json_key() {
    log_info "生成されたJSONキー:"
    echo "=========================================="
    cat "$KEY_FILE"
    echo "=========================================="
    echo ""
    log_warning "このJSONキーをGitHub Secretsの 'GCP_SA_KEY' に設定してください"
}

# GitHub Secrets設定手順表示
show_github_secrets_instructions() {
    log_info "GitHub Secrets設定手順:"
    echo "1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」"
    echo "2. 「New repository secret」をクリック"
    echo "3. Name: GCP_SA_KEY"
    echo "4. Secret: 上記のJSONキーをコピー&ペースト"
    echo "5. 「Add secret」をクリック"
    echo ""
    log_success "設定完了後、GitHub Actionsワークフローが実行できるようになります"
}

# メイン処理
main() {
    log_info "GCPサービスアカウント設定を開始します..."
    log_info "プロジェクト: $PROJECT_ID"
    log_info "サービスアカウント: $SERVICE_ACCOUNT_EMAIL"
    echo ""
    
    # 前提条件チェック
    check_prerequisites
    echo ""
    
    # サービスアカウントの存在確認
    if check_service_account_exists; then
        log_warning "サービスアカウントは既に存在します"
        read -p "既存のサービスアカウントを使用しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "処理を中止しました"
            exit 0
        fi
    else
        # サービスアカウント作成
        create_service_account
        echo ""
    fi
    
    # 権限付与
    grant_permissions
    echo ""
    
    # 権限確認
    verify_permissions
    echo ""
    
    # JSONキー生成
    generate_json_key
    echo ""
    
    # JSONキー表示
    display_json_key
    
    # GitHub Secrets設定手順表示
    show_github_secrets_instructions
    
    log_success "GCPサービスアカウント設定が完了しました！"
}

# スクリプト実行
main "$@"
