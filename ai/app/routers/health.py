"""Health check router for FastAPI sidecar service."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str
    service: str = "fastapi-sidecar"
    version: str = "0.1.0"


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """ヘルスチェックエンドポイント
    
    FastAPI 内部サービスの稼働状況を確認する。
    
    Returns:
        HealthResponse: サービス状態情報
        
    Example:
        >>> response = health_check()
        >>> response.status
        'ok'
    """
    return HealthResponse(status="ok")
