import React, { createContext, useContext, useState, ReactNode } from 'react';

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

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // Clear messages when starting a new conversation
  const handleSetCurrentConversationId = (id: number | null) => {
    if (id === null) {
      clearMessages();
    }
    setCurrentConversationId(id);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
        currentConversationId,
        setCurrentConversationId: handleSetCurrentConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}; 