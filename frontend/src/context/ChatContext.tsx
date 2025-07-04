import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Message } from '../types/chat';

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  const addMessage = (message: Message) => {
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