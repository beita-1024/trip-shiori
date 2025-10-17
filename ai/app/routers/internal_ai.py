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


def _auth_internal(x_internal_token: str | None = Header(None)) -> None:
    """内部認証ミドルウェア
    
    X-Internal-Tokenヘッダを検証し、正しいトークンでない場合は403エラーを返す。
    """
    try:
        require_internal_token(x_internal_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.post("/events-complete", response_model=Event, dependencies=[Depends(_auth_internal)])
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
    dependencies=[Depends(_auth_internal)],
)
def itinerary_edit(body: ItineraryEditRequest) -> ItineraryEditResponse:
    """旅程編集（内部用）。
    
    NOTE: Python側はシンプルに保ち、サニタイズやバリデーションはTypeScript側で受け持つ。
    diffPatchはTypeScript側で生成するため、Python側では返さない。
    """

    result = edit_itinerary(body.originalItinerary.model_dump(), body.editPrompt)
    return ItineraryEditResponse(**result)

