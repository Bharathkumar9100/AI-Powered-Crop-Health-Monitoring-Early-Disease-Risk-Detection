"""Chat and AI assistant schemas."""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "farmer" or "assistant"
    content: str
    timestamp: Optional[str] = None
    language: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en", pattern="^(en|ta|hi|te|ml)$")
    conversation_id: Optional[int] = None
    context: Optional[dict] = None  # Current analysis context


class ChatResponse(BaseModel):
    conversation_id: int
    response: str
    language: str
    is_demo: bool = False


class ChatHistoryResponse(BaseModel):
    conversation_id: int
    messages: List[ChatMessage]
    language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
