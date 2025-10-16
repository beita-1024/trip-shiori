#!/bin/sh

# FastAPI 内部サービス起動スクリプト
echo "🚀 Starting FastAPI internal service.."

# Poetry環境でuvicornを実行
# ポート3001番、全インターフェースでリッスン（Cloud Run対応）
if [ "$NODE_ENV" = "production" ]; then
  poetry run uvicorn app.main:app --host 0.0.0.0 --port 3001 --log-level info
else
  poetry run uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload --log-level debug
fi
