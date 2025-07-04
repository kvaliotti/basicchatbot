# AI Expert Consultant Chat

A simple chatapp that simulates conversations with expert consultants from McKinsey, BCG, and Bain. The AI provides insights from all three consulting perspectives in a discussion format.

## Features

- **API Key Management**: Secure input and storage of OpenAI API key
- **Expert Consultation**: AI simulates discussion between McKinsey, BCG, and Bain consultants
- **Chat Interface**: Modern, responsive chat interface with message history
- **Database Persistence**: Messages are stored in PostgreSQL database
- **Real-time Updates**: Live chat experience with typing indicators

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-3.5-turbo

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- PostgreSQL
- OpenAI API key

## Setup Instructions

### 1. Database Setup

First, create the PostgreSQL database:

```bash
# Create database user and database
sudo -u postgres psql
CREATE USER myuser WITH PASSWORD 'mypassword';
CREATE DATABASE chatapp OWNER myuser;
GRANT ALL PRIVILEGES ON DATABASE chatapp TO myuser;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://myuser:mypassword@localhost/chatapp"

# Run the FastAPI server
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Enter API Key**: Input your OpenAI API key in the top section
2. **Start Chatting**: Ask any business question in the chat interface
3. **Expert Insights**: The AI will simulate a discussion between consultants from McKinsey, BCG, and Bain
4. **New Conversations**: Click "New Chat" to start a fresh conversation

## API Endpoints

- `POST /api/chat` - Send message and get AI response
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation

## Project Structure

```
basicchatbot/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── openai_service.py    # OpenAI integration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app component
│   └── package.json         # Node.js dependencies
└── docs/                    # Project documentation
```

## Development Notes

- The AI uses a custom system prompt that simulates expert discussions
- Messages are persisted in PostgreSQL with conversation tracking
- The frontend uses React Context for state management
- Tailwind CSS provides responsive, modern styling
- CORS is configured for local development

## Troubleshooting

1. **Database Connection Issues**: Ensure PostgreSQL is running and credentials are correct
2. **API Key Errors**: Verify your OpenAI API key is valid and has sufficient credits
3. **CORS Issues**: Make sure the backend is running on port 8000 and frontend on port 3000
4. **Dependencies**: Run `npm install` and `pip install -r requirements.txt` if you encounter import errors 