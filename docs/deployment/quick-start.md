# GCP デプロイ クイックスタート

このドキュメントでは、Trip ShioriアプリケーションをGCPに素早くデプロイする手順を説明します。

##  手順

### 前提条件
- Google Cloud SDK がインストール済み
- Docker がインストール済み
- Terraform がインストール済み
- GCPプロジェクト `portfolio-472821` へのアクセス権限

### 1. 環境変数設定（2分）

```bash
# 開発環境用の設定
cd terraform/environments/dev
cp terraform.tfvars terraform.tfvars.backup

# 設定ファイルを編集
nano terraform.tfvars
```

以下の値を実際の値に変更：
```hcl
database_password = "your-secure-password-here"
jwt_secret = "your-jwt-secret-here"
smtp_user = "your-email@gmail.com"
smtp_password = "your-app-password"
```

### 2. GCP認証（1分）

```bash
# GCPにログイン
gcloud auth login

# プロジェクト設定
gcloud config set project portfolio-472821

# Docker認証設定
gcloud auth configure-docker
```

### 3. デプロイ実行（2分）

```bash
# フルデプロイ実行（推奨）
make deploy-gcp-full

# または段階的に実行
make gcp-auth
make docker-build
make docker-push
make tf-init TF_ENV=dev
make tf-plan TF_ENV=dev    # 変更内容を確認
make tf-apply TF_ENV=dev   # 確認後に適用
```

** 重要**: デプロイ前に必ず `tf-plan` で変更内容を確認してください。

### 4. 結果確認

```bash
# デプロイ結果を確認
make tf-output TF_ENV=dev

# 出力例：
# backend_url = "https://trip-shiori-dev-backend-xxx-uc.a.run.app"
# frontend_url = "https://trip-shiori-dev-frontend-xxx-uc.a.run.app"
```

## よく使用するコマンド

### 基本操作
```bash
# 開発環境デプロイ
make deploy-gcp-dev

# 本番環境デプロイ
make deploy-gcp-prod

# リソース削除
make destroy-gcp-dev
```

### Terraform操作
```bash
# 変更内容の確認（必須）
make tf-plan TF_ENV=dev

# 設定の適用
make tf-apply TF_ENV=dev

# リソース削除
make tf-destroy TF_ENV=dev
```

### トラブルシューティング
```bash
# ログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=20

# リソース確認
gcloud run services list
gcloud sql instances list
```

## 📚 詳細情報

より詳細な情報が必要な場合は、以下を参照してください：
- [GCP デプロイガイド](./gcp-deployment-guide.md)
- [Terraform README](../../terraform/README.md)

## 🆘 サポート

問題が発生した場合は、エラーメッセージと実行したコマンドを記録して、チームにサポートを依頼してください。
