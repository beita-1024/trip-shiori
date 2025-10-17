"""FastAPI sidecar service main application."""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, internal_ai

# Console logging setup so that `make logs` shows our module logs
logging.basicConfig(
    level=logging.DEBUG,  # DEBUG level for RAG debugging
    stream=sys.stdout,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

app = FastAPI(
    title="FastAPI Sidecar Service",
    description="FastAPI sidecar service for trip-shiori backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS設定 - Express (localhost:3000) からのアクセスのみ許可
# Cloud Run環境では内部通信のため、より柔軟な設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(health.router, tags=["health"])
app.include_router(internal_ai.router, tags=["internal-ai"])


@app.get("/")
def root():
    """ルートエンドポイント
    
    FastAPI 内部サービスの基本情報を返す。
    
    Returns:
        dict: サービス情報
    """
    return {
        "service": "FastAPI Sidecar Service",
        "version": "0.1.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "health_auth": "/health/auth",
            "internal_ai_events_complete": "/internal/ai/events-complete",
            "internal_ai_itinerary_edit": "/internal/ai/itinerary-edit",
            "docs": "/docs"
        }
    }
