# Trip Shiori クイックスタート

このドキュメントでは、Trip Shioriアプリケーションの起動方法を3つのパターンで説明します。

## 1. 共通準備（必須）

### 前提条件
- **必須ツール**:
  - Docker と Docker Compose（プラグイン）
  - Make（makeコマンド）
  - Git
  - Node.js（v18以上推奨）
  - npm
- **GCPデプロイの場合は追加で以下が必要**:
  - Google Cloud SDK
  - Terraform
  - GCPプロジェクト `portfolio-472821` へのアクセス権限
- **JWT_SECRET生成用（オプション）**:
  - OpenSSL（Linux/macOS）

### 環境変数ファイル作成

以下の3つの `.env` ファイルを作成してください：

#### プロジェクトルート（`/.env`）
```bash
# データベース設定
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app_db
```

#### Backend（`/backend/.env`）
```bash
# データベース接続
DATABASE_URL=postgresql://postgres:postgres@db:5432/app_db
DATABASE_URL_TEST=postgresql://postgres:postgres@db:5432/app_db_test

# サーバー設定
PORT=3000
HOST=0.0.0.0

# JWT認証（32バイト以上の強力なランダム値を使用）
JWT_SECRET=<<ここに強力なランダム値を設定>>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# フロントエンドURL
FRONTEND_URL=http://localhost:3001

# OpenAI API（AI機能用・必須）
OPENAI_API_KEY=
LLM_MODEL=gpt-4o-mini

# 環境設定
NODE_ENV=development
```

#### Frontend（`/frontend/.env`）
```bash
# API接続
NEXT_PUBLIC_API_URL=http://localhost:4002

# フロントエンドURL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

### JWT_SECRET の生成

JWT_SECRETは認証トークンの署名に使用される重要な秘密鍵です。セキュリティ上の理由から、以下の要件を満たす必要があります：

#### 強度要件
- **最小長**: 32バイト（256bit）以上
- **エントロピー**: 高品質なランダム値を使用
- **禁止パターン**: 以下のような推測されやすい値は使用禁止
  - `secret`, `changeme`, `your-jwt`, `your_jwt`, `your jwt`, `yourjwt`
  - デフォルト値やサンプル値

#### 生成方法

**Linux/macOS:**
```bash
# OpenSSLを使用
openssl rand -base64 32 | tr -d '\n'

# Node.jsを使用
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Windows (PowerShell):**
```powershell
# OpenSSLが利用可能な場合
openssl rand -base64 32

# PowerShellの場合
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

#### 本番環境での検証
本番環境（`NODE_ENV=production`）では、アプリケーション起動時にJWT_SECRETの強度が自動的に検証されます：
- 長さが32文字未満の場合
- 危険なパターンが含まれる場合

これらの条件に該当する場合は、アプリケーションが起動時にエラーで終了します。

### 環境変数の詳細説明

#### Backend環境変数

**必須環境変数:**
- `DATABASE_URL`: PostgreSQL接続URL（Docker Composeでは `db:5432` を使用）
- `PORT`: サーバーポート（デフォルト: 3000）
- `HOST`: バインドアドレス（デフォルト: 0.0.0.0）
- `JWT_SECRET`: 認証トークン署名用の秘密鍵（32バイト以上）
- `JWT_ACCESS_EXPIRES_IN`: アクセストークン有効期限（デフォルト: 15m）
- `JWT_REFRESH_EXPIRES_IN`: リフレッシュトークン有効期限（デフォルト: 7d）
- `FRONTEND_URL`: フロントエンドのURL（CORS設定用）
- `OPENAI_API_KEY`: OpenAI APIキー（AI機能用・必須）
- `LLM_MODEL`: 使用するLLMモデル（デフォルト: gpt-4o-mini）

**オプション環境変数:**
```bash
# 環境設定
NODE_ENV=development

# メール送信（SMTP）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Trip Shiori
SMTP_FROM_EMAIL=noreply@tripshiori.com

# デバッグ
DEBUG=1
```

#### Frontend環境変数

**必須環境変数:**
- `NEXT_PUBLIC_API_URL`: バックエンドAPIのURL
- `NEXT_PUBLIC_FRONTEND_URL`: フロントエンドのURL

> ⚠️ **重要**: フロントエンドの環境変数は `NEXT_PUBLIC_` プレフィックスが必要です。

### 環境別設定

#### 開発環境（Docker Compose）
```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:postgres@db:5432/app_db
FRONTEND_URL=http://localhost:3001
NODE_ENV=development

# Frontend (.env)
NEXT_PUBLIC_API_URL=http://localhost:4002
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

#### 本番環境
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@host:5432/database
FRONTEND_URL=https://your-domain.com
NODE_ENV=production

# Frontend (.env)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com
```

#### Cloud SQL Private IP接続

Cloud SQLのPrivate IP接続を使用する場合、以下の点に注意してください：

```bash
# ❌ 間違い: sslmode=requireは使用しない
DATABASE_URL=postgresql://user:password@private-ip:5432/database?sslmode=require

# ✅ 正しい: sslmodeパラメータを省略
DATABASE_URL=postgresql://user:password@private-ip:5432/database

# または明示的にdisableを指定
DATABASE_URL=postgresql://user:password@private-ip:5432/database?sslmode=disable
```

**理由**: Cloud SQLのPrivate IP接続はTLSを提供しないため、`sslmode=require`を指定すると接続エラーが発生します。

### セキュリティと注意事項

- `.env`ファイルは`.gitignore`に含まれています
- 機密情報（APIキー、パスワード）は環境変数で管理
- 本番環境では強力なパスワードとシークレットキーを使用
- 環境変数の命名規則：
  - **Backend**: 大文字とアンダースコア（例：`DATABASE_URL`）
  - **Frontend**: `NEXT_PUBLIC_`プレフィックス付き（例：`NEXT_PUBLIC_API_URL`）

## 2. Docker Compose クイックスタート

### 開発環境での起動

```bash
# 初回起動時（イメージビルド）
make build    # Dockerイメージをビルド

# サービス起動
make up       # または: docker compose up -d

# データベース初期化（マイグレーション + シード）
make init
```

> **注意**: 初回起動時は `make build` を先に実行してください。2回目以降は `make up` から開始できます。

### アクセス

- **Frontend**: http://localhost:3001
- **Backend Health Check**: http://localhost:4002/health
- **Prisma Studio**: http://localhost:5555

### よく使用する操作

```bash
# ログ確認
make logs            # 全サービスのログ
make logs-backend    # Backendのみ
make logs-frontend   # Frontendのみ

# サービス再起動
make restart-backend # Backendのみ再起動
make restart-frontend # Frontendのみ再起動

# データベース操作
make db-studio       # Prisma Studio起動
make db-migrate      # マイグレーション実行
make db-seed         # シードデータ投入

# 停止
make down            # 全サービス停止
```

### 本番相当環境での起動

```bash
# 本番相当設定で起動（ポート公開制限など）
make up-prod
```

> ⚠️ **注意**: 本番相当環境では、データベースポートは外部公開されません。必要に応じて `/backend/.env` と `/frontend/.env` の値を本番相当に調整してください。

## 3. GCP デプロイ クイックスタート

### 前提条件
- 上記の共通準備が完了していること
- Google Cloud SDK、Terraform、Docker がインストール済み

### GCP認証

```bash
# GCPにログイン
gcloud auth login

# プロジェクト設定
gcloud config set project portfolio-472821

# Docker認証設定
gcloud auth configure-docker
```

### Terraform環境変数設定

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

### デプロイ実行

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

> ⚠️ **重要**: デプロイ前に必ず `tf-plan` で変更内容を確認してください。

### 結果確認

```bash
# デプロイ結果を確認
make tf-output TF_ENV=dev

# 出力例：
# backend_url = "https://trip-shiori-dev-backend-xxx-uc.a.run.app"
# frontend_url = "https://trip-shiori-dev-frontend-xxx-uc.a.run.app"
```

## よく使用するコマンド

### Docker Compose 操作
```bash
# 開発環境
make build                # イメージビルド（初回・更新時）
make up                   # 起動
make down                 # 停止
make logs                 # ログ確認
make restart-backend      # Backend再起動
make db-studio           # Prisma Studio

# 本番相当環境
make build-prod          # 本番相当イメージビルド
make up-prod             # 本番相当で起動
make down-prod           # 本番相当を停止
```

### GCP デプロイ操作
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

## トラブルシューティング

### 環境変数関連

1. **CORS エラー**
   - `FRONTEND_URL`が正しく設定されているか確認
   - 本番環境では正確なドメインを設定

2. **メール送信エラー**
   - SMTP設定が正しいか確認
   - Gmailの場合はアプリパスワードを使用

3. **データベース接続エラー**
   - `DATABASE_URL`の形式が正しいか確認
   - データベースサーバーが起動しているか確認
   - **Cloud SQL Private IP接続の場合**: `sslmode=require`は使用しない（TLSを提供しないため）

4. **OpenAI API エラー**
   - `OPENAI_API_KEY`が設定されているか確認
   - APIキーが有効か確認

5. **JWT_SECRET エラー**
   - 32バイト以上の強力なランダム値を使用しているか確認
   - 危険なパターン（`secret`, `changeme`など）を使用していないか確認

### Docker Compose 関連
```bash
# 起動状況確認
make ps                   # または: docker compose ps
make logs                 # 全サービスログ
make logs-backend         # Backendログ
make logs-frontend        # Frontendログ

# イメージビルド・再起動
make build                # イメージ再ビルド（コード変更後）
make restart              # 全サービス再起動
make restart-backend      # Backendのみ再起動
```

### よくある問題と解決方法

1. **初回起動でエラーが発生する場合**
   ```bash
   # まずイメージをビルド
   make build
   # その後サービスを起動
   make up
   ```

2. **コード変更後に変更が反映されない場合**
   ```bash
   # イメージを再ビルド
   make build
   # サービスを再起動
   make restart
   ```

### GCP 関連
```bash
# ログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=20

# リソース確認
gcloud run services list
gcloud sql instances list
```

## 📚 詳細情報

より詳細な情報が必要な場合は、以下を参照してください：
- [GCP デプロイガイド](./deployment/github-actions-setup.md)
- [Terraform README](../../terraform/README.md)
- [Next.js環境変数](https://nextjs.org/docs/basic-features/environment-variables)
- [Prisma環境変数](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [OpenAI API設定](https://platform.openai.com/docs/api-reference)

