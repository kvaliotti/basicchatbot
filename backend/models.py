from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey  # type: ignore
from sqlalchemy.orm import relationship  # type: ignore
from sqlalchemy.sql import func  # type: ignore
from database import Base

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship with messages
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String(10), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship with conversation
    conversation = relationship("Conversation", back_populates="messages") 