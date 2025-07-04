import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChatContext } from '../context/ChatContext';
import { chatService } from '../services/chatService';

interface ChatInterfaceProps {
  apiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiKey }) => {
  const { messages, addMessage, currentConversationId, setCurrentConversationId } = useChatContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
        conversation_id: currentConversationId ?? undefined
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

  return (
    <div className="flex flex-col h-96">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Chat</h3>
        <button
          onClick={handleNewConversation}
          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 p-4">
        <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface; 