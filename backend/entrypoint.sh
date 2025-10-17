#!/usr/bin/env bash

# FastAPIプロセスクリーンアップ関数
cleanup_fastapi() {
  if [ -n "$FASTAPI_PID" ]; then
    echo "🧹 Cleaning up FastAPI process (PID: $FASTAPI_PID)..."
    
    # プロセス存在確認
    if kill -0 "$FASTAPI_PID" 2>/dev/null; then
      echo "🔍 FastAPI process is still running. Terminating..."
      kill "$FASTAPI_PID" 2>/dev/null || echo "⚠️  Failed to terminate FastAPI process"
      
      # プロセス終了を待機（最大5秒）
      for j in {1..5}; do
        if ! kill -0 "$FASTAPI_PID" 2>/dev/null; then
          echo "✅ FastAPI process terminated successfully"
          break
        fi
        echo "⏳ Waiting for FastAPI process to terminate... ($j/5)"
        sleep 1
      done
      
      # 強制終了が必要な場合
      if kill -0 "$FASTAPI_PID" 2>/dev/null; then
        echo "⚠️  Force killing FastAPI process..."
        kill -9 "$FASTAPI_PID" 2>/dev/null || echo "⚠️  Failed to force kill FastAPI process"
      fi
    else
      echo "ℹ️  FastAPI process is not running (already terminated)"
    fi
  else
    echo "ℹ️  No FastAPI PID available for cleanup"
  fi
}

# シグナルハンドラーを設定（スクリプト終了時のクリーンアップ）
trap cleanup_fastapi EXIT INT TERM

# DATABASE_URLを構築（個別環境変数から、または既存のDATABASE_URLを使用）
echo "🔍 Debug: Checking DATABASE_URL and individual variables..."
echo "DATABASE_URL: ${DATABASE_URL:-'not set'}"
echo "DATABASE_HOST: ${DATABASE_HOST:-'not set'}"
echo "DATABASE_PORT: ${DATABASE_PORT:-'not set'}"
echo "DATABASE_NAME: ${DATABASE_NAME:-'not set'}"
echo "DATABASE_USER: ${DATABASE_USER:-'not set'}"
echo "DATABASE_PASSWORD: ${DATABASE_PASSWORD:+'set'}"
echo "DATABASE_PASSWORD length: ${#DATABASE_PASSWORD}"

if [ -n "$DATABASE_URL" ]; then
  # 既存のDATABASE_URLが設定されている場合（Docker Compose環境等）
  export DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\(.*\):[0-9]*\/.*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  echo "ℹ️  Using existing DATABASE_URL"
else
  # 個別環境変数からDATABASE_URLを構築（GCP Secret Manager環境）
  if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_PORT" ] && [ -n "$DATABASE_NAME" ] && [ -n "$DATABASE_USER" ] && [ -n "$DATABASE_PASSWORD" ]; then
    DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
    export DATABASE_URL
    DB_HOST="$DATABASE_HOST"
    DB_PORT="$DATABASE_PORT"
    echo "ℹ️  Built DATABASE_URL from individual environment variables"
    echo "🔍 Final DATABASE_URL: postgresql://${DATABASE_USER}:***@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
    echo "🔍 DATABASE_URL exported: ${DATABASE_URL:+'yes'}"
  else
    echo "❌ Error: Either DATABASE_URL or individual database environment variables must be set"
    echo "Required individual variables: DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD"
    echo "Missing variables:"
    [ -z "$DATABASE_HOST" ] && echo "  - DATABASE_HOST"
    [ -z "$DATABASE_PORT" ] && echo "  - DATABASE_PORT"
    [ -z "$DATABASE_NAME" ] && echo "  - DATABASE_NAME"
    [ -z "$DATABASE_USER" ] && echo "  - DATABASE_USER"
    [ -z "$DATABASE_PASSWORD" ] && echo "  - DATABASE_PASSWORD"
    exit 1
  fi
fi

echo "🌐 Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

# 外部DBが起動して接続できるまで待機（最大60秒）
MAX_RETRIES=60
RETRY_COUNT=0

until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "❌ Timeout: Could not connect to PostgreSQL at $DB_HOST:$DB_PORT"
    exit 1
  fi
done

echo "🚀 DB is ready. Running Prisma migration..."

# マイグレーション実行
if [ "$NODE_ENV" = "production" ]; then
  npx prisma migrate deploy
else
  npx prisma migrate dev --name init
fi

echo "✅ Migration complete."

# シードデータの実行（環境変数で制御）
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Running seed data..."
  npm run db:seed
  echo "✅ Seed complete."
fi

# FastAPI is now running as a separate service (ai)
echo "ℹ️  FastAPI is running as a separate service (ai)"

echo "🚀 Starting Express app..."

# 環境に応じて適切なコマンドを実行
if [ "$NODE_ENV" = "production" ]; then
  echo "🚀 Starting production server..."
  npm start
else
  echo "🚀 Starting development server..."
  npm run dev
fi
