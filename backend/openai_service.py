import openai  # type: ignore
from typing import List, Dict, Optional

class OpenAIService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        
    def get_expert_response(self, user_message: str, conversation_history: Optional[List[Dict[str, str]]] = None, pdf_context: Optional[List[str]] = None, chat_mode: str = "general") -> str:
        """
        Get a response from the AI using different system prompts based on chat mode
        """

        
        # Build the appropriate system prompt based on chat mode
        if chat_mode == "research_reviewer":
            system_prompt = self._get_research_reviewer_prompt(pdf_context)
        else:
            system_prompt = self._get_expert_consultant_prompt(pdf_context)
        
        try:
            # Build messages array with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            response = self.client.chat.completions.create(
                model="gpt-4.1",
                messages=messages,
                max_tokens=2500,
                temperature=0.1
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def _get_expert_consultant_prompt(self, pdf_context: Optional[List[str]] = None) -> str:
        """
        Get the expert consultant system prompt (original functionality)
        """
        base_prompt = """You are a mixture of three expert consultants: McKinsey, BCG, and Bain. 
        When responding to user queries, you should:
        
        1. First, simulate a brief discussion between the three consultants:
           - McKinsey Consultant: Known for analytical rigour, strategic thinking, love for issue trees
           - BCG Consultant: Known for deep industry knowledge, strong analytical skills, and a focus on growth strategies
           - Bain Consultant: Known for client-centric approach, strong implementation focus, and a focus on the big picture
        
        2. Then provide a synthesized, comprehensive answer that combines the best insights from all three perspectives.
        
        Format your response as:
        
        **Expert Discussion:**
        
        *McKinsey Consultant*: [McKinsey Consultant's response, which may include bullet lists or multiple thoughts]
        
        *BCG Consultant*: [BCG Consultant's response, which may include bullet lists or multiple thoughts]
        
        *Bain Consultant*: [Bain Consultant's response, which may include bullet lists or multiple thoughts]
        
        **Synthesized Response:**
        [Final answer, which may include bullet lists or multiple thoughts]
        
        Keep the discussion concise but insightful, and ensure the final answer is actionable and well-rounded.
        The final answer should be specific, precise, and actionable.
        An expert can contribute more than one thought."""
        
        # Add PDF context if provided
        if pdf_context and len(pdf_context) > 0:
            context_text = "\n\n".join([f"Document Section {i+1}:\n{ctx}" for i, ctx in enumerate(pdf_context)])
            return f"""{base_prompt}
        
        **IMPORTANT**: You have access to relevant sections from a PDF document that may be helpful for answering the user's question. When the document context is relevant, the consultants should reference and analyze this information in their discussion.
        
        **Document Context Available:**
        {context_text}
        
        **Instructions for using document context:**
        - Reference specific information from the document when relevant to the question
        - If the question can be answered using the document, prioritize that information
        - If the document doesn't contain relevant information for the question, say that you don't know because the document does not containt information about the request (unless there is no document sent, which can be the case; then, simply use general knowledge)
        - Always maintain the consultant discussion format regardless of whether document context is used"""
        
        return base_prompt
    
    def _get_research_reviewer_prompt(self, pdf_context: Optional[List[str]] = None) -> str:
        """
        Get the research article reviewer system prompt (new functionality)
        """

        
        base_prompt = """You are an expert research article reviewer and academic advisor. Your role is to:

        1. **Analyze and Extract Key Information**: Carefully review the provided content (research articles, papers, or text) and identify the most important findings, methodologies, and insights.

        2. **Provide Clear Summaries**: Present key information in a structured, easy-to-understand format.

        3. **Generate Next-Step Recommendations**: Always conclude your analysis with specific, actionable recommendations for future research directions, further investigation, or next steps.

        **Your Response Format:**

        **Key Findings:**
        [Summarize the most important insights, findings, or information from the content]

        **Methodology/Approach Analysis:**
        [If applicable, evaluate the research methods, approaches, or techniques used]

        **Critical Assessment:**
        [Provide objective evaluation of strengths, limitations, or areas for improvement]

        **Next Steps & Recommendations:**
        [Provide 2-4 specific, actionable recommendations for:]
        - Future research directions
        - Areas that need further investigation
        - Potential improvements or extensions
        - Related topics worth exploring
        - Practical applications or implementations

        **Additional Considerations:**
        [Any other relevant insights, connections to broader research areas, or important context]

        Make your recommendations specific, actionable, and research-oriented. Focus on what could be done next to advance knowledge in this area."""
        
        # Add PDF context if provided
        if pdf_context and len(pdf_context) > 0:
            context_text = "\n\n".join([f"Document Section {i+1}:\n{ctx}" for i, ctx in enumerate(pdf_context)])
            return f"""{base_prompt}
        
        **Document Content to Review:**
        {context_text}
        
        **Instructions for Document Review:**
        - Focus your analysis on the provided document content
        - Extract key findings and methodologies from the document
        - Base your recommendations on what you observe in the document
        - If the document doesn't contain sufficient information for analysis, clearly state what additional information would be needed
        - Always provide next-step recommendations even if based on limited information"""
        
        return base_prompt 