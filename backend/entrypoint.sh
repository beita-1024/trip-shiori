#!/bin/sh

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

echo "🚀 Starting app..."

# 環境に応じて適切なコマンドを実行
if [ "$NODE_ENV" = "production" ]; then
  echo "🚀 Starting production server..."
  npm start
else
  echo "🚀 Starting development server..."
  npm run dev
fi
