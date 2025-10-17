"""Health check router for FastAPI sidecar service."""

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
from app.core.config import require_internal_token, settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    
    status: str
    service: str = "fastapi-sidecar"
    version: str = "0.1.0"
    environment_variables: Dict[str, str] = {}


class AuthHealthResponse(BaseModel):
    """Auth health check response model."""
    
    status: str
    message: str


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
        "INTERNAL_AI_TOKEN": "***masked***" if settings.internal_ai_token else "not set",
        "CEREBRAS_API_KEY": "***masked***" if settings.cerebras_api_key else "not set",
        "OPENAI_API_KEY": "***masked***" if settings.openai_api_key else "not set",
        "TAVILY_API_KEY": "***masked***" if settings.tavily_api_key else "not set",
    }
    
    return HealthResponse(status="ok", environment_variables=env_vars)


@router.get("/health/auth", response_model=AuthHealthResponse)
def auth_health_check(x_internal_token: str | None = Header(None)) -> AuthHealthResponse:
    """認証ヘルスチェックエンドポイント
    
    X-Internal-Tokenヘッダの妥当性を検証する。
    
    Args:
        x_internal_token: X-Internal-Tokenヘッダの値
        
    Returns:
        AuthHealthResponse: 認証結果
        
    Raises:
        HTTPException: 認証失敗時（403）
        
    Example:
        >>> response = auth_health_check("valid-token")
        >>> response.status
        'ok'
    """
    try:
        require_internal_token(x_internal_token)
        return AuthHealthResponse(
            status="ok",
            message="Internal token is valid"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
