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

# 外部DBホストを環境変数から抽出（DATABASE_URL からホスト名を抽出）
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\(.*\):[0-9]*\/.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

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

echo "🚀 Starting FastAPI internal service.."

# FastAPI 内部サービスをサブシェルでバックグラウンド起動（作業ディレクトリを汚染しない）
(
  cd python
  poetry run uvicorn app.main:app --host 0.0.0.0 --port 6000 --reload --log-level debug
) &
FASTAPI_PID=$!

# FastAPI の起動を少し待機
echo "⏳ Waiting for FastAPI to start..."
sleep 5

# FastAPI のヘルスチェック
echo "🔍 Checking FastAPI health..."
FASTAPI_READY=false
for i in {1..15}; do
  if curl -fsS --connect-timeout 1 --max-time 2 http://localhost:6000/health > /dev/null 2>&1; then
    echo "✅ FastAPI is ready!"
    FASTAPI_READY=true
    break
  fi
  echo "⏳ Waiting for FastAPI... ($i/15)"
  sleep 2
done

# FastAPIが起動しなかった場合のクリーンアップ処理
if [ "$FASTAPI_READY" = "false" ]; then
  echo "⚠️  Warning: FastAPI failed to start. AI features will not work."
  echo "⚠️  Check FastAPI logs for details. Continuing with Express app..."
  
  # FastAPIプロセスのクリーンアップ
  cleanup_fastapi
fi

echo "🚀 Starting Express app..."

# 環境に応じて適切なコマンドを実行
if [ "$NODE_ENV" = "production" ]; then
  echo "🚀 Starting production server..."
  npm start
else
  echo "🚀 Starting development server..."
  npm run dev
fi
