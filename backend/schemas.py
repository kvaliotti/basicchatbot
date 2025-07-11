from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

# NEW: Chat mode enumeration
class ChatMode(str, Enum):
    general = "general"
    research_reviewer = "research_reviewer"

class ChatRequest(BaseModel):
    message: str
    api_key: str
    conversation_id: Optional[int] = None
    pdf_filename: Optional[str] = None  # For RAG with specific PDF
    chat_mode: Optional[ChatMode] = ChatMode.general  # NEW: Chat mode selection

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

# New schemas for PDF/RAG functionality
class PDFUploadResponse(BaseModel):
    filename: str
    chunks_count: int
    status: str
    message: str

class PDFInfoResponse(BaseModel):
    filename: str
    chunks_count: int
    total_length: int
    file_size: int

class DeletePDFRequest(BaseModel):
    filename: str

class DeletePDFResponse(BaseModel):
    success: bool
    message: str

# Deep Research schemas
class DeepResearchRequest(BaseModel):
    message: str
    api_key: str
    tavily_api_key: Optional[str] = None

class ResearchStep(BaseModel):
    step_number: int
    tool_name: str
    tool_input: str
    tool_output: str
    timestamp: str

class DeepResearchResponse(BaseModel):
    final_answer: str
    research_steps: List[ResearchStep] 