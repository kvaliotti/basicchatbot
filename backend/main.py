from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import Conversation, Message
from schemas import (
    ChatRequest, ChatResponse, ConversationResponse, MessageResponse,
    PDFUploadResponse, PDFInfoResponse, DeletePDFRequest, DeletePDFResponse,
    DeepResearchRequest, DeepResearchResponse, LinkedInPostRequest, LinkedInPostResponse,
    AgentLogsResponse, AgentLogEntry, WorkingDirectoryResponse, WorkingDirectoryFile,
    FileContentRequest, FileContentResponse
)
from openai_service import OpenAIService
from rag_service import RAGService

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize RAG service
rag_service = RAGService()

app = FastAPI(title="Chatapp API", version="1.0.0")

# Add CORS middleware
import os

# Determine allowed origins based on environment
if os.getenv("ENVIRONMENT") == "production":
    allowed_origins = ["*"]  # Allow all origins in production (you can restrict this later)
else:
    allowed_origins = ["http://localhost:3000"]  # Local development only

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Chatapp API is running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Send a message to the AI and get a response (with optional RAG)
    """
    try:
        # Get or create conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id
        ).first() if request.conversation_id else None
        
        if not conversation:
            conversation = Conversation()
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Get conversation history BEFORE adding the new user message
        # This ensures we get all previous messages for context
        existing_messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at).all()
        
        # Convert to OpenAI format
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in existing_messages
        ]
        
        # Save user message AFTER getting history
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        
        # Process chat mode - ensure proper enum handling
        chat_mode_str = request.chat_mode.value if hasattr(request.chat_mode, 'value') else str(request.chat_mode) if request.chat_mode else "general"
        
        # Get PDF context if PDF is selected
        pdf_context = None
        if request.pdf_filename:
            pdf_context = rag_service.get_relevant_context(
                request.pdf_filename, 
                request.message, 
                k=3
            )
        
        # Get AI response using appropriate mode (with optional PDF context)
        openai_service = OpenAIService(request.api_key)
        ai_response = openai_service.get_expert_response(
            request.message, 
            conversation_history,
            pdf_context=pdf_context,
            chat_mode=chat_mode_str
        )
        
        # Save AI response
        ai_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=ai_response
        )
        db.add(ai_message)
        db.commit()
        
        return ChatResponse(
            conversation_id=conversation.id,
            response=ai_response
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and process a PDF file for RAG
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Process PDF using RAG service
        result = await rag_service.process_pdf(file)
        
        return PDFUploadResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.get("/api/pdfs", response_model=List[PDFInfoResponse])
async def get_uploaded_pdfs():
    """
    Get list of uploaded PDFs
    """
    try:
        files = rag_service.get_uploaded_files()
        return [PDFInfoResponse(**file_info) for file_info in files]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/pdfs", response_model=DeletePDFResponse)
async def delete_pdf(request: DeletePDFRequest):
    """
    Delete an uploaded PDF and its vector database
    """
    try:
        success = rag_service.delete_file(request.filename)
        if success:
            return DeletePDFResponse(
                success=True,
                message=f"Successfully deleted {request.filename}"
            )
        else:
            return DeletePDFResponse(
                success=False,
                message=f"File {request.filename} not found"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/deep-research", response_model=DeepResearchResponse)
async def deep_research_endpoint(request: DeepResearchRequest):
    """
    Deep research endpoint using LangGraph agent with multiple tools
    """
    try:
        # Validate inputs
        if not request.message or request.message.strip() == "":
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if not request.api_key or request.api_key.strip() == "":
            raise HTTPException(status_code=400, detail="OpenAI API key is required")
        
        from deepresearchagent import run_research_agent
        
        # Convert conversation history to the format expected by the agent
        conversation_history = None
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        # Run the research agent with tools and conversation history
        result = run_research_agent(
            query=request.message,
            openai_api_key=request.api_key,
            tavily_api_key=request.tavily_api_key,
            conversation_history=conversation_history
        )
        
        # Convert research steps to the schema format
        from schemas import ResearchStep
        research_steps = [
            ResearchStep(
                step_number=step["step_number"],
                tool_name=step["tool_name"],
                tool_input=step["tool_input"],
                tool_output=step["tool_output"],
                timestamp=step["timestamp"]
            )
            for step in result["research_steps"]
        ]
        
        return DeepResearchResponse(
            final_answer=result["final_answer"],
            research_steps=research_steps
        )
        
    except Exception as e:
        # Handle OpenAI API key errors specifically
        error_message = str(e)
        if "401" in error_message and "Incorrect API key" in error_message:
            raise HTTPException(
                status_code=401, 
                detail="Invalid OpenAI API key. Please check your API key and try again."
            )
        elif "401" in error_message:
            raise HTTPException(
                status_code=401, 
                detail="Authentication failed. Please check your API key."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Deep research error: {error_message}")

@app.post("/api/linkedin-writer", response_model=LinkedInPostResponse)
async def linkedin_writer_endpoint(request: LinkedInPostRequest):
    """
    LinkedIn post writing endpoint using multi-crew agent system
    """
    try:
        # Validate inputs
        if not request.message or request.message.strip() == "":
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if not request.api_key or request.api_key.strip() == "":
            raise HTTPException(status_code=400, detail="OpenAI API key is required")
        
        from threeteamagent import run_linkedin_agent
        
        # Get RAG service if PDF is specified
        rag_service_instance = None
        if request.pdf_filename:
            rag_service_instance = rag_service
        
        # Run the LinkedIn agent
        result = run_linkedin_agent(
            query=request.message,
            openai_api_key=request.api_key,
            tavily_api_key=request.tavily_api_key,
            rag_service=rag_service_instance,
            pdf_filename=request.pdf_filename
        )
        
        return LinkedInPostResponse(
            final_answer=result["final_answer"],
            working_directory=result.get("working_directory"),
            execution_logs=result.get("execution_logs", [])
        )
        
    except Exception as e:
        # Handle OpenAI API key errors specifically
        error_message = str(e)
        if "401" in error_message and "Incorrect API key" in error_message:
            raise HTTPException(
                status_code=401, 
                detail="Invalid OpenAI API key. Please check your API key and try again."
            )
        elif "401" in error_message:
            raise HTTPException(
                status_code=401, 
                detail="Authentication failed. Please check your API key."
            )
        else:
            raise HTTPException(status_code=500, detail=f"LinkedIn agent error: {error_message}")

@app.get("/api/agent-logs", response_model=AgentLogsResponse)
async def get_agent_logs():
    """
    Get current agent execution logs
    """
    try:
        from threeteamagent import get_execution_logs, get_working_directory
        
        logs = get_execution_logs()
        working_dir = get_working_directory()
        
        # Convert logs to schema format
        agent_logs = [
            AgentLogEntry(
                timestamp=log["timestamp"],
                agent_name=log["agent_name"],
                action=log["action"],
                details=log["details"]
            )
            for log in logs
        ]
        
        return AgentLogsResponse(
            logs=agent_logs,
            working_directory=working_dir
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting agent logs: {str(e)}")

@app.get("/api/working-directory/{working_directory:path}", response_model=WorkingDirectoryResponse)
async def get_working_directory_files(working_directory: str):
    """
    Get files from the agent working directory
    """
    try:
        import os
        from pathlib import Path
        from datetime import datetime
        
        # Validate directory exists and is safe
        work_dir = Path(working_directory)
        if not work_dir.exists():
            raise HTTPException(status_code=404, detail="Working directory not found")
        
        if not work_dir.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        # Get all files in directory
        files = []
        for file_path in work_dir.rglob("*"):
            if file_path.is_file():
                try:
                    stat = file_path.stat()
                    
                    # Read preview (first 200 chars)
                    preview = ""
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            preview = f.read(200)
                    except:
                        preview = "[Binary file or encoding error]"
                    
                    files.append(WorkingDirectoryFile(
                        filename=file_path.name,
                        file_path=str(file_path.relative_to(work_dir)),
                        size=stat.st_size,
                        modified=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        content_preview=preview
                    ))
                except Exception as e:
                    # Skip files that can't be processed
                    continue
        
        return WorkingDirectoryResponse(
            files=files,
            directory_path=str(work_dir)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading working directory: {str(e)}")

@app.post("/api/file-content", response_model=FileContentResponse)
async def get_file_content(request: FileContentRequest):
    """
    Get full content of a file from working directory
    """
    try:
        from pathlib import Path
        
        work_dir = Path(request.working_directory)
        file_path = work_dir / request.filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Read file content
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File cannot be read as text")
        
        stat = file_path.stat()
        
        return FileContentResponse(
            filename=request.filename,
            content=content,
            file_path=str(file_path.relative_to(work_dir)),
            size=stat.st_size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@app.get("/api/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db)):
    """
    Get all conversations
    """
    conversations = db.query(Conversation).all()
    return [
        ConversationResponse(
            id=conv.id,
            created_at=conv.created_at,
            messages=[
                MessageResponse(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at
                )
                for msg in conv.messages
            ]
        )
        for conv in conversations
    ]

@app.post("/api/conversations", response_model=ConversationResponse)
def create_conversation(db: Session = Depends(get_db)):
    """
    Create a new conversation
    """
    conversation = Conversation()
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return ConversationResponse(
        id=conversation.id,
        created_at=conversation.created_at,
        messages=[]
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 