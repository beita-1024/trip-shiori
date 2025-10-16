"""内部専用 AI ルータ（/internal/ai/*）。"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.core.config import require_internal_token
from app.models.ai import (
    EventsCompleteRequest,
    ItineraryEditRequest,
    ItineraryEditResponse,
    Event,
)
from app.services.ai_langchain import complete_event, edit_itinerary


router = APIRouter(prefix="/internal/ai")


# INFO: そもそもサービス内でしかアクセスできないのに、
#       require_internal_tokenが必要なのか？
#       実装時の邪魔になるので一旦、コメントアウトしておく

# TODO: セキュリティ強化をする際には、require_internal_tokenを復活させる

# def _auth_internal(x_internal_token: str | None = Header(None)) -> None:
#     try:
#         require_internal_token(x_internal_token)
#     except ValueError as e:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

# INFO: コンテナの外からアクセスできないので実装時には
# Make sh-backend で入って以下のコマンドで動作確認する。
# curl -sS -X POST http://127.0.0.1:6000/internal/ai/events-complete
#   -H "Content-Type: application/json"
#   -d '{
#     "event1": { "time": "10:00", "end_time": "10:30", "title": "出発", "description": "ホテルを出発", "icon": "mdi-car" },
#     "event2": { "time": "12:00", "end_time": "13:00", "title": "昼食", "description": "レストランで昼食", "icon": "mdi-food" }
#   }'

# curl -sS -X POST http://127.0.0.1:6000/internal/ai/itinerary-edit
#   -H "Content-Type: application/json"
#   -d '{
#     "originalItinerary": {
#       "title": "テスト旅程",
#       "subtitle": "テストサブタイトル",
#       "description": "テスト説明",
#       "days": [
#         {
#           "date": "2024-01-01",
#           "events": [
#             { "time": "10:00", "end_time": "10:30", "title": "出発", "description": "ホテルを出発", "icon": "mdi-car" }
#           ]
#         }
#       ]
#     },
#     "editPrompt": "イベントを増やして沖縄旅行にしてください。"
#   }'
@router.post("/events-complete", response_model=Event)  # , dependencies=[Depends(_auth_internal)])
def events_complete(body: EventsCompleteRequest) -> Event:
    """イベント補完（内部用）。"""

    if body.dummy:
        return Event(
            time="11:00",
            end_time="11:30",
            title="移動",
            description="移動します。",
            icon="mdi-train",
        )

    result = complete_event(body.event1.model_dump(), body.event2.model_dump())
    return Event(**result)


@router.post(
    "/itinerary-edit",
    response_model=ItineraryEditResponse,
    # dependencies=[Depends(_auth_internal)],
)
def itinerary_edit(body: ItineraryEditRequest) -> ItineraryEditResponse:
    """旅程編集（内部用）。
    
    NOTE: Python側はシンプルに保ち、サニタイズやバリデーションはTypeScript側で受け持つ。
    diffPatchはTypeScript側で生成するため、Python側では返さない。
    """

    result = edit_itinerary(body.originalItinerary.model_dump(), body.editPrompt)
    return ItineraryEditResponse(**result)

