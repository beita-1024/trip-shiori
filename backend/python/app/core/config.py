"""アプリ設定の読み込みと共有ユーティリティ。"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """アプリケーション設定。

    環境変数から内部通信トークンやOpenAI設定を読み込む。
    """

    internal_ai_token: str | None = Field(default=None, validation_alias="INTERNAL_AI_TOKEN")
    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")
    openai_temperature: float = Field(default=0.3, validation_alias="OPENAI_TEMPERATURE")
    llm_timeout_sec: int = Field(default=30, validation_alias="LLM_TIMEOUT_SEC")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def require_internal_token(token: str | None) -> None:
    """内部トークン検証。無効な場合は例外を送出する。

    Args:
        token: リクエストヘッダ `X-Internal-Token` の値

    Raises:
        ValueError: トークンが未設定または一致しない
    """
    # 内部トークンが設定されていない場合は検証をスキップ
    if settings.internal_ai_token is None:
        return

    if not token or token != settings.internal_ai_token:
        raise ValueError("invalid internal token")


