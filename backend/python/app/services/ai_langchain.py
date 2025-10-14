"""LangChainベースのAIサービス実装。"""

from typing import Any, Optional, List, Dict, Literal, Annotated
import re
import logging
import requests
import inspect
import time
from openai import RateLimitError


from app.core.config import settings

logger = logging.getLogger(__name__)

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool, StructuredTool
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent


def check_tavily_usage() -> Optional[Dict[str, Any]]:
    """Tavily APIの使用状況をチェックする。
    
    Returns:
        API使用状況の情報、またはエラーの場合はNone
    """
    if not settings.tavily_api_key:
        logger.warning("Tavily API key not configured")
        return None
    
    try:
        headers = {"Authorization": f"Bearer {settings.tavily_api_key}"}
        response = requests.get("https://api.tavily.com/usage", headers=headers, timeout=10)
        
        if response.status_code == 200:
            usage_data = response.json()
            logger.info("Tavily API usage: %s", usage_data)
            return usage_data
        else:
            logger.warning("Tavily API usage check failed: %s %s", response.status_code, response.text)
            return None
            
    except Exception as e:
        logger.warning("Tavily API usage check error: %s", e)
        return None


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
    """LLMインスタンスを生成する。Cerebras優先でOpenAI互換を利用。

    優先順位: Cerebrasが設定されていればCerebrasを使用。無ければOpenAI設定を使用。
    """
    
    
    # Cerebras or OpenAI
    use_cerebras = bool(settings.cerebras_api_key)
    logger.debug(f"create_llm: use_cerebras = {use_cerebras}")
    api_key = (settings.cerebras_api_key if use_cerebras else settings.openai_api_key)
    if not api_key:
        raise RuntimeError("No API key configured for LLM (CEREBRAS_API_KEY or OPENAI_API_KEY)")
    # ヘッダ要件: HTTPヘッダ値はASCIIのみ許可。APIキーに非ASCIIが混入していないか検査。
    api_key = api_key.strip()
    try:
        api_key.encode("ascii")
    except UnicodeEncodeError as e:
        raise RuntimeError("LLM API key contains non-ASCII characters") from e
    logger.info(
        "create_llm: initializing ChatOpenAI (provider=%s, model=%s, temperature=%s, timeout=%s)",
        "cerebras" if use_cerebras else "openai",
        settings.cerebras_model if use_cerebras else settings.openai_model,
        0 if use_cerebras else settings.openai_temperature,
        settings.llm_timeout_sec,
    )
    if use_cerebras:
        # CerebrasはOpenAI互換。未対応のパラメータに注意（presence/frequency等）。
        return ChatOpenAI(
            model=settings.cerebras_model,
            api_key=api_key,
            base_url=settings.cerebras_base_url,
            temperature=0,
            timeout=settings.llm_timeout_sec,
            # Cerebras Chat CompletionsのJSON強制（OpenAI互換）
            # model_kwargs={
            #     "response_format": {"type": "json_object"}
            # },
        )
    else:
        return ChatOpenAI(
            model=settings.openai_model,
            temperature=settings.openai_temperature,
            api_key=api_key,
            timeout=settings.llm_timeout_sec,
            # # OpenAI Chat CompletionsのJSON強制（対応モデルのみ: gpt-4o/-mini等）
            # model_kwargs={
            #     "response_format": {"type": "json_object"}
            # },
        )

def make_tavily_capped_tool(max_per_run: int = 3):
    used = 0  # ← このtoolインスタンス専用のカウンタ（外に漏れない）

    def tavily_search_capped(
        query: Annotated[str, "検索クエリ"],
        max_results: Annotated[int, "最大検索結果数"] = 5,
        depth: Annotated[Literal["basic", "advanced"], "検索深度"] = "basic",
    ) -> Annotated[List[Dict[str, Any]], "検索結果のリスト"]:
        """Tavily検索（1実行あたりの回数上限つき）。"""
        nonlocal used
        if used >= max_per_run:
            return [{"url":"", "content":"[tavily] この実行での上限に達しました。"}]
        logger.info("tavily_search_capped CALL %s/%s depth=%s max_results=%s query=%r", used + 1, max_per_run, depth, max_results, query)

        used += 1
        return TavilySearch(
            max_results=max_results,
            include_answer=True,
            include_raw_content=False,
            search_depth=depth,
        ).invoke(query)

    # StructuredToolを使用して明示的にツールを定義
    return StructuredTool.from_function(
        func=tavily_search_capped,
        name="tavily_search_capped",
        description="Tavily検索（1実行あたりの回数上限つき）"
    )


def complete_event(event1: dict, event2: dict) -> dict:
    """2イベントの間を補完するイベントを生成する。"""

    llm = create_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system",
            "あなたは旅程作成の専門家です。出力は必ず1つのJSONオブジェクトのみ。\n"
            "コードフェンス（```）や説明文は一切含めないでください。\n"
            "キーは time, end_time, title, description, icon のみ。"),
        ("human",
            "２つのイベントの間を埋めるイベントを１つ作成してください。\n"
            "入力と同じ形式で返してください。descriptionは詳しくしてください。\n"
            "時刻は必ず \"HH:MM\" 形式（例: \"14:30\"）で返してください。ISO形式や日付を含めないでください。\n"
            "iconは必ず以下のいずれかで返してください。\n"
            "- \"mdi-map-marker\"\n"
            "- \"mdi-walk\"\n"
            "- \"mdi-train\"\n"
            "- \"mdi-bike\"\n"
            "- \"mdi-bus\"\n"
            "- \"mdi-airplane\"\n"
            "- \"mdi-camera\"\n"
            "- \"mdi-food\"\n"
            "- \"mdi-car\"\n"
            "次の2つのイベントの間を埋めるイベントを1件提案してください。\n"
            "制約: time/end_timeはHH:MM。iconは与えられた候補のみ。日本語で説明。\n"
            "event1: {event1}\n"
            "event2: {event2}\n"
            "出力キー: time, end_time, title, description, icon")
    ])
    # レート制限エラーに対応した安全な呼び出し
    try:
        chain = prompt | llm | StrOutputParser()
        raw = chain.invoke({"event1": event1, "event2": event2})
        logger.debug("complete_event raw response: %r", raw)
    except RateLimitError as e:
        logger.error(f"complete_event: レート制限エラー: {e}")
        # ユーザーに分かりやすいエラーメッセージを返す
        return {
            "time": "12:00",
            "end_time": "13:00", 
            "title": "AIサービス一時利用不可",
            "description": "申し訳ございません。現在AIサービスが高負荷のため、イベントの生成ができませんでした。しばらく時間をおいてから再度お試しください。",
            "icon": "mdi-information"
        }

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

    # RAGが有効ならRAG経由で試行し、失敗時は従来ロジックにフォールバック
    if settings.rag_enable and settings.tavily_api_key:
        # Tavily API使用状況のデバッグチェック
        logger.info("=== TAVILY API USAGE CHECK (edit_itinerary) ===")
        tavily_usage = check_tavily_usage()
        if tavily_usage:
            logger.info("Tavily API is available, proceeding with RAG")
            try:
                return rag_edit_itinerary(itinerary, edit_prompt)
            except Exception as e:
                import traceback
                tb_str = traceback.format_exc()
                logger.warning(
                    "rag_edit_itinerary failed, fallback to simple chain: %s\nTraceback:\n%s",
                    e, tb_str
                )
        else:
            logger.warning("Tavily API usage check failed, falling back to simple chain")
            # RAGをスキップして通常のチェーンに進む

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
    # レート制限エラーに対応した安全な呼び出し
    try:
        chain = prompt | llm | StrOutputParser()
        raw = chain.invoke({"itinerary": itinerary, "edit_prompt": safe_prompt})
        logger.debug("edit_itinerary raw response: %r", raw)
    except RateLimitError as e:
        logger.error(f"edit_itinerary: レート制限エラー: {e}")
        # ユーザーに分かりやすいエラーメッセージを返す
        return {
            "modifiedItinerary": itinerary,  # 元の旅程をそのまま返す
            "changeDescription": "申し訳ございません。現在AIサービスが高負荷のため、旅程の編集ができませんでした。しばらく時間をおいてから再度お試しください。"
        }

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


def rag_edit_itinerary(itinerary: dict, edit_prompt: str) -> dict:
    """RAGを用いて旅程を編集する。

    - Cerebras/OpenAI互換のLLM + Tavilyツール + ReActエージェント。
    - 返却スキーマは従来通り（modifiedItinerary, changeDescription）。
    """

    # ログ出力テスト
    logger.info("=== RAG_EDIT_ITINERARY START ===")
    logger.debug("=== DEBUG LOG TEST ===")

    # デバッグログ: 環境変数設定の確認
    logger.info(
        "RAG settings: rag_enable=%s, tavily_api_key=%s, tavily_max_per_run=%s",
        settings.rag_enable,
        "***" if settings.tavily_api_key else None,
        settings.tavily_max_per_run
    )
    
    # Tavily API使用状況のデバッグチェック
    logger.info("=== TAVILY API USAGE CHECK ===")
    tavily_usage = check_tavily_usage()
    if tavily_usage:
        logger.info("Tavily API is available and working")
    else:
        logger.warning("Tavily API usage check failed or API key not configured")

    llm = create_llm()
    logger.info("LLM created for RAG: %s", type(llm).__name__)
    # # Tavily APIキーは環境変数からlangchain_communityが内部で参照する
    # # 制限回数は設定値から
    # # カスタムツール（strict=True）を使用してReActエージェントとの互換性を確保
    # tavily = make_tavily_capped_tool(max_per_run=max(0, int(settings.tavily_max_per_run)))
    # logger.info("Tavily tool created with max_per_run=%s", max(0, int(settings.tavily_max_per_run)))

    # Tavily APIキーは環境変数からlangchain_communityが内部で参照する
    # 制限回数は設定値から
    # カスタムツール（PoCと同じ方式）を使用してReActエージェントとの互換性を確保
    tavily = make_tavily_capped_tool(max_per_run=max(0, int(settings.tavily_max_per_run)))
    logger.info("Tavily tool created with max_per_run=%s", max(0, int(settings.tavily_max_per_run)))

    agent = create_react_agent(llm, tools=[tavily])
    # logger.info("ReAct agent created with tools: %s", [tavily.name])

    # 入力構築（日本語での明確な指示）
    safe_prompt = sanitize_user_text(edit_prompt)
    # より明確な検索指示に変更

    question = (
        '検索結果を参考にして、旅程を改善してください。\n'
        '最終的にJSONオブジェクト1つのみを返してください（コードフェンスや説明文は不可）。\n'
        'iconは必ず以下のいずれかで返してください。\n'
        '- "mdi-map-marker"\n'
        '- "mdi-walk"\n'
        '- "mdi-train"\n'
        '- "mdi-bike"\n'
        '- "mdi-bus"\n'
        '- "mdi-airplane"\n'
        '- "mdi-camera"\n'
        '- "mdi-food"\n'
        '- "mdi-car"\n'
        'キーは modifiedItinerary, changeDescription のみ。\n'
        'modifiedItineraryは以下の形式です。\n'
        '{\n'
        '    "title": "旅行のタイトル",\n'
        '    "subtitle": "旅行のサブタイトル",\n'
        '    "description": "旅行の概要説明",\n'
        '    "days": [\n'
        '        {\n'
        '        "date": "YYYY-MM-DD",\n'
        '        "events": [\n'
        '            { \n'
        '            "title": "イベント名", \n'
        '            "time": "HH:MM", \n'
        '            "end_time": "HH:MM", \n'
        '            "description": "イベントの詳細説明", \n'
        '            "icon": "mdi-アイコン名" \n'
        '            }\n'
        '            // 他のイベント...\n'
        '        ]\n'
        '        }\n'
        '        // 他の日...\n'
        '    ]\n'
        '}\n'
        '\n'
        f'元の旅程: {itinerary}\n'
        f'編集指示: {safe_prompt}\n'
        '出力: modifiedItinerary, changeDescription'
    )

    logger.info("Starting RAG agent invocation with question length: %d", len(question))
    logger.debug("RAG question: %s", question)

    # テンプレート変数を適切に渡す
    result = agent.invoke({"messages": [("user", question)]})
    
    # エージェントの全メッセージをログ出力
    if isinstance(result, dict) and "messages" in result:
        logger.info("Agent completed with %d messages", len(result["messages"]))
        for i, msg in enumerate(result["messages"]):
            logger.debug("Agent message %d: %s", i, msg.content[:200] + "..." if len(msg.content) > 200 else msg.content)
    
    final_text = result["messages"][-1].content if isinstance(result, dict) else ""
    logger.info("Final agent response length: %d", len(final_text))

    import json
    try:
        obj = json.loads(final_text)
        return {
            "modifiedItinerary": obj.get("modifiedItinerary", itinerary),
            "changeDescription": obj.get("changeDescription", "変更を適用しました"),
        }
    except Exception as e:
        logger.warning("rag_edit_itinerary JSON parse failed: %s | raw=%r", e, final_text)
        return {
            "modifiedItinerary": itinerary,
            "changeDescription": "変更を適用しました",
        }


