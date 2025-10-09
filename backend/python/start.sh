#!/bin/sh

# FastAPI 内部サービス起動スクリプト
echo "🚀 Starting FastAPI sidecar service..."

# uvicorn で FastAPI アプリケーションを起動
# ポート6000番、全インターフェースでリッスン
uvicorn app.main:app --host 0.0.0.0 --port 6000 --reload
