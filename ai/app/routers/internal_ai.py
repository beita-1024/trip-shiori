"""内部専用 AI ルータ（/internal/ai/*）。"""

from fastapi import APIRouter
from app.models.ai import (
    EventsCompleteRequest,
    ItineraryEditRequest,
    ItineraryEditResponse,
    Event,
)
from app.services.ai_langchain import complete_event, edit_itinerary


router = APIRouter(prefix="/internal/ai")

@router.post("/events-complete", response_model=Event)
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
)
def itinerary_edit(body: ItineraryEditRequest) -> ItineraryEditResponse:
    """旅程編集（内部用）。
    
    NOTE: Python側はシンプルに保ち、サニタイズやバリデーションはTypeScript側で受け持つ。
    diffPatchはTypeScript側で生成するため、Python側では返さない。
    """

    result = edit_itinerary(body.originalItinerary.model_dump(), body.editPrompt)
    return ItineraryEditResponse(**result)

