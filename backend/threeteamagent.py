from typing import Any, Callable, List, Optional, TypedDict, Union, Dict
import operator
import functools
import os
import uuid
import datetime
import json
from pathlib import Path

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.output_parsers.openai_functions import JsonOutputFunctionsParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.tools import BaseTool, tool
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.graph import END, StateGraph
from typing import Annotated, List, Tuple, Union

from rag_service import RAGService

# Global variables to track execution
execution_logs = []
working_directory = None

def log_agent_execution(agent_name: str, action: str, details: str = "", log_level: str = "info"):
    """Log agent execution for debugging and monitoring"""
    global execution_logs
    
    # Only log important events for the UI (agent invocations and results)
    important_actions = ["starting", "completed", "initializing", "executing", "graph_compiled", "directory_created"]
    
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "agent_name": agent_name,
        "action": action,
        "details": details
    }
    
    # Always add to execution_logs for UI if it's an important action
    if action in important_actions or log_level == "critical":
        execution_logs.append(log_entry)
    
    # Always print to console for debugging
    print(f"[{log_entry['timestamp']}] {agent_name}: {action} - {details}")

def agent_node(state, agent, name):
    log_agent_execution(name, "starting", f"Processing message with {len(state.get('messages', []))} messages")
    result = agent.invoke(state)
    log_agent_execution(name, "completed", f"Generated response: {result['output'][:100]}...")
    return {"messages": [HumanMessage(content=result["output"], name=name)]}

def create_agent(
    llm: ChatOpenAI,
    tools: list,
    system_prompt: str,
) -> str:
    """Create a function-calling agent and add it to the graph."""
    system_prompt += ("\nWork autonomously according to your specialty, using the tools available to you."
    " Do not ask for clarification."
    " Your other team members (and other teams) will collaborate with you with their own specialties."
    " You are chosen for a reason!")
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system_prompt,
            ),
            MessagesPlaceholder(variable_name="messages"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )
    agent = create_openai_functions_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools)
    return executor

def enter_chain(message: str, members: List[str]):
    results = {
        "messages": [HumanMessage(content=message)],
        "team_members": ", ".join(members),
        "current_files": "",  # Initialize current_files for DocWritingState and VerificationState
        "next": "",
    }
    return results

def enter_chain_informational(message: str):
    results = {
        "messages": [HumanMessage(content=message)],
        "team_members": ["PaperSearcher", "PaperResearchSupervisor"],  # For PaperReviewTeamState
        "next": "",
    }
    return results

def create_team_supervisor(llm: ChatOpenAI, system_prompt, members) -> str:
    """An LLM-based router."""
    options = ["FINISH"] + members
    function_def = {
        "name": "route",
        "description": "Select the next role.",
        "parameters": {
            "title": "routeSchema",
            "type": "object",
            "properties": {
                "next": {
                    "title": "Next",
                    "anyOf": [
                        {"enum": options},
                    ],
                },
            },
            "required": ["next"],
        },
    }
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="messages"),
            (
                "system",
                "Given the conversation above, who should act next?"
                " Or should we FINISH? Select one of: {options}",
            ),
        ]
    ).partial(options=str(options), team_members=", ".join(members))
    return (
        prompt
        | llm.bind_functions(functions=[function_def], function_call="route")
        | JsonOutputFunctionsParser()
    )

class LinkedInPostAgentState(TypedDict):
    """State for the LinkedIn Post Writing Agent"""
    messages: Annotated[List[BaseMessage], operator.add]
    pdf_filename: Optional[str]
    rag_service: Optional[RAGService]
    tavily_api_key: Optional[str]
    openai_api_key: str

@tool
def retrieve_paper_information(
    query: Annotated[str, "query to retrieve information from the uploaded ML paper"]
) -> str:
    """Use Retrieval Augmented Generation to retrieve information about the research paper"""
    # This will be injected with the actual RAG service instance
    return "Paper information retrieval tool - needs RAG service instance"

class PaperReviewTeamState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    team_members: List[str]
    next: str

def create_linkedin_agent(openai_api_key: str, tavily_api_key: Optional[str] = None, rag_service: Optional[RAGService] = None, pdf_filename: Optional[str] = None):
    """Create the complete LinkedIn post writing agent"""
    
    global working_directory, execution_logs
    # Note: execution_logs is reset in run_linkedin_agent to ensure clean state
    
    log_agent_execution("System", "initializing", "Starting LinkedIn post writing agent")
    
    llm = ChatOpenAI(model="gpt-4.1", api_key=openai_api_key)
    llm_supervisor = ChatOpenAI(model="gpt-4.1", api_key=openai_api_key)
    llm_research = ChatOpenAI(model="gpt-4.1", api_key=openai_api_key)
    llm_verification = ChatOpenAI(model="gpt-4.1", api_key=openai_api_key)
    
    # Create tool instances
    tavily_search = TavilySearchResults(max_results=5, tavily_api_key=tavily_api_key) if tavily_api_key else None
    
    # Create PDF retrieval tool
    @tool
    def paper_retriever(query: str) -> str:
        """Retrieve specific information from the uploaded ML paper"""
        log_agent_execution("PaperRetriever", "searching", f"Query: {query[:50]}...", "debug")
        if not rag_service or not pdf_filename:
            return "No PDF uploaded or RAG service not available"
        try:
            relevant_context = rag_service.get_relevant_context(pdf_filename, query, k=5)
            if relevant_context:
                result = f"Retrieved information from paper: {' '.join(relevant_context)}"
                log_agent_execution("PaperRetriever", "found_context", f"Retrieved {len(relevant_context)} chunks", "debug")
                return result
            else:
                log_agent_execution("PaperRetriever", "no_context", "No relevant information found", "debug")
                return "No relevant information found in the paper for this query"
        except Exception as e:
            log_agent_execution("PaperRetriever", "error", f"Error: {str(e)}", "debug")
            return f"Error retrieving from paper: {str(e)}"
    
    # PAPER RESEARCH TEAM

    paper_research_agent = create_agent(
        llm_research,
        [paper_retriever],
        "You are a research assistant who can provide specific information from the uploaded scientific paper. Extract key findings, methodologies, and results from the paper. One extraction is enough.",
    )
    paper_research_node = functools.partial(agent_node, agent=paper_research_agent, name="PaperSearcher")

    paper_research_supervisor_agent = create_team_supervisor(
        llm,
        ("You are a supervisor tasked with managing a conversation between the"
        " following workers: PaperSearcher. Given the following user request,"
        " determine what research is needed and respond with the worker to act next. Each worker will perform a"
        " task and respond with their results and status. "
        " Use PaperSearcher to get information from the uploaded research paper. Make sure we get accurate context and information about the research paper."
        "  When finished, respond with FINISH."),
        ["PaperSearcher"],
    )

    paper_research_graph = StateGraph(PaperReviewTeamState)
    paper_research_graph.add_node("PaperSearcher", paper_research_node)
    paper_research_graph.add_node("PaperResearchSupervisor", paper_research_supervisor_agent)

    paper_research_graph.add_edge("PaperSearcher", "PaperResearchSupervisor")
    paper_research_graph.add_conditional_edges(
        "PaperResearchSupervisor",
        lambda x: x["next"],
        {"PaperSearcher": "PaperSearcher", "FINISH": END},
    )

    paper_research_graph.set_entry_point("PaperResearchSupervisor")
    compiled_paper_research_graph = paper_research_graph.compile()

    paper_research_chain = RunnableLambda(enter_chain_informational) | compiled_paper_research_graph


    # CREATE WORKING DIRECTORY FOR DOCUMENTS
    os.makedirs('./content/data', exist_ok=True)

    def create_random_subdirectory():
        random_id = str(uuid.uuid4())[:8]  # Use first 8 characters of a UUID
        subdirectory_path = os.path.join('./content/data', random_id)
        os.makedirs(subdirectory_path, exist_ok=True)
        return subdirectory_path

    WORKING_DIRECTORY = Path(create_random_subdirectory())
    working_directory = str(WORKING_DIRECTORY)  # Store globally for API access
    log_agent_execution("System", "directory_created", f"Working directory: {working_directory}")

    @tool
    def create_outline(
        points: Annotated[List[str], "List of main points or sections."],
        file_name: Annotated[str, "File path to save the outline (without extension - .md will be added automatically)."],
    ) -> Annotated[str, "Path of the saved outline file."]:
        """Create and save an outline as a markdown file."""
        # Ensure .md extension
        if not file_name.endswith('.md'):
            file_name = f"{file_name}.md"
        
        log_agent_execution("FileSystem", "create_outline", f"Creating outline: {file_name}", "debug")
        with (WORKING_DIRECTORY / file_name).open("w") as file:
            for i, point in enumerate(points):
                file.write(f"{i + 1}. {point}\n")
        log_agent_execution("FileSystem", "file_saved", f"Outline saved: {file_name}", "debug")
        return f"Outline saved to {file_name}"

    @tool
    def read_document(
        file_name: Annotated[str, "File path to read the document (without extension - .md will be added automatically if needed)."],
        start: Annotated[Optional[int], "The start line. Default is 0"] = None,
        end: Annotated[Optional[int], "The end line. Default is None"] = None,
    ) -> str:
        """Read the specified markdown document."""
        # Try to find the file, adding .md extension if needed
        file_path = WORKING_DIRECTORY / file_name
        if not file_path.exists() and not file_name.endswith('.md'):
            file_path = WORKING_DIRECTORY / f"{file_name}.md"
        
        log_agent_execution("FileSystem", "read_document", f"Reading: {file_path.name}", "debug")
        try:
            with file_path.open("r") as file:
                lines = file.readlines()
            if start is None:
                start = 0
            content = "\n".join(lines[start:end])
            log_agent_execution("FileSystem", "document_read", f"Read {len(content)} characters from {file_path.name}", "debug")
            return content
        except FileNotFoundError:
            error_msg = f"File not found: {file_name} (tried both {file_name} and {file_name}.md)"
            log_agent_execution("FileSystem", "file_not_found", error_msg, "debug")
            return error_msg

    @tool
    def write_document(
        content: Annotated[str, "Text content to be written into the document."],
        file_name: Annotated[str, "File path to save the document (without extension - .md will be added automatically)."],
    ) -> Annotated[str, "Path of the saved document file."]:
        """Create and save a markdown document."""
        # Ensure .md extension
        if not file_name.endswith('.md'):
            file_name = f"{file_name}.md"
            
        log_agent_execution("FileSystem", "write_document", f"Writing: {file_name} ({len(content)} chars)", "debug")
        with (WORKING_DIRECTORY / file_name).open("w") as file:
            file.write(content)
        log_agent_execution("FileSystem", "file_saved", f"Document saved: {file_name}", "debug")
        return f"Document saved to {file_name}"

    @tool
    def edit_document(
        file_name: Annotated[str, "Path of the document to be edited (without extension - .md will be added automatically if needed)."],
        inserts: Annotated[
            Dict[int, str],
            "Dictionary where key is the line number (1-indexed) and value is the text to be inserted at that line.",
        ] = {},
    ) -> Annotated[str, "Path of the edited document file."]:
        """Edit a markdown document by inserting text at specific line numbers."""
        # Try to find the file, adding .md extension if needed
        file_path = WORKING_DIRECTORY / file_name
        if not file_path.exists() and not file_name.endswith('.md'):
            file_path = WORKING_DIRECTORY / f"{file_name}.md"
        
        log_agent_execution("FileSystem", "edit_document", f"Editing: {file_path.name} with {len(inserts)} insertions", "debug")

        try:
            with file_path.open("r") as file:
                lines = file.readlines()

            sorted_inserts = sorted(inserts.items())

            for line_number, text in sorted_inserts:
                if 1 <= line_number <= len(lines) + 1:
                    lines.insert(line_number - 1, text + "\n")
                else:
                    return f"Error: Line number {line_number} is out of range."

            with file_path.open("w") as file:
                file.writelines(lines)

            log_agent_execution("FileSystem", "file_saved", f"Document edited and saved: {file_path.name}", "debug")
            return f"Document edited and saved to {file_path.name}"
        except FileNotFoundError:
            error_msg = f"File not found: {file_name} (tried both {file_name} and {file_name}.md)"
            log_agent_execution("FileSystem", "file_not_found", error_msg, "debug")
            return error_msg

    class DocWritingState(TypedDict):
        messages: Annotated[List[BaseMessage], operator.add]
        team_members: str
        next: str
        current_files: str

    def prelude(state):
        written_files = []
        if not WORKING_DIRECTORY.exists():
            WORKING_DIRECTORY.mkdir()
        try:
            written_files = [
                f.relative_to(WORKING_DIRECTORY) for f in WORKING_DIRECTORY.rglob("*")
            ]
        except:
            pass
        if not written_files:
            return {**state, "current_files": "No files written."}
        return {
            **state,
            "current_files": "\nBelow are files your team has written to the directory:\n"
            + "\n".join([f" - {f}" for f in written_files]),
        }

    # AUTHORING TEAM
    doc_writer_agent = create_agent(
        llm,
        [write_document, edit_document, read_document],
        ("You are an expert writing LinkedIn posts. You have advanced knowledge of the LinkedIn platform and the ability to write posts that are engaging and informative. You are an expert in Machine Learning, AI, Deep Learning, and Statistics. "
        "Write posts in markdown format that strongly resonate with LinkedIn blogging best practices. "
        "Use formatting like headers, bullet points, and emphasis to make posts visually appealing and easy to read. "
        "IMPORTANT: Always name your post files with 'DRAFT_' or 'POST_' as a prefix (e.g., 'DRAFT_Topic_Name' or 'POST_Final_Version'). Never overwrite outline files.\n"
        "Below are files currently in your directory:\n{current_files}"),
    )
    
    def create_context_aware_agent(agent, prelude_func):
        """Create a context-aware agent using RunnableLambda for proper LangChain integration"""
        def context_aware_invoke(state):
            # Apply prelude transformation to update state with current files
            updated_state = prelude_func(state)
            # Invoke the agent with the updated state
            return agent.invoke(updated_state)
        
        # Return a RunnableLambda that properly implements the Runnable interface
        return RunnableLambda(context_aware_invoke)
    
    context_aware_doc_writer_agent = create_context_aware_agent(doc_writer_agent, prelude)
    doc_writing_node = functools.partial(
        agent_node, agent=context_aware_doc_writer_agent, name="DocWriter"
    )

    note_taking_agent = create_agent(
        llm,
        [create_outline, read_document],
        ("You are an expert senior researcher tasked with writing an outline for a LinkedIn post about Machine Learning or AI. "
        "Create structured outlines that will help the writing team produce engaging content. "
        "Use clear, numbered points that outline the key topics and flow for the LinkedIn post. "
        "IMPORTANT: Always name your outline files with 'OUTLINE_' as a prefix (e.g., 'OUTLINE_Topic_Name').\n"
        " Below are files currently in your directory:\n{current_files}"),
    )
    context_aware_note_taking_agent = create_context_aware_agent(note_taking_agent, prelude)
    note_taking_node = functools.partial(
        agent_node, agent=context_aware_note_taking_agent, name="NoteTaker"
    )

    empathy_editor_agent = create_agent(
        llm,
        [write_document, edit_document, read_document],
        ("You are an expert in virality, engagement, and reach - you edit the document to make sure it will become a viral post. Take into consideration how LinkedIn posts are typically written and formatted. Bite-sized thoughts are typically the best way to go even in bigger posts — it is about organisation! You are paid a lot to make this post viral. "
        "When creating optimized versions, use 'VIRAL_' prefix for your files (e.g., 'VIRAL_Topic_Name'). You can also edit existing draft files directly.\n"
        "Below are files currently in your directory:\n{current_files}"),
    )
    context_aware_empathy_editor_agent = create_context_aware_agent(empathy_editor_agent, prelude)
    empathy_node = functools.partial(
        agent_node, agent=context_aware_empathy_editor_agent, name="EmpathyEditor"
    )

    doc_writing_supervisor = create_team_supervisor(
        llm_supervisor,
        ("You are a supervisor tasked with managing a conversation between the"
        " following workers: {team_members}. You should always verify the technical"
        " contents after any edits are made. "
        "Given the following user request,"
        " respond with the worker to act next. It is a good idea to start with NoteTaker agent, because that agent can provide an outline for the post. Each worker will perform a"
        " task and respond with their results and status. Invoke each agent at least once. When each agent is finished,"
        " you must respond with FINISH."),
        ["DocWriter", "NoteTaker", "EmpathyEditor"],
    )

    authoring_graph = StateGraph(DocWritingState)
    authoring_graph.add_node("DocWriter", doc_writing_node)
    authoring_graph.add_node("NoteTaker", note_taking_node)
    authoring_graph.add_node("EmpathyEditor", empathy_node)
    authoring_graph.add_node("supervisor", doc_writing_supervisor)

    authoring_graph.add_edge("DocWriter", "supervisor")
    authoring_graph.add_edge("NoteTaker", "supervisor")
    authoring_graph.add_edge("EmpathyEditor", "supervisor")

    authoring_graph.add_conditional_edges(
        "supervisor",
        lambda x: x["next"],
        {
            "DocWriter": "DocWriter",
            "NoteTaker": "NoteTaker",
            "EmpathyEditor" : "EmpathyEditor",
            "FINISH": END,
        },
    )

    authoring_graph.set_entry_point("supervisor")
    compiled_authoring_graph = authoring_graph.compile()

    class VerificationState(TypedDict):
        messages: Annotated[List[BaseMessage], operator.add]
        team_members: str
        next: str
        current_files: str

    # VERIFICATION TEAM
    correctness_tools = [write_document, edit_document, read_document]
    
    if tavily_search:
        correctness_tools.append(tavily_search)
    
    correctness_agent = create_agent(
        llm_verification,
        correctness_tools,
        ("You are an expert in fact-checking. You can use the tavily tool to fact-check the document. Update the document with the correct information.\n"
        "Below are files currently in your directory:\n{current_files}"),
    )
    context_aware_correctness_agent = create_context_aware_agent(correctness_agent, prelude)
    correctness_node = functools.partial(
        agent_node, agent=context_aware_correctness_agent, name="CorrectnessAgent"
    )

    linkedin_style_checker_agent = create_agent(
        llm_verification,
        [write_document, edit_document, read_document],
        ("You are an expert in LinkedIn style and tone. You evaluate the document to see whether it fits with LinkedIn's style and tone. If the post needs to be improved, update the document.  \n"
        "Below are files currently in your directory:\n{current_files}"),
    )
    context_aware_linkedin_style_checker_agent = create_context_aware_agent(linkedin_style_checker_agent, prelude)
    linkedin_style_checker_node = functools.partial(
        agent_node, agent=context_aware_linkedin_style_checker_agent, name="LinkedInStyleChecker"
    )

    verification_supervisor = create_team_supervisor(
        llm,
        ("You are a supervisor tasked with managing a conversation between the"
        " following workers: {team_members}. You should always verify the technical"
        " contents after any edits are made. "
        "Given the following user request,"
        " respond with the worker to act next. Each worker will perform a"
        " task and respond with their results and status. Invoke each agent at least once. When each agent is finished,"
        " you must respond with FINISH."),
        ["CorrectnessAgent", "LinkedInStyleChecker"],
    )

    verification_graph = StateGraph(VerificationState)
    verification_graph.add_node("CorrectnessAgent", correctness_node)
    verification_graph.add_node("LinkedInStyleChecker", linkedin_style_checker_node)
    verification_graph.add_node("VerificationSupervisor", verification_supervisor)

    verification_graph.add_edge("CorrectnessAgent", "VerificationSupervisor")
    verification_graph.add_edge("LinkedInStyleChecker", "VerificationSupervisor")

    verification_graph.add_conditional_edges(
        "VerificationSupervisor",
        lambda x: x["next"],
        {"CorrectnessAgent": "CorrectnessAgent", "LinkedInStyleChecker": "LinkedInStyleChecker", "FINISH": END},
    )

    verification_graph.set_entry_point("VerificationSupervisor")
    compiled_verification_graph = verification_graph.compile()

    # Create chains for each team
    authoring_chain = (
        RunnableLambda(functools.partial(enter_chain, members=["DocWriter", "NoteTaker", "EmpathyEditor"]))
        | compiled_authoring_graph
    )

    verification_chain = (
        RunnableLambda(functools.partial(enter_chain, members=["CorrectnessAgent", "LinkedInStyleChecker"]))
        | compiled_verification_graph
    )

    # MEGA SUPERVISOR COORDINATION
    mega_supervisor_node = create_team_supervisor(
        llm_supervisor,
        "You are a supervisor tasked with managing a conversation between the"
        " following teams: {team_members}. The teams work together to create LinkedIn posts about ML/AI papers."
        " PaperResearchTeam researches the paper and gathers information."
        " AuthoringTeam writes and refines the LinkedIn post."
        " VerificationTeam fact-checks and ensures LinkedIn style compliance."
        " Respond with the team to act next. YEach team will perform their tasks"
        " and respond with their results and status.  YOU MUST invoke each team at least once. CHECK that you invoked each team at least once before finishing. Typically, PaperResearchTeam is the first team, AuthoringTeam is the second one, VerificationTeam is the third one. When all teams are finished,"
        " you must respond with FINISH.",
        ["PaperResearchTeam", "AuthoringTeam", "VerificationTeam"],
    )

    class State(TypedDict):
        messages: Annotated[List[BaseMessage], operator.add]
        next: str

    def get_last_message(state: State) -> str:
        return state["messages"][-1].content

    def join_graph(response: dict):
        return {"messages": [response["messages"][-1]]}

    super_graph = StateGraph(State)

    super_graph.add_node("PaperResearchTeam", RunnableLambda(get_last_message) | paper_research_chain | RunnableLambda(join_graph))
    super_graph.add_node("AuthoringTeam", RunnableLambda(get_last_message) | authoring_chain | RunnableLambda(join_graph))
    super_graph.add_node("VerificationTeam", RunnableLambda(get_last_message) | verification_chain | RunnableLambda(join_graph))
    super_graph.add_node("MegaSupervisor", mega_supervisor_node)

    super_graph.add_edge("PaperResearchTeam", "MegaSupervisor")
    super_graph.add_edge("AuthoringTeam", "MegaSupervisor")
    super_graph.add_edge("VerificationTeam", "MegaSupervisor")

    super_graph.add_conditional_edges(
        "MegaSupervisor",
        lambda x: x["next"],
        {
            "PaperResearchTeam": "PaperResearchTeam",
            "AuthoringTeam": "AuthoringTeam",
            "VerificationTeam": "VerificationTeam",
            "FINISH": END,
        },
    )
    super_graph.set_entry_point("MegaSupervisor")
    compiled_super_graph = super_graph.compile()

    log_agent_execution("System", "graph_compiled", "All agent teams and supervisor configured")
    return compiled_super_graph

def run_linkedin_agent(query: str, openai_api_key: str, tavily_api_key: Optional[str] = None, rag_service: Optional[RAGService] = None, pdf_filename: Optional[str] = None):
    """Run the LinkedIn post writing agent"""
    
    global working_directory, execution_logs
    
    # IMPORTANT: Reset execution logs for each new request to prevent stale data
    execution_logs = []
    working_directory = None
    
    # Validate inputs
    if not query or query.strip() == "":
        raise ValueError("Query cannot be empty")
    
    if not openai_api_key or openai_api_key.strip() == "":
        raise ValueError("OpenAI API key is required and cannot be empty")
    
    log_agent_execution("System", "starting", f"Query: {query[:100]}...")
    
    # Create and run the agent
    agent = create_linkedin_agent(openai_api_key, tavily_api_key, rag_service, pdf_filename)
    
    # Initialize state
    initial_state = {
        "messages": [HumanMessage(content=query)],
        "next": ""
    }
    
    # Run the agent
    log_agent_execution("System", "executing", "Running multi-crew agent teams")
    result = agent.invoke(initial_state)
    
    # Extract final answer
    final_answer = result["messages"][-1].content if result["messages"] else "No response generated"
    
    log_agent_execution("System", "completed", f"Generated {len(final_answer)} character response")
    
    return {
        "final_answer": final_answer,
        "working_directory": working_directory,
        "execution_logs": execution_logs
    }

def get_execution_logs():
    """Get the current execution logs"""
    global execution_logs
    return execution_logs

def get_working_directory():
    """Get the current working directory path"""
    global working_directory
    return working_directory

# End of file - LinkedIn agent implementation complete



