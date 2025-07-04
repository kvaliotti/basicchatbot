import React from 'react';

// Local message type for UI (matches ChatContext)
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const formatMessage = (content: string) => {
    // Split content by markdown headers and format accordingly
    const parts = content.split(/(\*\*[^*]+\*\*)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-gray-800">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      // Handle italic text
      if (part.includes('*') && !part.includes('**')) {
        const italicParts = part.split(/(\*[^*]+\*)/);
        return italicParts.map((italicPart, italicIndex) => {
          if (italicPart.startsWith('*') && italicPart.endsWith('*')) {
            return (
              <em key={`${index}-${italicIndex}`} className="italic text-blue-600">
                {italicPart.slice(1, -1)}
              </em>
            );
          }
          return italicPart;
        });
      }
      
      return part;
    });
  };

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Start a conversation with our AI expert consultants!</p>
        <p className="text-sm mt-2">Get insights from McKinsey, BCG, and Bain consultant perspectives.</p>
        <p className="text-sm mt-1">Upload a PDF to provide document context for more specific analysis!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl px-4 py-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Expert Consultants</span>
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed">
              {formatMessage(message.content)}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Expert Consultants</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <span className="ml-2 text-sm text-gray-600">Consulting...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList; 