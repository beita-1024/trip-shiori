#!/usr/bin/env bash

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

# FastAPI 内部サービスをバックグラウンドで起動
cd python && poetry run sh start.sh &
FASTAPI_PID=$!

# FastAPI の起動を少し待機
echo "⏳ Waiting for FastAPI to start..."
sleep 5

# FastAPI のヘルスチェック
echo "🔍 Checking FastAPI health..."
FASTAPI_READY=false
for i in {1..15}; do
  if curl -f http://localhost:6000/health > /dev/null 2>&1; then
    echo "✅ FastAPI is ready!"
    FASTAPI_READY=true
    break
  fi
  echo "⏳ Waiting for FastAPI... ($i/15)"
  sleep 2
done

# FastAPIが起動しなかった場合の警告
if [ "$FASTAPI_READY" = "false" ]; then
  echo "⚠️  Warning: FastAPI failed to start. AI features will not work."
  echo "⚠️  Check FastAPI logs for details. Continuing with Express app..."
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
