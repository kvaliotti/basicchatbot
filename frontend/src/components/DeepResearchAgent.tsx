import React, { useState, useRef, useEffect } from 'react';
import ResearchMessageList from './ResearchMessageList';
import MessageInput from './MessageInput';
import ApiKeyInput from './ApiKeyInput';
import ResearchSteps from './ResearchSteps';
import { chatService } from '../services/chatService';

interface ResearchStep {
  step_number: number;
  tool_name: string;
  tool_input: string;
  tool_output: string;
  timestamp: string;
}

interface DeepResearchMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  research_steps?: ResearchStep[];
}

const DeepResearchAgent: React.FC = () => {
  const [messages, setMessages] = useState<DeepResearchMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [tavilyApiKey, setTavilyApiKey] = useState<string>('');
  const [currentResearchSteps, setCurrentResearchSteps] = useState<ResearchStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if API keys are stored in localStorage
    const savedApiKey = localStorage.getItem('deep_research_api_key');
    const savedTavilyApiKey = localStorage.getItem('deep_research_tavily_key');
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
    }
    
    if (savedTavilyApiKey) {
      setTavilyApiKey(savedTavilyApiKey);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    localStorage.setItem('deep_research_api_key', key);
  };

  const handleApiKeyReset = () => {
    setApiKey('');
    setIsApiKeySet(false);
    setTavilyApiKey('');
    localStorage.removeItem('deep_research_api_key');
    localStorage.removeItem('deep_research_tavily_key');
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (!apiKey.trim() || !isApiKeySet) {
      alert('Please enter your OpenAI API key');
      return;
    }

    // Add user message
    const userMessage: DeepResearchMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear previous research steps
    setCurrentResearchSteps([]);
    setIsLoading(true);

    try {
      const response = await chatService.sendDeepResearchMessage({
        message: content.trim(),
        api_key: apiKey,
        tavily_api_key: tavilyApiKey || undefined,
      });

      // Update research steps
      setCurrentResearchSteps(response.research_steps);

      // Add AI response with research steps
      const aiMessage: DeepResearchMessage = {
        role: 'assistant',
        content: response.final_answer,
        timestamp: new Date(),
        research_steps: response.research_steps
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      let errorContent = 'Sorry, I encountered an error while processing your request.';
      
      if (error.response?.status === 401) {
        errorContent = 'Invalid OpenAI API key. Please check your API key and try again.';
      } else if (error.response?.data?.detail) {
        errorContent = error.response.data.detail;
      } else if (error.message) {
        errorContent = `Error: ${error.message}`;
      }
      
      const errorMessage: DeepResearchMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentResearchSteps([]);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">⚕️ Healthcare Compliance Analyst</h1>
            <button
              onClick={handleNewConversation}
              className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Chat
            </button>
          </div>
          
          {/* Compact API Keys Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* OpenAI API Key */}
            <div>
              <ApiKeyInput 
                apiKey={apiKey} 
                onSubmit={handleApiKeySubmit} 
                onReset={handleApiKeyReset} 
                isSet={isApiKeySet} 
              />
            </div>
            
            {/* Tavily API Key */}
            <div>
              <label htmlFor="tavily-key" className="block text-xs font-medium text-gray-700 mb-1">
                Tavily API Key (Optional - Web Search)
              </label>
              <input
                id="tavily-key"
                type="password"
                value={tavilyApiKey}
                onChange={(e) => {
                  setTavilyApiKey(e.target.value);
                  if (e.target.value) {
                    localStorage.setItem('deep_research_tavily_key', e.target.value);
                  } else {
                    localStorage.removeItem('deep_research_tavily_key');
                  }
                }}
                placeholder="Enter Tavily API key for web search"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get free key at <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">tavily.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Chat and Sidebar */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full min-h-0">
        {/* Chat Interface */}
        <div className="flex-1 p-3 min-h-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            {/* Chat Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <ResearchMessageList messages={messages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input - Fixed at bottom */}
            <div className="border-t border-gray-200 p-3">
              <MessageInput 
                onSendMessage={handleSendMessage} 
                disabled={isLoading}
                placeholder="Ask about healthcare regulations, HIPAA compliance, or medical policy..."
              />
            </div>
          </div>
        </div>

        {/* Research Steps Sidebar */}
        <ResearchSteps steps={currentResearchSteps} />
      </div>
    </div>
  );
};

export default DeepResearchAgent; 