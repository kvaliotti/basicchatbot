from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

# Chat mode enumeration
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

# PDF Management schemas
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

# Deep Research Agent schemas
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class DeepResearchRequest(BaseModel):
    message: str
    api_key: str
    tavily_api_key: Optional[str] = None
    conversation_history: Optional[List[ChatMessage]] = None

class ResearchStep(BaseModel):
    step_number: int
    tool_name: str
    tool_input: str
    tool_output: str
    timestamp: str

class DeepResearchResponse(BaseModel):
    final_answer: str
    research_steps: List[ResearchStep] 

# LinkedIn Post Writing Agent schemas
class LinkedInPostRequest(BaseModel):
    message: str
    api_key: str
    tavily_api_key: Optional[str] = None
    pdf_filename: Optional[str] = None  # For RAG with uploaded PDF

# Agent execution logs schemas
class AgentLogEntry(BaseModel):
    timestamp: str
    agent_name: str
    action: str
    details: str

class LinkedInPostResponse(BaseModel):
    final_answer: str
    working_directory: Optional[str] = None
    execution_logs: Optional[List[AgentLogEntry]] = None

class AgentLogsResponse(BaseModel):
    logs: List[AgentLogEntry]
    working_directory: Optional[str] = None

# Working directory files schemas
class WorkingDirectoryFile(BaseModel):
    filename: str
    file_path: str
    size: int
    modified: str
    content_preview: str  # First 200 chars

class WorkingDirectoryResponse(BaseModel):
    files: List[WorkingDirectoryFile]
    directory_path: str

class FileContentRequest(BaseModel):
    working_directory: str
    filename: str

class FileContentResponse(BaseModel):
    filename: str
    content: str
    file_path: str
    size: int 