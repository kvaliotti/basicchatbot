

from typing import TypedDict, Annotated, Optional, List, Dict
from langgraph.graph.message import add_messages
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.prebuilt import ToolNode
from langgraph.graph import StateGraph, END
from langchain_tavily import TavilySearch
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
import requests
import fitz  # PyMuPDF
import io
from langchain_experimental.tools import PythonREPLTool
import datetime


class ResearchStep(TypedDict):
    step_number: int
    tool_name: str
    tool_input: str
    tool_output: str
    timestamp: str

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    openai_api_key: str
    tavily_api_key: Optional[str]
    research_steps: List[ResearchStep]
    step_counter: int


def create_model(api_key: str) -> ChatOpenAI:
    """Create OpenAI model with API key"""
    if not api_key or api_key.strip() == "":
        raise ValueError("OpenAI API key is required and cannot be empty")
    
    return ChatOpenAI(
        model="gpt-4.1",
        temperature=0.7,
        api_key=api_key,  # Use 'api_key' instead of 'openai_api_key'
    )


def call_model(state: AgentState):
    """Agent node that calls the LLM"""
    messages = state["messages"]
    research_steps = state.get("research_steps", [])
    
    # Get the API key from state - it should be passed in the initial state
    api_key = state.get("openai_api_key", "")
    if not api_key:
        raise ValueError("OpenAI API key not found in state")
    
    # Bind tools to the model
    tools = create_tools(state.get("tavily_api_key"), api_key)
    model = create_model(api_key).bind_tools(tools)
    
    # Check if we should provide a final answer
    if len(research_steps) >= 5:  # After at least 5 research steps, provide final answer
        # If we have research steps, encourage final summary
        final_system_message = """Based on your comprehensive research using multiple tools, provide a detailed final analysis to the user's question.

As a healthcare regulations and compliance analyst, structure your response using the following format:

**RECOMMENDATIONS**
Provide specific, actionable recommendations based on your research. Include regulatory compliance steps, best practices, and strategic guidance. Omit this section if not relevant to the question.

**CONCLUSIONS** 
Present your definitive conclusions based on the evidence gathered from your multi-source research.

**SUPPORTING EVIDENCE**
Detail all supporting evidence you found for your recommendations and conclusions. Include specific regulations, studies, legal precedents, and authoritative sources discovered during your research.

**STRUCTURED EXPLANATION**
If relevant, provide a comprehensive, structured explanation of how the healthcare regulation, compliance framework, or medical process works. Include step-by-step processes, regulatory requirements, and implementation details.

**CITATIONS & REFERENCES **
Provide specific citations and references to the sources you used to support your recommendations, conclusions, evidence, and explanations.

**LIMITATIONS**
Acknowledge any limitations of the research you performed, including gaps in available information, areas requiring additional investigation, or caveats about the analysis.

Provide detailed, in-depth insights. Do not mention the research tools or process - focus on delivering authoritative healthcare compliance analysis."""
        
        # Create a model without tools for final answer
        final_model = create_model(api_key)
        messages = messages + [HumanMessage(content=final_system_message)]
        response = final_model.invoke(messages)
    else:
        # Initial system message for tool usage
        system_message = """You are a skilled research analyst from a clinical/legal firm specializing in healthcare regulations and compliance. Your expertise covers HIPAA, healthcare policy, medical regulations, and compliance frameworks.

Your task is to conduct EXTENSIVE, DETAILED research using ALL available tools before providing analysis. Focus on gathering comprehensive, in-depth information to provide authoritative insights.

🔍 **Research Tools Available:**
- **query_enhancer**: Transform the user's basic question into a comprehensive research query (USE THIS FIRST!)
- **wikipedia_search**: General encyclopedic information on healthcare topics, regulations, and policies
- **tavily_search**: Current web information, recent regulatory updates, and news (if API key provided)
- **pubmed_search**: Medical research, clinical studies, and scientific literature
- **code_interpreter**: Analyze data, perform calculations, create visualizations for compliance metrics
- **pdf_parser**: Extract information from regulatory documents, policy PDFs, and compliance guides. It works with URLs to PDF files.
You can use any tool as many times as you want. The overall limit is 20 tool usages.

**RESEARCH METHODOLOGY - FOLLOW STRICTLY:**
1. **STEP 1 - MANDATORY**: FIRST use query_enhancer with the user's original question to create a detailed research query
2. **STEP 2**: Use AT LEAST 3 different research tools for comprehensive coverage
3. **START BROAD**: Begin with wikipedia_search for foundational regulatory knowledge
4. **GO DEEP**: Use pubmed_search for scientific evidence and medical literature
5. **STAY CURRENT**: Use tavily_search for recent regulatory developments and updates (if available)
6. **ANALYZE DATA**: Use code_interpreter for any quantitative analysis, compliance calculations, or data visualization
7. **EXAMINE DOCUMENTS**: Use pdf_parser for any regulatory documents, policy PDFs, or compliance guides mentioned

**RESEARCH DEPTH REQUIREMENTS:**
- Gather detailed information from multiple perspectives
- Look for specific regulations, statutes, and compliance requirements
- Research historical context and recent developments
- Identify implementation challenges and best practices
- Find quantitative data and compliance metrics where relevant

Begin by FIRST using the query_enhancer tool with the user's original question, then proceed with comprehensive multi-tool research. Research MORE rather than less. Provide detailed, in-depth insights through thorough investigation."""
        
        if not any(isinstance(msg, HumanMessage) and msg.content.startswith("You are a skilled research analyst") for msg in messages):
            messages = [HumanMessage(content=system_message)] + messages
        
        response = model.invoke(messages)
    
    return {"messages": [response]}


def create_tools(tavily_api_key: Optional[str] = None, openai_api_key: Optional[str] = None):
    """Create all research tools"""
    tools = []
    
    # Query Enhancement Tool - MUST BE USED FIRST
    @tool
    def query_enhancer(original_query: str) -> str:
        """Enhance the user's query to be more detailed and suitable for clinical/legal healthcare compliance analysis"""
        if not openai_api_key:
            return f"Enhanced query: {original_query} (API key unavailable for enhancement)"
        
        try:
            enhancement_model = create_model(openai_api_key)
            
            enhancement_prompt = f"""You are a query enhancement specialist for healthcare compliance research. 
            
Your task is to transform a user's basic question into a comprehensive, detailed query suitable for a clinical/legal healthcare compliance analyst.

USER'S ORIGINAL QUERY: "{original_query}"

Transform this into a detailed research query that:
1. Identifies specific healthcare regulations, laws, and compliance frameworks that may be relevant
2. Specifies what type of healthcare entities or scenarios this applies to
3. Asks for specific compliance requirements, penalties, and implementation details
4. Requests both current regulations and recent updates/changes
5. Seeks practical implementation guidance and best practices
6. Asks for potential legal implications and risk factors

Return ONLY the enhanced query, nothing else. Make it comprehensive but focused."""

            response = enhancement_model.invoke([HumanMessage(content=enhancement_prompt)])
            enhanced_query = response.content.strip()
            
            return f"Enhanced research query: {enhanced_query}"
            
        except Exception as e:
            return f"Enhanced query: {original_query} (Enhancement failed: {str(e)})"
    
    tools.append(query_enhancer)
    
    # Tavily Search Tool
    if tavily_api_key:
        tavily_tool = TavilySearch(
            max_results=10,
            tavily_api_key=tavily_api_key,
            name="tavily_search",
            description="Search the internet for current information and news"
        )
        tools.append(tavily_tool)
    
    # Wikipedia Tool
    wikipedia = WikipediaQueryRun(
        api_wrapper=WikipediaAPIWrapper(),
        name="wikipedia_search",
        description="Search Wikipedia for encyclopedic information"
    )
    tools.append(wikipedia)
    
    # PubMed Search Tool
    @tool
    def pubmed_search(query: str) -> str:
        """Search PubMed for medical and scientific research papers"""
        try:
            base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
            search_url = f"{base_url}esearch.fcgi"
            
            params = {
                "db": "pubmed",
                "term": query,
                "retmax": 5,
                "retmode": "json"
            }
            
            response = requests.get(search_url, params=params)
            search_results = response.json()
            
            if "esearchresult" in search_results and "idlist" in search_results["esearchresult"]:
                ids = search_results["esearchresult"]["idlist"]
                
                if ids:
                    # Get details for the articles
                    fetch_url = f"{base_url}efetch.fcgi"
                    fetch_params = {
                        "db": "pubmed",
                        "id": ",".join(ids),
                        "retmode": "xml"
                    }
                    
                    fetch_response = requests.get(fetch_url, params=fetch_params)
                    return f"Found {len(ids)} PubMed articles for '{query}'. XML content: {fetch_response.text[:1000]}..."
                else:
                    return f"No PubMed articles found for '{query}'"
            else:
                return f"Error searching PubMed for '{query}'"
        except Exception as e:
            return f"Error searching PubMed: {str(e)}"
    
    tools.append(pubmed_search)
    
    # Code Interpreter Tool
    python_tool = PythonREPLTool(
        name="code_interpreter",
        description="Execute Python code for analysis, calculations, and data processing"
    )
    tools.append(python_tool)
    
    # PDF Parser Tool
    @tool
    def pdf_parser(url: str) -> str:
        """Parse PDF document from URL without downloading the file"""
        try:
            # Download PDF content
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # Check if content is PDF
            if 'application/pdf' not in response.headers.get('content-type', ''):
                return f"Error: URL does not point to a PDF file"
            
            # Parse PDF using PyMuPDF
            pdf_stream = io.BytesIO(response.content)
            pdf_document = fitz.open(stream=pdf_stream, filetype="pdf")
            
            text_content = ""
            for page_num in range(min(10, pdf_document.page_count)):  # Limit to first 10 pages
                page = pdf_document[page_num]
                text_content += f"\n--- Page {page_num + 1} ---\n"
                text_content += page.get_text()
            
            pdf_document.close()
            
            if len(text_content) > 5000:
                text_content = text_content[:5000] + "...\n[Content truncated for length]"
            
            return f"Successfully parsed PDF from {url}:\n{text_content}"
            
        except Exception as e:
            return f"Error parsing PDF from {url}: {str(e)}"
    
    tools.append(pdf_parser)
    
    return tools


def track_tool_usage(state: AgentState):
    """Custom tool node that tracks research steps"""
    messages = state["messages"]
    research_steps = state.get("research_steps", [])
    step_counter = state.get("step_counter", 0)
    
    last_message = messages[-1]
    
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        # Create tools
        tools = create_tools(state.get("tavily_api_key"), state.get("openai_api_key"))
        tool_node = ToolNode(tools)
        
        # Execute tools
        result = tool_node.invoke(state)
        
        # Copy existing research_steps and step_counter to result
        result["research_steps"] = research_steps.copy()
        result["step_counter"] = step_counter
        
        # Track each tool call
        for i, tool_call in enumerate(last_message.tool_calls):
            result["step_counter"] += 1
            
            # Find the corresponding tool result
            tool_result = ""
            if result["messages"] and len(result["messages"]) > i:
                tool_result = result["messages"][i].content
            
            step = {
                "step_number": result["step_counter"],
                "tool_name": tool_call["name"],
                "tool_input": str(tool_call["args"]),
                "tool_output": tool_result[:500] + "..." if len(tool_result) > 500 else tool_result,
                "timestamp": datetime.datetime.now().isoformat()
            }
            result["research_steps"].append(step)
        
        return result
    
    return state

def should_continue(state: AgentState):
    """Determine if we should continue to tools or end"""
    messages = state["messages"]
    research_steps = state.get("research_steps", [])
    last_message = messages[-1]
    
    # If the last message has tool calls, go to action
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "action"
    # If we have sufficient research steps (5+) and no tool calls, end
    elif len(research_steps) >= 5:
        return "end"
    else:
        return "end"


def create_research_graph(openai_api_key: str, tavily_api_key: Optional[str] = None):
    """Create the research agent graph"""
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("action", track_tool_usage)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "action": "action",
            "end": END
        }
    )
    
    # After action, always go back to agent
    workflow.add_edge("action", "agent")
    
    # Compile the graph
    app = workflow.compile()
    
    return app


def run_research_agent(query: str, openai_api_key: str, tavily_api_key: Optional[str] = None, conversation_history: Optional[List[Dict[str, str]]] = None):
    """Run the research agent with a query"""
    
    # Validate inputs
    if not query or query.strip() == "":
        raise ValueError("Query cannot be empty")
    
    if not openai_api_key or openai_api_key.strip() == "":
        raise ValueError("OpenAI API key is required and cannot be empty")
    
    # Create and run the graph
    app = create_research_graph(openai_api_key, tavily_api_key)
    
    # Convert conversation history to LangChain messages
    messages = []
    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
    
    # Add the current query
    messages.append(HumanMessage(content=query))
    
    # Initialize state
    initial_state = {
        "messages": messages,
        "openai_api_key": openai_api_key,
        "tavily_api_key": tavily_api_key,
        "research_steps": [],
        "step_counter": 0
    }
    
    # Run the agent
    result = app.invoke(initial_state)
    
    # Extract final answer and research steps
    final_answer = result["messages"][-1].content if result["messages"] else "No response generated"
    research_steps = result.get("research_steps", [])
    
    return {
        "final_answer": final_answer,
        "research_steps": research_steps
    }




