import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { PDFManager } from './PDFManager';
import { RecommendationsSidebar } from './RecommendationsSidebar';
import { useChatContext } from '../context/ChatContext';
import { chatService } from '../services/chatService';

interface ChatInterfaceProps {
  apiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiKey }) => {
  const { 
    messages, 
    addMessage, 
    currentConversationId, 
    setCurrentConversationId,
    chatMode,
    recommendations,
    addRecommendations,
    clearRecommendations
  } = useChatContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to extract recommendations from LLM response
  const extractRecommendations = (response: string): string[] => {
    const recommendations: string[] = [];
    
    // Look for various patterns that indicate recommendations
    const patterns = [
      /(?:next steps?|recommendations?|suggestions?|consider|you (?:might|could|should)|i (?:recommend|suggest)|moving forward)[:,-]?\s*(.+?)(?:\n\n|\.|$)/gi,
      /(?:future research|further (?:investigation|research|study)|areas? (?:to explore|for (?:investigation|research)))[:,-]?\s*(.+?)(?:\n\n|\.|$)/gi,
      /(?:potential (?:directions?|approaches?|strategies)|possible (?:next steps?|avenues?))[:,-]?\s*(.+?)(?:\n\n|\.|$)/gi
    ];

    patterns.forEach(pattern => {
      const matches = Array.from(response.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          const recommendation = match[1].trim()
            .replace(/^\d+\.?\s*/, '') // Remove leading numbers
            .replace(/^[•\-*]\s*/, '') // Remove bullet points
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          if (recommendation.length > 15 && !recommendations.includes(recommendation)) {
            recommendations.push(recommendation);
          }
        }
      }
    });

    return recommendations;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    });

    setIsLoading(true);

    try {
      const response = await chatService.sendMessage({
        message: content.trim(),
        api_key: apiKey,
        conversation_id: currentConversationId ?? undefined,
        pdf_filename: selectedPDF ?? undefined,
        chat_mode: chatMode
      });

      // Update conversation ID if it's a new conversation
      if (!currentConversationId) {
        setCurrentConversationId(response.conversation_id);
      }

      // Add AI response
      addMessage({
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      });

      // Extract and add recommendations for research_reviewer mode
      if (chatMode === 'research_reviewer') {
        const extractedRecommendations = extractRecommendations(response.response);
        if (extractedRecommendations.length > 0) {
          addRecommendations(extractedRecommendations, content.trim());
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please check your API key and try again.',
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handlePDFSelect = (filename: string | null) => {
    setSelectedPDF(filename);
    // Optionally start a new conversation when switching modes
    if (filename !== selectedPDF) {
      handleNewConversation();
    }
  };

  const getChatTitle = () => {
    switch (chatMode) {
      case 'research_reviewer':
        return '🔬 Research Article Reviewer';
      case 'general':
      default:
        return '💼 Expert Consultant Chat';
    }
  };

  const getPlaceholderText = () => {
    if (selectedPDF) {
      return chatMode === 'research_reviewer' 
        ? `Analyze ${selectedPDF} and suggest next research steps...`
        : `Ask the expert consultants about ${selectedPDF}...`;
    }
    
    return chatMode === 'research_reviewer'
      ? 'Ask for research analysis and next-step recommendations...'
      : 'Ask the expert consultants anything...';
  };

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* PDF Manager - Compact */}
        <div className="flex-shrink-0 mb-3">
          <PDFManager selectedPDF={selectedPDF} onPDFSelect={handlePDFSelect} />
        </div>
        
        {/* Chat Interface - Takes remaining space */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center p-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-semibold text-gray-800">
                {getChatTitle()}
              </h3>
              {selectedPDF && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  📄 {selectedPDF}
                </span>
              )}
            </div>
            <button
              onClick={handleNewConversation}
              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
            >
              New Chat
            </button>
          </div>
          
          {/* Chat Messages - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-4">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input - Fixed at bottom */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <MessageInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
              placeholder={getPlaceholderText()}
            />
          </div>
        </div>
      </div>
      
      {/* Recommendations Sidebar - only show for research_reviewer mode */}
      {chatMode === 'research_reviewer' && (
        <RecommendationsSidebar 
          recommendations={recommendations}
          onClearRecommendations={clearRecommendations}
        />
      )}
    </div>
  );
};

export default ChatInterface; 