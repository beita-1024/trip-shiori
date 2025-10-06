"""Calculation router for FastAPI sidecar service."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Union

router = APIRouter()


class AddRequest(BaseModel):
    """足し算リクエストモデル."""
    
    a: Union[int, float] = Field(..., description="第1項")
    b: Union[int, float] = Field(..., description="第2項")


class AddResponse(BaseModel):
    """足し算レスポンスモデル."""
    
    result: Union[int, float] = Field(..., description="計算結果")
    operation: str = Field(default="add", description="実行された演算")


@router.post("/calc/add", response_model=AddResponse)
def add_numbers(request: AddRequest) -> AddResponse:
    """足し算を実行する
    
    2つの数値を受け取り、足し算の結果を返す。
    
    Args:
        request: 足し算のリクエスト（a, b）
        
    Returns:
        AddResponse: 計算結果
        
    Raises:
        HTTPException: 計算エラーが発生した場合（400）
        
    Example:
        >>> request = AddRequest(a=1, b=2)
        >>> response = add_numbers(request)
        >>> response.result
        3
    """
    try:
        result = request.a + request.b
        return AddResponse(result=result)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"計算エラーが発生しました: {str(e)}"
        )
