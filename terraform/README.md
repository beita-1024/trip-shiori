# Terraform + GCP デプロイ構成

このディレクトリには、Trip ShioriアプリケーションをGCP（Google Cloud Platform）にデプロイするためのTerraform設定が含まれています。

## 構成概要

### 使用サービス
- **Cloud Run**: アプリケーション（Frontend + Backend + AI Service）
- **Cloud SQL**: PostgreSQL データベース
- **Cloud Storage**: 静的ファイル保存
- **VPC**: プライベートネットワーク
- **VPC Connector**: Cloud Run ↔ Cloud SQL接続
- **Secret Manager**: 機密情報の安全な管理（APIキー、パスワード、トークン）

### 環境
- **開発環境**: `terraform/environments/dev/`
- **本番環境**: `terraform/environments/prod/`

## 主要なMakefileコマンド

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
- `make deploy-gcp-prod-safe` - 本番環境安全デプロイ（データ保持・推奨）
- `make deploy-gcp-prod-full` - 本番環境フルデプロイ（初回のみ・データ削除）
- `make deploy-gcp-full` - フルデプロイ（環境指定）

> **詳細なデプロイ手順**: [クイックスタートガイド](../docs/quick-start.md)を参照してください。

## 参考資料

- [Terraform公式ドキュメント](https://www.terraform.io/docs/)
- [Google Cloud Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run公式ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL公式ドキュメント](https://cloud.google.com/sql/docs)
