# Technical Specifications

## Backend (FastAPI)

### Dependencies
- fastapi
- uvicorn[standard]
- gunicorn
- sqlalchemy
- psycopg2-binary
- openai
- python-dotenv
- pydantic
- python-multipart
- fastapi-cors
- **PyPDF2>=3.0.1** (NEW - PDF processing)
- **numpy>=1.24.0** (NEW - Vector operations)

### API Endpoints

#### Chat Endpoints
- `POST /api/chat` - Send message and get AI response (supports RAG mode)
- `GET /api/conversations` - Get conversation history
- `POST /api/conversations` - Create new conversation

#### RAG/PDF Endpoints (NEW)
- `POST /api/upload-pdf` - Upload and process PDF for RAG
- `GET /api/pdfs` - Get list of uploaded PDFs
- `DELETE /api/pdfs` - Delete uploaded PDF and its vector database

### Database Schema
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    role VARCHAR(10) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### RAG Architecture (NEW)

#### RAG Service (`rag_service.py`)
- **PDF Processing**: Extracts text from uploaded PDFs
- **Text Chunking**: Splits documents into manageable chunks (1000 chars, 200 overlap)
- **Vector Indexing**: Creates embeddings using OpenAI embedding model
- **Semantic Search**: Retrieves relevant chunks using cosine similarity
- **Response Generation**: Generates contextualized responses using retrieved content

#### aimakerspace Integration
```python
# Key components used:
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.chatmodel import ChatOpenAI
from aimakerspace.openai_utils.prompts import SystemRolePrompt, UserRolePrompt
```

#### Vector Database
- **Storage**: In-memory per session (dict-based)
- **Similarity**: Cosine similarity for vector search
- **Retrieval**: Top-k relevant chunks (default k=3)
- **Embedding Model**: OpenAI text-embedding-3-small

### OpenAI Integration

#### Models Used
- **Chat**: gpt-4.1
- **Embeddings**: text-embedding-3-small
- **API Key**: User-provided via frontend

#### System Prompts

**Expert Consultant Mode** (Original):
```
You are a mixture of three expert consultants: McKinsey, BCG, and Bain.
[... existing expert prompt ...]
```

**RAG Mode** (NEW):
```
You are an AI assistant that answers questions based on the provided context from a PDF document.

Instructions:
1. Use ONLY the information provided in the context below to answer questions
2. If the context doesn't contain enough information, say so clearly
3. Provide specific quotes or references from the context when possible
4. If asked about something not in the context, explain that the information is not available
5. Be precise and factual in your responses

Context from PDF:
{context}
```

## Frontend (React)

### Dependencies
- react
- typescript
- @types/react
- @types/react-dom
- axios
- tailwindcss
- **All existing dependencies**

### Components

#### Original Components
- `App` - Main application component
- `ApiKeyInput` - OpenAI API key input
- `ChatInterface` - Main chat interface
- `MessageList` - Display chat messages
- `MessageInput` - Input new messages

#### New RAG Components
- **`PDFManager`** (NEW) - PDF upload, list, select, delete functionality
  - File upload with validation
  - PDF metadata display (chunks, size, characters)
  - Visual selection interface
  - Delete confirmation

#### Enhanced Components
- **`ChatInterface`** - Now supports dual-mode operation
  - Mode indicator (Expert Chat vs PDF Chat)
  - Dynamic placeholder text
  - Automatic conversation reset on mode switch
- **`MessageInput`** - Accepts customizable placeholder
- **`MessageList`** - Updated welcome message for RAG

### State Management
- React hooks for local state
- Context API for global state (API key, conversations)
- **PDF selection state** (NEW) - tracks currently selected PDF
- **Dual chat modes** (NEW) - expert vs RAG mode indication

### Type System (Enhanced)
```typescript
// API Types
interface ChatRequest {
  message: string;
  api_key: string;
  conversation_id?: number;
  pdf_filename?: string; // NEW - for RAG mode
}

// PDF Management Types (NEW)
interface PDFUploadResponse {
  filename: string;
  chunks_count: number;
  status: string;
  message: string;
}

interface PDFInfo {
  filename: string;
  chunks_count: number;
  total_length: number;
  file_size: number;
}
```

## Database (PostgreSQL)

### Connection
- Host: localhost (development) / Neon (production)
- Database: chatapp
- User: myuser
- Password: mypassword

### Environment Variables
```
DATABASE_URL=postgresql://myuser:mypassword@localhost/chatapp
OPENAI_API_KEY=user_provided_key
REACT_APP_API_URL=backend_url (production)
```

## RAG Pipeline Flow

### PDF Processing Pipeline
1. **Upload**: User selects PDF file via web interface
2. **Validation**: Backend validates file type and size
3. **Text Extraction**: PyPDF2 extracts text from all pages
4. **Chunking**: Text split into overlapping chunks (1000/200)
5. **Embedding**: OpenAI creates vector embeddings for each chunk
6. **Storage**: Vectors stored in in-memory database with metadata
7. **Indexing**: Ready for semantic search queries

### RAG Query Pipeline
1. **Query Input**: User sends message in RAG mode
2. **Vector Search**: Query embedded and compared to document vectors
3. **Retrieval**: Top-3 most similar chunks retrieved
4. **Context Assembly**: Relevant chunks formatted as context
5. **Response Generation**: OpenAI generates answer using context
6. **Conversation History**: Previous messages included for continuity

### Performance Characteristics
- **Upload Processing**: ~2-5 seconds for typical PDFs
- **Query Response**: ~3-8 seconds including embedding + generation
- **Memory Usage**: ~1MB per 100 PDF pages (vectors only)
- **Concurrent Users**: Limited by in-memory storage

## Production Considerations

### Current Limitations
- **Vector Storage**: In-memory only (session-based)
- **File Storage**: Temporary processing only
- **Scalability**: Single-instance vector databases
- **Persistence**: No vector persistence across restarts

### Recommended Enhancements
1. **Persistent Vector Storage**: Redis or PostgreSQL with pgvector
2. **File Storage**: S3 or DigitalOcean Spaces for PDF archival
3. **Caching**: Vector and response caching for performance
4. **Rate Limiting**: File upload and API request limits
5. **Monitoring**: Usage analytics and error tracking
6. **Security**: File scanning and size limits

### Deployment Requirements
- **Memory**: Additional 512MB-1GB for vector operations
- **CPU**: PDF processing is CPU-intensive
- **Storage**: Temporary space for PDF processing
- **Network**: OpenAI API bandwidth for embeddings 