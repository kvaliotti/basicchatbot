from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    api_key: str
    conversation_id: Optional[int] = None

class ChatResponse(BaseModel):
    conversation_id: int
    response: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

class ConversationResponse(BaseModel):
    id: int
    created_at: datetime
    messages: List[MessageResponse] 