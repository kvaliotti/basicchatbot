"""
Test script for the Deep Research Agent
"""
import os
from deepresearchagent import run_research_agent

def test_deep_research_agent():
    """Test the deep research agent with a sample query"""
    
    # You'll need to set these environment variables or replace with actual keys
    openai_api_key = os.getenv("OPENAI_API_KEY")
    tavily_api_key = os.getenv("TAVILY_API_KEY")  # Optional
    
    if not openai_api_key:
        print("❌ Please set OPENAI_API_KEY environment variable")
        return
    
    print("🧠 Testing Deep Research Agent...")
    print("=" * 50)
    
    # Test query
    query = "What are the latest developments in quantum computing in 2024?"
    
    try:
        result = run_research_agent(
            query=query,
            openai_api_key=openai_api_key,
            tavily_api_key=tavily_api_key
        )
        
        print(f"📝 Query: {query}")
        print("=" * 50)
        print(f"🤖 Response: {result}")
        print("=" * 50)
        print("✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_deep_research_agent() 