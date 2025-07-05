from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import Conversation, Message
from schemas import (
    ChatRequest, ChatResponse, ConversationResponse, MessageResponse,
    PDFUploadResponse, PDFInfoResponse, DeletePDFRequest, DeletePDFResponse
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
    uvicorn.run(app, host="0.0.0.0", port=8000) 