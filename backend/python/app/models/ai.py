"""AI関連のPydanticモデル（既存OpenAPI仕様に準拠）。"""

from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any


class Event(BaseModel):
    time: str = Field(..., description="開始時刻（HH:MM形式）")
    end_time: str = Field(..., description="終了時刻（HH:MM形式）")
    title: str = Field(..., description="イベントタイトル")
    description: str = Field(..., description="イベントの詳細説明")
    icon: str = Field(..., description="アイコン名")


class Day(BaseModel):
    date: Optional[str] = Field(default=None, description="日付（オプション）")
    events: List[Event] = Field(default_factory=list, description="その日のイベント一覧")


class Itinerary(BaseModel):
    title: str = Field(..., description="旅程タイトル")
    subtitle: Optional[str] = Field(default=None, description="サブタイトル（オプション）")
    description: Optional[str] = Field(default=None, description="旅程説明（オプション）")
    days: List[Day] = Field(..., description="日程一覧")


class EventsCompleteRequest(BaseModel):
    event1: Event
    event2: Event
    dummy: Optional[bool] = Field(default=False, description="ダミーモード")


class ItineraryEditRequest(BaseModel):
    originalItinerary: Itinerary
    editPrompt: str = Field(..., min_length=1, max_length=1000, description="編集指示")


class ItineraryEditResponse(BaseModel):
    """旅程編集レスポンス（シンプル化）
    
    NOTE: Python側はシンプルに保ち、サニタイズやバリデーションはTypeScript側で受け持つ。
    diffPatchはTypeScript側で生成するため、Python側では返さない。
    """
    modifiedItinerary: Itinerary
    changeDescription: str


