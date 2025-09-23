# Terraform + GCP デプロイ構成

このディレクトリには、Trip ShioriアプリケーションをGCP（Google Cloud Platform）にデプロイするためのTerraform設定が含まれています。

## 🏗️ 構成概要

### 使用サービス
- **Cloud Run**: アプリケーション（Frontend + Backend）
- **Cloud SQL**: PostgreSQL データベース
- **Cloud Storage**: 静的ファイル保存
- **VPC**: プライベートネットワーク
- **VPC Connector**: Cloud Run ↔ Cloud SQL接続

### 環境
- **開発環境**: `terraform/environments/dev/`
- **本番環境**: `terraform/environments/prod/`

## 🚀 デプロイ手順

### 1. 前提条件
```bash
# 必要なツールのインストール
# - Terraform
# - Google Cloud SDK
# - Docker
```

### 2. GCP認証
```bash
# GCPにログイン
gcloud auth login

# プロジェクト設定
gcloud config set project portfolio-472821

# Docker認証設定
gcloud auth configure-docker
```

### 3. 環境変数設定
```bash
# 開発環境用
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvarsを編集して実際の値を設定
```

### 4. デプロイ実行

#### Makefileを使用（推奨）
```bash
# 開発環境デプロイ
make deploy-gcp-dev

# 本番環境デプロイ
make deploy-gcp-prod

# フルデプロイ（Dockerビルド→プッシュ→Terraform適用）
make deploy-gcp-full
```

#### スクリプトを使用
```bash
# 開発環境
./scripts/deploy-gcp.sh dev

# 本番環境
./scripts/deploy-gcp.sh prod
```

#### 手動実行
```bash
# 1. Terraform初期化
terraform init

# 2. 設定検証
terraform validate

# 3. プラン確認
terraform plan

# 4. 適用
terraform apply
```

## 📋 利用可能なMakefileターゲット

### Terraform基本操作
- `make tf-init` - Terraform初期化
- `make tf-validate` - 設定検証
- `make tf-plan` - プラン実行
- `make tf-apply` - 設定適用
- `make tf-destroy` - リソース削除
- `make tf-output` - 出力表示

### GCP操作
- `make gcp-auth` - GCP認証設定
- `make docker-build` - Dockerイメージビルド
- `make docker-push` - Dockerイメージプッシュ

### 統合デプロイ
- `make deploy-gcp-dev` - 開発環境デプロイ
- `make deploy-gcp-prod` - 本番環境デプロイ
- `make deploy-gcp-full` - フルデプロイ

## 🔧 設定ファイル

### 環境別設定
- `dev/main.tf` - 開発環境用リソース定義
- `dev/variables.tf` - 開発環境用変数定義
- `dev/terraform.tfvars` - 開発環境用変数値
- `dev/outputs.tf` - 開発環境用出力定義

- `prod/main.tf` - 本番環境用リソース定義
- `prod/variables.tf` - 本番環境用変数定義
- `prod/terraform.tfvars` - 本番環境用変数値
- `prod/outputs.tf` - 本番環境用出力定義

### 主要な設定項目
- **プロジェクトID**: `portfolio-472821`
- **リージョン**: `asia-northeast1` (東京)
- **データベース**: PostgreSQL 16
- **Cloud Run**: 自動スケーリング対応

## 🔒 セキュリティ設定

### 開発環境
- データベース: 外部アクセス可能（開発用）
- 削除保護: 無効
- 最小リソース設定

### 本番環境
- データベース: プライベートIPのみ
- 削除保護: 有効
- バックアップ設定: 30日間保持
- 高可用性設定

## 📊 コスト最適化

### 開発環境
- Cloud SQL: `db-f1-micro` (最小構成)
- Cloud Run: 最小インスタンス数 0
- ストレージ: 最小サイズ

### 本番環境
- Cloud SQL: `db-g1-small` (推奨構成)
- Cloud Run: 最小インスタンス数 1
- ストレージ: 適切なサイズ設定

## 🚨 注意事項

1. **機密情報**: `terraform.tfvars`には機密情報が含まれます
2. **削除保護**: 本番環境では削除保護が有効です
3. **バックアップ**: 本番環境では自動バックアップが設定されています
4. **ネットワーク**: VPCを使用してセキュアな通信を実現

## 🔍 トラブルシューティング

### よくある問題
1. **認証エラー**: `gcloud auth login`を実行
2. **プロジェクト設定**: `gcloud config set project portfolio-472821`
3. **Docker認証**: `gcloud auth configure-docker`
4. **権限不足**: 必要なIAMロールを確認

### ログ確認
```bash
# Cloud Runログ
gcloud logging read "resource.type=cloud_run_revision"

# Cloud SQLログ
gcloud logging read "resource.type=cloudsql_database"
```

## 📚 参考資料

- [Terraform公式ドキュメント](https://www.terraform.io/docs/)
- [Google Cloud Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run公式ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL公式ドキュメント](https://cloud.google.com/sql/docs)
