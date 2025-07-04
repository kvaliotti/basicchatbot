# Chatapp Development Tasks

## Current Task: Build Simple Chatapp

### Requirements
1. **Frontend (React)**
   - Input field at the top for OpenAI API key
   - Chat interface for AI interaction
   - Message display and input components

2. **Backend (FastAPI)**
   - RESTful API endpoints for chat functionality
   - OpenAI integration with custom system prompt
   - Database operations for message persistence

3. **Database (PostgreSQL)**
   - User credentials: myuser:mypassword
   - Tables for conversations and messages
   - Database connection and models

4. **AI Integration**
   - System prompt: Mixture of experts (McKinsey, BCG, Bain consultants)
   - Expert discussion simulation before providing answer
   - OpenAI API integration

### Acceptance Criteria
- [ ] User can input OpenAI API key
- [ ] Chat interface allows sending/receiving messages
- [ ] AI responds with consultant expert discussion format
- [ ] Messages are persisted in PostgreSQL database
- [ ] Backend API handles all chat operations
- [ ] Frontend and backend are properly connected

### Technical Stack
- Frontend: React with TypeScript
- Backend: FastAPI with Python
- Database: PostgreSQL
- AI: OpenAI API integration 