# GCP デプロイガイド

このドキュメントでは、Trip ShioriアプリケーションをGCP（Google Cloud Platform）にデプロイする手順を詳しく説明します。

## 📋 前提条件

### 必要なツール
以下のツールがインストールされている必要があります：

```bash
# 1. Google Cloud SDK
# https://cloud.google.com/sdk/docs/install
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# 2. Terraform
# https://www.terraform.io/downloads
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# 3. Docker
# https://docs.docker.com/engine/install/
sudo apt-get update
sudo apt-get install docker.io
sudo usermod -aG docker $USER
```

### 必要な権限
GCPプロジェクト `portfolio-472821` で以下の権限が必要です：
- Cloud Run Admin
- Cloud SQL Admin
- Storage Admin
- Compute Network Admin
- Service Account User

## 🔧 ステップ1: 環境変数設定

### 1.1 開発環境の設定

```bash
# 開発環境用の設定ファイルを編集
cd terraform/environments/dev
cp terraform.tfvars terraform.tfvars.backup  # バックアップ作成
```

`terraform/environments/dev/terraform.tfvars` を編集：

```hcl
# ===== 開発環境用変数値 =====

# 基本設定（変更不要）
project_id   = "portfolio-472821"
project_name = "trip-shiori-dev"
region       = "asia-northeast1"
zone         = "asia-northeast1-a"

# データベース設定（実際の値に変更）
database_name     = "trip_shiori"
database_user     = "trip_shiori_user"
database_password = "your-secure-dev-password-here"  # 強力なパスワードを設定

# JWT設定（実際の値に変更）
jwt_secret = "your-dev-jwt-secret-here"  # 32文字以上のランダム文字列

# Dockerイメージ（変更不要）
backend_image  = "gcr.io/portfolio-472821/trip-shiori-backend:latest"
frontend_image = "gcr.io/portfolio-472821/trip-shiori-frontend:latest"

# アプリケーション設定（変更不要）
app_name = "Trip Shiori"

# SMTP設定（メール送信機能用）
smtp_host     = "smtp.gmail.com"  # Gmailを使用する場合
smtp_port     = "587"
smtp_user     = "your-email@gmail.com"  # 実際のメールアドレス
smtp_password = "your-app-password"  # Gmailアプリパスワード
smtp_secure   = "false"
```

### 1.2 本番環境の設定

```bash
# 本番環境用の設定ファイルを編集
cd terraform/environments/prod
cp terraform.tfvars terraform.tfvars.backup  # バックアップ作成
```

`terraform/environments/prod/terraform.tfvars` を編集：

```hcl
# ===== 本番環境用変数値 =====

# 基本設定（変更不要）
project_id   = "portfolio-472821"
project_name = "trip-shiori-prod"
region       = "asia-northeast1"
zone         = "asia-northeast1-a"

# データベース設定（実際の値に変更）
database_name     = "trip_shiori"
database_user     = "trip_shiori_user"
database_password = "your-secure-production-password-here"  # 強力なパスワードを設定

# JWT設定（実際の値に変更）
jwt_secret = "your-production-jwt-secret-here"  # 32文字以上のランダム文字列

# Dockerイメージ（変更不要）
backend_image  = "gcr.io/portfolio-472821/trip-shiori-backend:latest"
frontend_image = "gcr.io/portfolio-472821/trip-shiori-frontend:latest"

# アプリケーション設定（変更不要）
app_name = "Trip Shiori"

# SMTP設定（メール送信機能用）
smtp_host     = "smtp.gmail.com"  # Gmailを使用する場合
smtp_port     = "587"
smtp_user     = "your-email@gmail.com"  # 実際のメールアドレス
smtp_password = "your-app-password"  # Gmailアプリパスワード
smtp_secure   = "false"
```

### 1.3 セキュリティ設定のベストプラクティス

#### パスワード生成
```bash
# 強力なパスワードを生成
openssl rand -base64 32

# JWTシークレット生成
openssl rand -hex 32
```

#### 環境変数での管理（推奨）
```bash
# 環境変数で機密情報を管理
export TF_VAR_database_password="your-secure-password"
export TF_VAR_jwt_secret="your-jwt-secret"
export TF_VAR_smtp_password="your-smtp-password"
```

## 🔐 ステップ2: GCP認証設定

### 2.1 初回認証

```bash
# GCPにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project portfolio-472821

# 認証情報を確認
gcloud auth list
```

### 2.2 サービスアカウント認証（推奨）

```bash
# サービスアカウントキーを作成（GCPコンソールで）
# 1. IAM & Admin > Service Accounts
# 2. 新しいサービスアカウントを作成
# 3. 必要な権限を付与
# 4. キーをダウンロード

# サービスアカウントで認証
gcloud auth activate-service-account --key-file=path/to/service-account-key.json
```

### 2.3 Docker認証設定

```bash
# DockerのGCR認証を設定
gcloud auth configure-docker

# 認証確認
docker pull gcr.io/portfolio-472821/hello-world
```

## 🚀 ステップ3: デプロイ実行

### 3.1 開発環境デプロイ

```bash
# 開発環境へのデプロイ（推奨）
make deploy-gcp-dev

# または手動で段階的に実行
make gcp-auth
make docker-build
make docker-push
make tf-init TF_ENV=dev
make tf-validate TF_ENV=dev
make tf-plan TF_ENV=dev      # 変更内容を確認
make tf-apply TF_ENV=dev     # 確認後に適用
```

**⚠️ 重要**: 必ず `tf-plan` で変更内容を確認してから `tf-apply` を実行してください。

### 3.2 本番環境デプロイ

```bash
# 本番環境へのデプロイ（推奨）
make deploy-gcp-prod

# または手動で段階的に実行
make gcp-auth
make docker-build
make docker-push
make tf-init TF_ENV=prod
make tf-validate TF_ENV=prod
make tf-plan TF_ENV=prod     # 本番環境の変更内容を確認
make tf-apply TF_ENV=prod    # 確認後に適用
```

**⚠️ 重要**: 本番環境では特に `tf-plan` での事前確認が重要です。

### 3.3 フルデプロイ（推奨）

```bash
# フルデプロイ（Dockerビルド→プッシュ→Terraform適用）
make deploy-gcp-full

# 環境を指定してフルデプロイ
TF_ENV=dev make deploy-gcp-full
TF_ENV=prod make deploy-gcp-full
```

## 📋 Terraform Planの重要性

### Planとは？
`terraform plan` は、実際の変更を実行する前に**変更内容を事前確認**できる重要な機能です。

### Planの効果
- **安全性の確保**: 予期しない変更を防止
- **コストの事前確認**: 作成されるリソースとコストを確認
- **チームでの確認**: 変更内容をチームで共有・レビュー

### Planの出力例
```bash
make tf-plan TF_ENV=dev

# 出力例
Terraform will perform the following actions:

  # google_cloud_run_v2_service.backend will be created
  + resource "google_cloud_run_v2_service" "backend" {
      + name     = "trip-shiori-dev-backend"
      + location = "asia-northeast1"
      ...
    }

  # google_sql_database_instance.main will be created
  + resource "google_sql_database_instance" "main" {
      + name             = "trip-shiori-dev-db-instance"
      + database_version = "POSTGRES_16"
      ...
    }

Plan: 5 to add, 0 to change, 0 to destroy.
```

### Planのベストプラクティス
1. **必ず実行**: デプロイ前に必ずplanを実行
2. **チームレビュー**: 重要な変更はチームで確認
3. **段階的デプロイ**: 開発→本番の順序で実行
4. **ログの保存**: 変更履歴を記録

## 📊 デプロイ後の確認

### 3.1 デプロイ結果の確認

```bash
# Terraform出力を確認
make tf-output TF_ENV=dev
make tf-output TF_ENV=prod

# 出力例：
# backend_url = "https://trip-shiori-dev-backend-xxx-uc.a.run.app"
# frontend_url = "https://trip-shiori-dev-frontend-xxx-uc.a.run.app"
```

### 3.2 アプリケーションの動作確認

```bash
# フロントエンドの確認
curl -I https://trip-shiori-dev-frontend-xxx-uc.a.run.app

# バックエンドの確認
curl -I https://trip-shiori-dev-backend-xxx-uc.a.run.app/health

# データベース接続確認
gcloud sql instances list
gcloud sql databases list --instance=trip-shiori-dev-db-instance
```

### 3.3 ログの確認

```bash
# Cloud Runログの確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# 特定のサービスのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trip-shiori-dev-backend" --limit=20
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 認証エラー
```bash
# エラー: gcloud auth login required
gcloud auth login
gcloud config set project portfolio-472821
```

#### 2. 権限不足エラー
```bash
# エラー: Permission denied
# 解決: 必要なIAMロールを確認・付与
gcloud projects get-iam-policy portfolio-472821
```

#### 3. Docker認証エラー
```bash
# エラー: unauthorized: You don't have the needed permissions
gcloud auth configure-docker
```

#### 4. Terraform状態エラー
```bash
# エラー: state file not found
cd terraform/environments/dev
terraform init
```

#### 5. リソース作成エラー
```bash
# エラー: resource already exists
# 解決: 既存リソースを確認・削除
gcloud run services list
gcloud sql instances list
```

#### 6. Planで予期しない変更が表示される
```bash
# 状態ファイルを確認
terraform show

# 状態ファイルを更新
terraform refresh

# 再度planを実行
terraform plan
```

### デバッグコマンド

```bash
# Terraform状態確認
terraform show

# リソース一覧確認
terraform state list

# 特定リソースの詳細
terraform state show google_cloud_run_v2_service.backend
```

## 🧹 クリーンアップ

### 開発環境の削除

```bash
# 開発環境のリソースを削除（推奨）
make destroy-gcp-dev

# または直接実行
make tf-destroy TF_ENV=dev

# 確認プロンプトで "yes" を入力
```

### 本番環境の削除

```bash
# 本番環境のリソースを削除（推奨）
make destroy-gcp-prod

# または直接実行（注意: データが失われます）
make tf-destroy TF_ENV=prod

# 確認プロンプトで "yes" を入力
```

## 📚 参考資料

- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)

## 🆘 サポート

問題が発生した場合は、以下の情報を収集してください：

1. エラーメッセージの全文
2. 実行したコマンド
3. 環境情報（OS、バージョンなど）
4. ログファイル（`terraform.log`など）

これらの情報とともに、チームにサポートを依頼してください。
