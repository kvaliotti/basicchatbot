# Technical Specifications

## Backend (FastAPI)

### Dependencies
- fastapi
- uvicorn[standard]
- sqlalchemy
- psycopg2-binary
- openai
- python-dotenv
- pydantic

### API Endpoints
- `POST /api/chat` - Send message and get AI response
- `GET /api/conversations` - Get conversation history
- `POST /api/conversations` - Create new conversation

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

### OpenAI Integration
- Model: gpt-3.5-turbo or gpt-4
- System prompt: Mixture of experts simulation
- API key provided by user in frontend

## Frontend (React)

### Dependencies
- react
- typescript
- @types/react
- @types/react-dom
- axios
- tailwindcss

### Components
- `App` - Main application component
- `ApiKeyInput` - OpenAI API key input
- `ChatInterface` - Main chat interface
- `MessageList` - Display chat messages
- `MessageInput` - Input new messages

### State Management
- React hooks for local state
- Context API for global state (API key, conversations)

## Database (PostgreSQL)

### Connection
- Host: localhost
- Database: chatapp
- User: myuser
- Password: mypassword

### Environment Variables
```
DATABASE_URL=postgresql://myuser:mypassword@localhost/chatapp
OPENAI_API_KEY=user_provided_key
```

## Expert System Prompt

The AI system prompt simulates a discussion between three consultant experts:
1. McKinsey Consultant - Strategic perspective
2. BCG Consultant - Analytical approach
3. Bain Consultant - Implementation focus

Format: Brief expert discussion followed by synthesized answer. 