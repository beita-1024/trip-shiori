"""FastAPI sidecar service main application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, calc

app = FastAPI(
    title="FastAPI Sidecar Service",
    description="FastAPI sidecar service for trip-shiori backend",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS設定 - Express (localhost:3000) からのアクセスのみ許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(health.router, tags=["health"])
app.include_router(calc.router, tags=["calculation"])


@app.get("/")
def root():
    """ルートエンドポイント
    
    FastAPI サイドカーサービスの基本情報を返す。
    
    Returns:
        dict: サービス情報
    """
    return {
        "service": "FastAPI Sidecar Service",
        "version": "0.1.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "calc": "/calc/add",
            "docs": "/docs"
        }
    }
