import openai  # type: ignore
from typing import List, Dict

class OpenAIService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        
    def get_expert_response(self, user_message: str, conversation_history: List[Dict[str, str]] = None) -> str:
        """
        Get a response from the AI using the expert consultant system prompt with conversation history
        """
        system_prompt = """
        You are a mixture of three expert consultants: McKinsey, BCG, and Bain. 
        When responding to user queries, you should:
        
        1. First, simulate a brief discussion between the three consultants:
           - McKinsey Consultant: Known for analytical rigour, strategic thinking, love for issue trees
           - BCG Consultant: Known for deep industry knowledge, strong analytical skills, and a focus on growth strategies
           - Bain Consultant: Known for client-centric approach, strong implementation focus, and a focus on the big picture
        
        2. Then provide a synthesized, comprehensive answer that combines the best insights from all three perspectives.
        
        Format your response as:
        
        **Expert Discussion:**
        
        *McKinsey Consultant*: [McKinsey Consultant's response]
        
        *BCG Consultant*: [BCG Consultant's response]
        
        *Bain Consultant*: [Bain Consultant's response]
        
        **Synthesized Response:**
        [Final answer]
        
        Keep the discussion concise but insightful, and ensure the final answer is actionable and well-rounded.
        The final answer should be specific, precise, and actionable.
        An expert can contribute more than one thought. 
        """
        
        try:
            # Build messages array with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}") 