# 環境変数設定ガイド

このドキュメントでは、Trip Shioriプロジェクトで使用する環境変数の設定方法について説明します。

## 概要

Trip Shioriは以下の環境で動作します：
- **Backend**: Node.js + Express + Prisma
- **Frontend**: Next.js + TypeScript
- **Database**: PostgreSQL


## Backend環境変数

### 必須環境変数

```bash
# データベース接続
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/app_db_test

# サーバー設定
PORT=3000
HOST=0.0.0.0

# JWT認証
# 32バイト以上のランダム値を使用（例: 256bit）
# 生成例（Linux/macOS）:
#   openssl rand -base64 32 | tr -d '\n'
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# フロントエンドURL（統一後）
FRONTEND_URL=http://localhost:3001

# OpenAI API（AI機能用）
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

### オプション環境変数

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

## Frontend環境変数

### 必須環境変数

```bash
# API接続
NEXT_PUBLIC_API_URL=http://localhost:4002

# フロントエンドURL（統一後）
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

## 重要な環境変数の詳細

### JWT_SECRET の設定

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

## 環境別設定

### 開発環境

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db
FRONTEND_URL=http://localhost:3001
NODE_ENV=development

# Frontend (.env)
NEXT_PUBLIC_API_URL=http://localhost:4002
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

### 本番環境

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@host:5432/database
FRONTEND_URL=https://your-domain.com
NODE_ENV=production

# Frontend (.env)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com
```

### Cloud SQL Private IP接続

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

## CapRover デプロイ環境変数

### 必須環境変数

```bash
# CapRover サーバーURL
CAPROVER_URL=https://captain.your-domain.com

# Frontend アプリケーション設定
CAPROVER_APP_FE=your-frontend-app-name
CAPROVER_TOKEN_FE=your-frontend-deploy-token

# Backend アプリケーション設定
CAPROVER_APP_BE=your-backend-app-name
CAPROVER_TOKEN_BE=your-backend-deploy-token
```

### 設定方法

1. プロジェクトルートに `.env` ファイルを作成
2. 上記の環境変数を設定
3. `make deploy-cap` コマンドでデプロイ実行（Backend→Frontend の順で実行）

## 設定ファイルの場所

- **Backend**: `backend/.env`
- **Frontend**: `frontend/.env`
- **CapRover**: `.env` (プロジェクトルート)
- **Docker**: `docker-compose.yml`内の`env_file`設定

## 注意事項

### セキュリティ

- `.env`ファイルは`.gitignore`に含まれています
- 機密情報（APIキー、パスワード）は環境変数で管理
- 本番環境では強力なパスワードとシークレットキーを使用

### 環境変数の命名規則

- **Backend**: 大文字とアンダースコア（例：`DATABASE_URL`）
- **Frontend**: `NEXT_PUBLIC_`プレフィックス付き（例：`NEXT_PUBLIC_API_URL`）

### 変更履歴

- **2025-01-15**: `CLIENT_ORIGIN`、`APP_URL`を`FRONTEND_URL`に統一
- **2025-01-15**: `NEXT_PUBLIC_APP_URL`を`NEXT_PUBLIC_FRONTEND_URL`に統一

## トラブルシューティング

### よくある問題

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

## 参考リンク

- [Next.js環境変数](https://nextjs.org/docs/basic-features/environment-variables)
- [Prisma環境変数](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [OpenAI API設定](https://platform.openai.com/docs/api-reference)
