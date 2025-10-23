"""AI関連のPydanticモデルパッケージ."""

from .ai import (
    Event,
    Day,
    Itinerary,
    EventsCompleteRequest,
    ItineraryEditRequest,
    ItineraryEditResponse,
)

__all__ = [
    "Event",
    "Day", 
    "Itinerary",
    "EventsCompleteRequest",
    "ItineraryEditRequest",
    "ItineraryEditResponse",
]
