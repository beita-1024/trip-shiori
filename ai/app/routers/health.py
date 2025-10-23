"""Health check router for FastAPI sidecar service."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str
    service: str = "fastapi-sidecar"
    version: str = "0.1.0"
    environment_variables: Dict[str, str] = {}



@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """ヘルスチェックエンドポイント
    
    FastAPI 内部サービスの稼働状況を確認する。
    環境変数の設定状況も含めて返す。
    
    Returns:
        HealthResponse: サービス状態情報と環境変数設定状況
        
    Example:
        >>> response = health_check()
        >>> response.status
        'ok'
    """
    # 環境変数の設定状況をマスクして表示
    env_vars = {
        "CEREBRAS_API_KEY": "***masked***" if settings.cerebras_api_key else "not set",
        "OPENAI_API_KEY": "***masked***" if settings.openai_api_key else "not set",
        "TAVILY_API_KEY": "***masked***" if settings.tavily_api_key else "not set",
    }
    
    return HealthResponse(status="ok", environment_variables=env_vars)
