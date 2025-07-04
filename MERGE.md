# Merge Instructions for RAG PDF Chat Feature

## Feature Summary
This branch (`feature/add-rag-pdf-chat`) adds RAG (Retrieval Augmented Generation) functionality to the chatbot application, allowing users to:

1. Upload PDF documents
2. Index PDFs using vector embeddings
3. Chat with PDF content using semantic search
4. Switch between general expert chat and PDF-specific chat

## Changes Made

### Backend Changes
- **New Dependencies**: Added `PyPDF2>=3.0.1` and `numpy>=1.24.0` to `requirements.txt`
- **RAG Service**: Created `backend/rag_service.py` with PDF processing, vector database, and RAG response generation
- **New Endpoints**: 
  - `POST /api/upload-pdf` - Upload and process PDF files
  - `GET /api/pdfs` - List uploaded PDFs
  - `DELETE /api/pdfs` - Delete uploaded PDFs
- **Enhanced Chat**: Modified `POST /api/chat` to support RAG mode with `pdf_filename` parameter
- **Updated Schemas**: Added PDF-related Pydantic models in `schemas.py`
- **aimakerspace Library**: Copied aimakerspace utilities for PDF loading, text splitting, embeddings, and vector database

### Frontend Changes
- **PDF Manager Component**: New `PDFManager.tsx` component for file upload and management
- **Enhanced Chat Interface**: Updated `ChatInterface.tsx` to integrate PDF functionality
- **Updated Types**: Added PDF-related TypeScript interfaces in `types/chat.ts`
- **Enhanced Services**: Extended `chatService.ts` with PDF upload/management methods
- **UI Improvements**: Updated placeholder text, headers, and layout for RAG functionality

### Key Features
- **Dual Mode Operation**: Switch between expert consultant chat and PDF-based RAG chat
- **Visual Feedback**: Clear indication of current mode (general vs. PDF chat)
- **File Management**: Upload, list, select, and delete PDF documents
- **Vector Search**: Semantic search through PDF content using OpenAI embeddings
- **Conversation Context**: RAG responses maintain conversation history

## Merge Options

### Option 1: GitHub Pull Request (Recommended)

1. **Push the feature branch**:
   ```bash
   git push origin feature/add-rag-pdf-chat
   ```

2. **Create Pull Request**:
   - Go to GitHub repository: `https://github.com/kvaliotti/basicchatbot`
   - Click "New pull request"
   - Select `feature/add-rag-pdf-chat` → `main`
   - Title: "Add RAG PDF Chat Functionality"
   - Description: Copy the feature summary and changes from this file

3. **Review and Merge**:
   - Review the changes in the GitHub interface
   - Run any automated tests if configured
   - Merge using "Squash and merge" or "Create a merge commit"

### Option 2: GitHub CLI

1. **Create Pull Request**:
   ```bash
   gh pr create --title "Add RAG PDF Chat Functionality" --body-file MERGE.md --base main --head feature/add-rag-pdf-chat
   ```

2. **Review Pull Request**:
   ```bash
   gh pr view --web
   ```

3. **Merge Pull Request**:
   ```bash
   gh pr merge --squash  # or --merge or --rebase
   ```

### Option 3: Direct Merge (Local)

⚠️ **Warning**: This skips the review process. Use only if you're confident in the changes.

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge feature branch
git merge feature/add-rag-pdf-chat

# Push to remote
git push origin main

# Clean up feature branch
git branch -d feature/add-rag-pdf-chat
git push origin --delete feature/add-rag-pdf-chat
```

## Post-Merge Deployment

After merging to main, the application will need to be redeployed:

1. **DigitalOcean Auto-Deploy**: If auto-deploy is enabled, changes will deploy automatically
2. **Manual Deploy**: Trigger deployment in DigitalOcean dashboard
3. **Environment Variables**: Ensure `REACT_APP_API_URL` is properly set for frontend

## Testing Checklist

Before merging, verify:

- [ ] PDF upload works correctly
- [ ] PDF processing creates vector embeddings
- [ ] Chat works in both expert mode and RAG mode
- [ ] File deletion works properly
- [ ] UI clearly indicates current mode
- [ ] Error handling works for invalid files
- [ ] Conversation history is maintained
- [ ] Switching between modes starts new conversation
- [ ] All existing functionality still works

## Dependencies

The new feature adds these production dependencies:
- `PyPDF2>=3.0.1` - PDF text extraction
- `numpy>=1.24.0` - Vector operations
- `aimakerspace` - RAG utilities (copied to backend/)

## Architecture Impact

This feature maintains the existing architecture while adding:
- In-memory vector storage (per-session)
- PDF processing pipeline
- Enhanced chat routing (expert vs. RAG)
- File upload handling

For production use, consider:
- Persistent vector storage (Redis, PostgreSQL with pgvector)
- File storage service (S3, DigitalOcean Spaces)
- Caching for frequent queries
- Rate limiting for uploads 