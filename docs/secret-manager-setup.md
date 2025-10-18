# GCP Secret Manager セットアップガイド

このドキュメントでは、Trip ShioriアプリケーションでGCP Secret Managerを使用するための初期セットアップ手順を説明します。

## 概要

GitHub SecretsからGCP Secret Managerへ機密情報を移行し、より安全で管理しやすい環境を構築します。

### 移行対象の機密情報

- データベースパスワード
- JWT署名用シークレット
- SMTP認証情報
- AI/LLM APIキー（OpenAI、Cerebras、Tavily）

## 前提条件

- GCPプロジェクト `portfolio-472821` へのアクセス権限
- Google Cloud SDK のインストール
- GitHub Actions でのデプロイ権限

## 自動セットアップ（推奨）

### 1. GitHub Actions での自動作成

初回デプロイ時に、GitHub Actionsが自動的にSecret Managerにシークレットを作成します。

#### Dev環境
```bash
# mainブランチにプッシュまたは手動実行
git push origin main
```

#### Prod環境
```bash
# v*タグをプッシュまたは手動実行
git tag v1.0.0
git push origin v1.0.0
```

### 2. 必要なGitHub Secrets

以下のGitHub Secretsが設定されていることを確認してください：

#### Dev環境専用
- `DB_PASSWORD_DEV` - データベースパスワード
- `JWT_SECRET_DEV` - JWT署名用シークレット

#### Prod環境専用
- `DB_PASSWORD_PROD` - データベースパスワード
- `JWT_SECRET_PROD` - JWT署名用シークレット

#### 共通（Dev/Prod両方で使用）
- `SMTP_USER` - SMTPユーザー名
- `SMTP_PASSWORD` - SMTPパスワード
- `OPENAI_API_KEY` - OpenAI APIキー
- `INTERNAL_AI_TOKEN` - 内部AIサービス認証トークン
- `CEREBRAS_API_KEY` - Cerebras APIキー
- `TAVILY_API_KEY` - Tavily APIキー

## 手動セットアップ

### 1. GCP認証

```bash
# GCPにログイン
gcloud auth login

# プロジェクト設定
gcloud config set project portfolio-472821

# Secret Manager API有効化
gcloud services enable secretmanager.googleapis.com
```

### 2. シークレット作成

#### Dev環境のシークレット作成

```bash
# 環境変数をエクスポート
export DB_PASSWORD_DEV="your-dev-db-password"
export JWT_SECRET_DEV="your-dev-jwt-secret"
export SMTP_USER="your-smtp-user"
export SMTP_PASSWORD="your-smtp-password"
export OPENAI_API_KEY="your-openai-api-key"
export INTERNAL_AI_TOKEN="your-internal-ai-token"
export CEREBRAS_API_KEY="your-cerebras-api-key"
export TAVILY_API_KEY="your-tavily-api-key"

# スクリプト実行
chmod +x ./scripts/create-secrets.sh
./scripts/create-secrets.sh dev
```

#### Prod環境のシークレット作成

```bash
# 環境変数をエクスポート
export DB_PASSWORD_PROD="your-prod-db-password"
export JWT_SECRET_PROD="your-prod-jwt-secret"
export SMTP_USER="your-smtp-user"
export SMTP_PASSWORD="your-smtp-password"
export OPENAI_API_KEY="your-openai-api-key"
export INTERNAL_AI_TOKEN="your-internal-ai-token"
export CEREBRAS_API_KEY="your-cerebras-api-key"
export TAVILY_API_KEY="your-tavily-api-key"

# スクリプト実行
./scripts/create-secrets.sh prod
```

### 3. 個別シークレット作成

```bash
# データベースパスワード
echo -n "your-password" | gcloud secrets create trip-shiori-dev-database-password \
  --data-file=- \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"

# JWTシークレット
echo -n "your-jwt-secret" | gcloud secrets create trip-shiori-dev-jwt-secret \
  --data-file=- \
  --replication-policy="user-managed" \
  --locations="asia-northeast1"

# その他のシークレットも同様に作成...
```

## シークレット命名規則

### Dev環境
```
trip-shiori-dev-database-password
trip-shiori-dev-jwt-secret
trip-shiori-dev-smtp-user
trip-shiori-dev-smtp-password
trip-shiori-dev-openai-api-key
trip-shiori-dev-internal-ai-token
trip-shiori-dev-cerebras-api-key
trip-shiori-dev-tavily-api-key
```

### Prod環境
```
trip-shiori-prod-database-password
trip-shiori-prod-jwt-secret
trip-shiori-prod-smtp-user
trip-shiori-prod-smtp-password
trip-shiori-prod-openai-api-key
trip-shiori-prod-internal-ai-token
trip-shiori-prod-cerebras-api-key
trip-shiori-prod-tavily-api-key
```

## 確認方法

### シークレット一覧表示

```bash
# Dev環境のシークレット
gcloud secrets list --filter="name:trip-shiori-dev-*"

# Prod環境のシークレット
gcloud secrets list --filter="name:trip-shiori-prod-*"
```

### シークレット値の確認

```bash
# 特定のシークレットの値を確認
gcloud secrets versions access latest --secret="trip-shiori-dev-database-password"
```

## トラブルシューティング

### よくある問題

#### 1. シークレットが既に存在するエラー

```bash
ERROR: (gcloud.secrets.create) Secret [trip-shiori-dev-database-password] already exists
```

**解決方法**: 既存のシークレットがある場合はスキップされます。問題ありません。

#### 2. 権限不足エラー

```bash
ERROR: (gcloud.secrets.create) Permission denied
```

**解決方法**: 
```bash
# 必要な権限を確認
gcloud projects get-iam-policy portfolio-472821

# Secret Manager Admin ロールを付与
gcloud projects add-iam-policy-binding portfolio-472821 \
  --member="user:your-email@example.com" \
  --role="roles/secretmanager.admin"
```

#### 3. APIが有効化されていない

```bash
ERROR: API [secretmanager.googleapis.com] not enabled
```

**解決方法**:
```bash
gcloud services enable secretmanager.googleapis.com
```

### ログの確認

```bash
# GitHub Actions のログを確認
# リポジトリの Actions タブから該当のワークフローを確認

# ローカルでのスクリプト実行ログ
./scripts/create-secrets.sh dev 2>&1 | tee secret-creation.log
```

## 次のステップ

1. [Secret Manager運用ガイド](./secret-manager-operations.md) を確認
2. 初回デプロイを実行
3. Cloud RunサービスがSecret Managerから値を正常に取得できることを確認

## 参考リンク

- [GCP Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [Secret Manager のベストプラクティス](https://cloud.google.com/secret-manager/docs/best-practices)
- [Cloud Run での Secret Manager 使用](https://cloud.google.com/run/docs/configuring/secrets)
