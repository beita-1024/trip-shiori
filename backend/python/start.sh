#!/bin/sh

# FastAPI 内部サービス起動スクリプト
echo "🚀 Starting FastAPI internal service.."

# Poetry環境でuvicornを実行
# ポート6000番、全インターフェースでリッスン
poetry run uvicorn app.main:app --host 0.0.0.0 --port 6000 --reload --log-level debug
