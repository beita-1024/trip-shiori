# デプロイメントドキュメント

## 概要

Trip Shioriプロジェクトのデプロイメント関連ドキュメントです。

## ドキュメント一覧

### 環境設定
- [環境比較](./environment-comparison.md) - 本番環境と開発環境の仕様比較
- [ドメインマッピングガイド](./domain-mapping-guide.md) - Cloud Runドメインマッピングの設定方法

### デプロイメント
- [GCPデプロイメント](./gcp-deployment.md) - GCP Cloud Runへのデプロイメント手順
- [Terraform設定](./terraform-config.md) - Terraform設定の詳細説明

## クイックスタート

### 開発環境デプロイ
```bash
# 開発環境へのフルデプロイ
make deploy-gcp-dev-full
```

### 本番環境デプロイ
```bash
# 本番環境へのフルデプロイ
make deploy-gcp-prod-full
```

## 環境構成

### 開発環境 (Dev)
- **ドメイン**: `dev-api.trip.beita.dev` / `dev-app.trip.beita.dev`
- **特徴**: コスト最適化、開発効率重視
- **リソース**: 最小限の設定

### 本番環境 (Prod)
- **ドメイン**: `api.trip.beita.dev` / `app.trip.beita.dev`
- **特徴**: 高可用性、高セキュリティ
- **リソース**: 高性能設定

## セキュリティ

- 本番環境では削除保護が有効
- 強力なパスワードとシークレットを使用
- SSL暗号化とプライベートネットワーク活用

## トラブルシューティング

詳細なトラブルシューティング情報は各ドキュメントを参照してください。

---

_Last updated: 2025-01-15_