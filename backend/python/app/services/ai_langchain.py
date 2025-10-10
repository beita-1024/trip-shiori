"""LangChainベースのAIサービス実装。"""

from typing import Any, Optional
import re
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    # 遅延インポート可能に（テスト容易化）
    from langchain_openai import ChatOpenAI
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate
    HAS_LANGCHAIN = True
    _IMPORT_ERR = None
except Exception as e:  # pragma: no cover - インストール前の静的解析回避
    HAS_LANGCHAIN = False
    _IMPORT_ERR = e


def sanitize_user_text(text: str) -> str:
    """ユーザー入力を簡易サニタイズする（長さ・制御文字・HTML/URL）。

    Args:
        text: 入力文字列

    Returns:
        サニタイズ後の文字列
    """

    if not isinstance(text, str):
        return ""
    truncated = text[:1000]
    no_ctrl = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", truncated)
    no_html = re.sub(r"<[^>]+>", "", no_ctrl)
    no_urls = re.sub(r"https?://\S+", "", no_html)
    return no_urls.strip()


def create_llm() -> Any:
    """LLMインスタンスを生成する。OpenAI設定は環境変数から読み込む。"""
    if not HAS_LANGCHAIN:
        raise RuntimeError(f"LangChain not available: {_IMPORT_ERR}")
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    # ヘッダ要件: HTTPヘッダ値はASCIIのみ許可。APIキーに非ASCIIが混入していないか検査。
    api_key = settings.openai_api_key.strip()
    try:
        api_key.encode("ascii")
    except UnicodeEncodeError as e:
        raise RuntimeError("OPENAI_API_KEY contains non-ASCII characters") from e
    logger.info(
        "create_llm: initializing ChatOpenAI (model=%s, temperature=%s, timeout=%s)",
        settings.openai_model,
        settings.openai_temperature,
        settings.llm_timeout_sec,
    )
    return ChatOpenAI(
        model=settings.openai_model,
        temperature=settings.openai_temperature,
        api_key=api_key,
        timeout=settings.llm_timeout_sec,
        # OpenAI Chat CompletionsのJSON強制（対応モデルのみ: gpt-4o/-mini等）
        model_kwargs={
            "response_format": {"type": "json_object"}
        },
    )


def complete_event(event1: dict, event2: dict) -> dict:
    """2イベントの間を補完するイベントを生成する。"""

    llm = create_llm()
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "あなたは旅程作成の専門家です。出力は必ず1つのJSONオブジェクトのみ。"
                    "コードフェンス（```）や説明文は一切含めないでください。"
                    "キーは time, end_time, title, description, icon のみ。"
                ),
            ),
            (
                "human",
                (
                    "次の2つのイベントの間を埋めるイベントを1件提案してください。\n"
                    "制約: time/end_timeはHH:MM。iconは与えられた候補のみ。日本語で説明。\n"
                    "event1: {event1}\n"
                    "event2: {event2}\n"
                    "出力キー: time, end_time, title, description, icon"
                ),
            ),
        ]
    )
    chain = prompt | llm | StrOutputParser()
    raw = chain.invoke({"event1": event1, "event2": event2})
    logger.debug("complete_event raw response: %r", raw)

    # 単純なJSONらしき抽出（厳密検証はTS側/既存と同様に実施）
    import json

    try:
        obj = json.loads(raw)
        return {
            "time": obj.get("time", "11:00"),
            "end_time": obj.get("end_time", "11:30"),
            "title": obj.get("title", "移動"),
            "description": obj.get("description", "移動します。"),
            "icon": obj.get("icon", "mdi-train"),
        }
    except Exception as e:
        logger.warning(
            "complete_event JSON parse failed: %s | raw=%r", e, raw
        )
        # フォールバック（フォーマット乱れ時）
        return {
            "time": "11:00",
            "end_time": "11:30",
            "title": "移動",
            "description": "移動します。",
            "icon": "mdi-train",
        }


def edit_itinerary(itinerary: dict, edit_prompt: str) -> dict:
    """旅程編集リクエストに基づく更新を生成する（シンプル化）。
    
    NOTE: Python側はシンプルに保ち、サニタイズやバリデーションはTypeScript側で受け持つ。
    diffPatchはTypeScript側で生成するため、Python側では返さない。
    """

    llm = create_llm()
    # NOTE: サニタイズはTypeScript側で受け持つため、Python側では簡易的な処理のみ
    safe_prompt = sanitize_user_text(edit_prompt)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "あなたは旅程編集の専門家です。出力は必ず1つのJSONオブジェクトのみ。"
                    "コードフェンス（```）や説明文は一切含めないでください。"
                    "キーは modifiedItinerary, changeDescription のみ。"
                ),
            ),
            (
                "human",
                (
                    "元の旅程: {itinerary}\n"
                    "編集指示: {edit_prompt}\n"
                    "出力: modifiedItinerary, changeDescription"
                ),
            ),
        ]
    )
    chain = prompt | llm | StrOutputParser()
    raw = chain.invoke({"itinerary": itinerary, "edit_prompt": safe_prompt})
    logger.debug("edit_itinerary raw response: %r", raw)

    import json
    try:
        obj = json.loads(raw)
        return {
            "modifiedItinerary": obj.get("modifiedItinerary", itinerary),
            "changeDescription": obj.get("changeDescription", "変更を適用しました"),
        }
    except Exception as e:
        logger.warning(
            "edit_itinerary JSON parse failed: %s | raw=%r", e, raw
        )
        return {
            "modifiedItinerary": itinerary,
            "changeDescription": "変更を適用しました",
        }


