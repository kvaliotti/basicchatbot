# Deep Research Agent

A powerful research assistant built with LangGraph that uses multiple tools to provide comprehensive, well-researched responses.

## Features

### 🧠 Deep Research Agent
- **URL**: `https://your-domain.com/deep-research-agent`
- **LangGraph-powered**: Uses StateGraph for intelligent tool usage
- **Multi-tool integration**: Combines multiple research sources
- **Streaming conversation**: Maintains context across interactions

### 🔧 Available Tools

1. **🌐 Tavily Search** (requires API key)
   - Real-time web search
   - Current information and news
   - Get API key: [tavily.com](https://tavily.com)

2. **📚 Wikipedia Search**
   - Encyclopedia information
   - No API key required
   - Comprehensive knowledge base

3. **🧬 PubMed Search**
   - Medical and scientific research
   - Academic papers and studies
   - No API key required

4. **🐍 Code Interpreter**
   - Python code execution
   - Data analysis and computation
   - Mathematical calculations

5. **📄 PDF Parser**
   - Parse PDFs from URLs
   - Extract text without downloading
   - Supports first 10 pages

## How It Works

The agent follows this flow:
```
User Query → Agent (LLM) → Tools (if needed) → Agent → Response
```

1. **Agent**: GPT-4 analyzes the query and decides which tools to use
2. **Tools**: Execute searches, calculations, or data processing
3. **Agent**: Synthesizes results into a comprehensive response
4. **End**: Provides final answer or continues tool usage

## Setup Instructions

### Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Required Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for web search)
TAVILY_API_KEY=your_tavily_api_key_here
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Usage Examples

### Research Query
```
"What are the latest developments in quantum computing in 2024?"
```
- Uses Tavily for recent news
- Uses Wikipedia for background
- Uses PubMed for scientific papers
- Synthesizes comprehensive response

### Data Analysis
```
"Analyze the growth rate of renewable energy adoption. Create a visualization."
```
- Uses web search for current data
- Uses code interpreter for calculations
- Creates charts and graphs
- Provides detailed analysis

### PDF Analysis
```
"Parse this research paper and summarize the key findings: https://example.com/paper.pdf"
```
- Uses PDF parser to extract text
- Analyzes content with LLM
- Provides structured summary
- Suggests related research

## API Endpoints

### Deep Research Endpoint
```
POST /api/deep-research
```

**Request Body:**
```json
{
  "message": "Your research question here",
  "api_key": "your_openai_api_key",
  "tavily_api_key": "your_tavily_api_key_optional"
}
```

**Response:**
```json
{
  "response": "Comprehensive research response"
}
```

## Architecture

### LangGraph StateGraph
```python
Agent → should_continue() → Tools → Agent → End
```

### State Management
- **Messages**: Conversation history
- **API Keys**: OpenAI and Tavily credentials
- **Tool Results**: Cached for efficiency

### Tool Selection
The agent intelligently selects tools based on:
- Query type and domain
- Information freshness requirements
- Computational needs
- Available API keys

## Testing

Run the test script to verify functionality:
```bash
cd backend
python test_deep_research.py
```

## Deployment

### Frontend Routes
- Main app: `/`
- Deep Research Agent: `/deep-research-agent`

### Environment Variables
Set in your deployment platform:
- `REACT_APP_API_URL`: Backend API URL
- `OPENAI_API_KEY`: OpenAI API key
- `TAVILY_API_KEY`: Tavily API key (optional)

## Features in Development

- [ ] Memory persistence across sessions
- [ ] Custom tool creation
- [ ] Multi-language support
- [ ] Advanced visualization tools
- [ ] Collaborative research sessions

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed
2. **API key errors**: Check environment variables
3. **Tool failures**: Verify internet connection and API limits
4. **PDF parsing**: Ensure valid PDF URLs

### Debug Mode
Set environment variable for verbose logging:
```bash
LANGGRAPH_DEBUG=1
```

## Contributing

The Deep Research Agent is built for experimentation and extension. Feel free to:
- Add new tools to `deepresearchagent.py`
- Modify the StateGraph flow
- Enhance the UI with new features
- Improve error handling and logging

---

**Note**: This is a separate interface from the main chatbot application, designed for intensive research tasks with multiple tool integrations. 