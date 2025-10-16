# Terraform + GCP デプロイ構成

このディレクトリには、Trip ShioriアプリケーションをGCP（Google Cloud Platform）にデプロイするためのTerraform設定が含まれています。

## 🏗️ 構成概要

### 使用サービス
- **Cloud Run**: アプリケーション（Frontend + Backend + AI Service）
- **Cloud SQL**: PostgreSQL データベース
- **Cloud Storage**: 静的ファイル保存
- **VPC**: プライベートネットワーク
- **VPC Connector**: Cloud Run ↔ Cloud SQL接続
- **環境変数**: 機密情報の直接設定（APIキー、トークン）

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

### 3.1. 必須環境変数設定
```bash
# terraform.tfvarsファイルに以下の値を設定
# AI機能用APIキー
cerebras_api_key = "your-cerebras-api-key"
openai_api_key = "your-openai-api-key"
tavily_api_key = "your-tavily-api-key"
internal_ai_token = "your-internal-ai-token"

# データベース・認証用
database_password = "your-secure-db-password"
jwt_secret = "your-secure-jwt-secret"
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

#### 環境変数を使用
```bash
# 開発環境
TF_ENV=dev make deploy-gcp-full

# 本番環境
TF_ENV=prod make deploy-gcp-full
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

### 削除保護・状態管理
- `make check-deletion-protection` - Cloud SQL削除保護チェック・無効化
- `make sync-terraform-state` - Terraform状態同期

### 統合デプロイ
- `make deploy-gcp-dev` - 開発環境デプロイ
- `make deploy-gcp-prod` - 本番環境デプロイ
- `make deploy-gcp-prod-safe` - 本番環境安全デプロイ（データ保持・推奨）
- `make deploy-gcp-prod-full` - 本番環境フルデプロイ（初回のみ・データ削除）
- `make deploy-gcp-full` - フルデプロイ（環境指定）

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
- **Cloud Run**: 自動スケーリング対応（Frontend + Backend + AI Service）
- **環境変数**: 機密情報の直接設定

## 🔒 セキュリティ設定

### 開発環境
- データベース: 外部アクセス可能（開発用）
- 削除保護: 無効
- 最小リソース設定
- 環境変数: 開発用設定

### 本番環境
- データベース: プライベートIPのみ
- 削除保護: 有効
- バックアップ設定: 30日間保持
- 高可用性設定
- 環境変数: 本番用設定

## 📊 コスト最適化

### 開発環境
- Cloud SQL: `db-f1-micro` (最小構成)
- Cloud Run: 最小インスタンス数 0（Frontend + Backend + AI Service）
- ストレージ: 最小サイズ

### 本番環境
- Cloud SQL: `db-g1-small` (推奨構成)
- Cloud Run: 最小インスタンス数 1（Frontend + Backend + AI Service）
- ストレージ: 適切なサイズ設定

## 🚨 注意事項

1. **機密情報**: `terraform.tfvars`には機密情報が含まれます
2. **環境変数**: APIキー・トークンは環境変数で直接設定
3. **削除保護**: 本番環境では削除保護が有効です
4. **バックアップ**: 本番環境では自動バックアップが設定されています
5. **ネットワーク**: VPCを使用してセキュアな通信を実現
6. **AIサービス**: FastAPI + LangChain + Cerebras/OpenAI/Tavily連携

## 📋 デプロイ戦略

### 初回デプロイ
```bash
# 本番環境の初回セットアップ（データベース新規作成）
make deploy-gcp-prod-full
```

### 継続デプロイ
```bash
# 本番環境の安全な更新（データ保持）
make deploy-gcp-prod-safe
```

### 開発環境
```bash
# 開発環境（データ削除OK）
TF_ENV=dev make deploy-gcp-full
```

## ⚠️ 重要な違い

| コマンド | 用途 | データベース | 削除保護 |
|---------|------|-------------|----------|
| `deploy-gcp-prod-full` | 初回セットアップ | 新規作成 | 無効化 |
| `deploy-gcp-prod-safe` | 継続デプロイ | 更新のみ | 維持 |
| `deploy-gcp-full` | 開発環境 | 新規作成 | 無効化 |

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

## 🤖 GitHub Actions自動デプロイ

### 初回設定

#### 1. サービスアカウント作成
```bash
# 自動設定スクリプトを実行
./scripts/setup-github-actions.sh
```

#### 2. GitHub Secrets設定
1. GitHubリポジトリの Settings > Secrets and variables > Actions
2. `GCP_SA_KEY` を追加
3. スクリプトで生成されたBase64エンコードされたキーを設定

#### 3. 自動デプロイのテスト
```bash
# ローカルで自動デプロイをテスト
make deploy-gcp-prod-auto
```

### 自動デプロイの動作

- **トリガー**: `main`ブランチへのプッシュ
- **手動実行**: GitHub Actions画面から実行可能
- **データ保護**: 本番環境のデータベースは保護される
- **自動承認**: プラン確認をスキップして自動適用

### 利用可能なコマンド

| コマンド | 用途 | 認証 | プラン確認 |
|---------|------|------|-----------|
| `deploy-gcp-prod-safe` | 手動デプロイ | `gcloud auth login` | 必要 |
| `deploy-gcp-prod-auto` | 自動デプロイ | サービスアカウント | スキップ |

### トラブルシューティング

#### 認証エラー
```bash
# サービスアカウントの権限確認
gcloud projects get-iam-policy portfolio-472821 \
    --flatten="bindings[].members" \
    --filter="bindings.members:github-actions@portfolio-472821.iam.gserviceaccount.com"
```

#### デプロイ失敗時
```bash
# ログ確認
gcloud logging read "resource.type=cloud_run_revision" \
    --project=portfolio-472821 \
    --limit=50
```

### GitHub Actions用コマンド
- `make setup-github-actions` - サービスアカウント設定
- `make test-github-actions` - 自動デプロイテスト
- `make verify-deployment` - デプロイ結果検証
- `make deploy-gcp-dev-auto` - 開発環境自動デプロイ
- `make deploy-auto` - 環境指定自動デプロイ

### 環境指定デプロイ
```bash
# 開発環境
TF_ENV=dev make deploy-auto

# 本番環境
TF_ENV=prod make deploy-auto
```


## 🚀 クイックスタート（GitHub Actions設定）

### 1. Google Cloud Consoleでサービスアカウント作成

1. [Google Cloud Console](https://console.cloud.google.com/) → **IAMと管理** → **サービス アカウント**
2. **「サービス アカウントを作成」**
3. 名前: `ci-deployer`、説明: `GitHub Actions用`
4. 権限を付与:
   - `Cloud Run管理者` (`roles/run.admin`)
   - `Artifact Registry書き込み` (`roles/artifactregistry.writer`)
   - `サービスアカウントユーザー` (`roles/iam.serviceAccountUser`)
5. **「完了」**

### 2. サービスアカウントキーを生成

1. 作成したサービスアカウントをクリック
2. **「鍵」** タブ → **「鍵を追加」** → **「新しい鍵を作成」**
3. **「JSON」** を選択 → **「作成」**
4. **JSONファイルをダウンロード**（1回だけ入手可能）

### 3. GitHub Secretsに設定

1. GitHubリポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **「New repository secret」**
3. Name: `GCP_SA_KEY`、Value: ダウンロードしたJSONの内容
4. **「Add secret」**

### 4. 自動デプロイのテスト

```bash
# ローカルでテスト
make deploy-gcp-prod-auto

# GitHub Actionsでテスト
# mainブランチにプッシュすると自動実行
```

### 5. 動作確認

- **本番環境**: `main`ブランチへのプッシュで自動デプロイ
- **開発環境**: `develop`ブランチへのプッシュで自動デプロイ
- **手動実行**: GitHub Actions画面から実行可能

