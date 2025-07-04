import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { PDFManager } from './PDFManager';
import { useChatContext } from '../context/ChatContext';
import { chatService } from '../services/chatService';

interface ChatInterfaceProps {
  apiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiKey }) => {
  const { messages, addMessage, currentConversationId, setCurrentConversationId } = useChatContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        pdf_filename: selectedPDF ?? undefined
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

  return (
    <div className="space-y-6">
      {/* PDF Manager */}
      <PDFManager selectedPDF={selectedPDF} onPDFSelect={handlePDFSelect} />
      
      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-800">
              💬 Expert Consultant Chat
            </h3>
            {selectedPDF && (
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                📄 {selectedPDF}
              </span>
            )}
          </div>
          <button
            onClick={handleNewConversation}
            className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            New Chat
          </button>
        </div>
        
        <div className="h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t border-gray-200 p-4">
            <MessageInput 
              onSendMessage={handleSendMessage} 
              disabled={isLoading}
              placeholder={
                selectedPDF 
                  ? `Ask the expert consultants about ${selectedPDF}...`
                  : "Ask the expert consultants anything..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 