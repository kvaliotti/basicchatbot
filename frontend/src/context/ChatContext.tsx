import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChatMode, Recommendation } from '../types/chat';

// Local message type for UI state management
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  currentConversationId: number | null;
  setCurrentConversationId: (id: number | null) => void;
  // NEW: Chat mode functionality
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
  // NEW: Recommendations functionality
  recommendations: Recommendation[];
  addRecommendations: (recommendations: string[], sourceMessage?: string) => void;
  clearRecommendations: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // NEW: Add recommendations from LLM responses
  const addRecommendations = (newRecommendations: string[], sourceMessage?: string) => {
    const recommendationObjects: Recommendation[] = newRecommendations.map(rec => ({
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: rec,
      timestamp: new Date(),
      sourceMessage
    }));
    
    setRecommendations(prev => [...prev, ...recommendationObjects]);
  };

  // NEW: Clear recommendations
  const clearRecommendations = () => {
    setRecommendations([]);
  };

  // Clear messages and recommendations when starting a new conversation
  const handleSetCurrentConversationId = (id: number | null) => {
    if (id === null) {
      clearMessages();
      clearRecommendations();
    }
    setCurrentConversationId(id);
  };

  // NEW: Handle chat mode changes
  const handleSetChatMode = (mode: ChatMode) => {
    setChatMode(mode);
    // Clear conversation when switching modes
    handleSetCurrentConversationId(null);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
        currentConversationId,
        setCurrentConversationId: handleSetCurrentConversationId,
        chatMode,
        setChatMode: handleSetChatMode,
        recommendations,
        addRecommendations,
        clearRecommendations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}; 