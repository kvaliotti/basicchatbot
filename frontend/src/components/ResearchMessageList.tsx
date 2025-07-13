import React from 'react';
import ReactMarkdown from 'react-markdown';

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

interface ResearchMessageListProps {
  messages: DeepResearchMessage[];
  isLoading: boolean;
}

const ResearchMessageList: React.FC<ResearchMessageListProps> = ({ messages, isLoading }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-4xl px-4 py-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 border border-gray-200'
            }`}
          >
            {message.role === 'assistant' ? (
              // Render AI responses with markdown
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    // Style headings
                    h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold text-gray-800 mt-3 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-md font-bold text-gray-700 mt-2 mb-1">{children}</h3>,
                    
                    // Style strong/bold text
                    strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                    
                    // Style paragraphs
                    p: ({ children }) => <p className="mb-3 text-gray-800 leading-relaxed">{children}</p>,
                    
                    // Style lists
                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-800">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-800">{children}</ol>,
                    li: ({ children }) => <li className="ml-2">{children}</li>,
                    
                    // Style links
                    a: ({ children, href }) => (
                      <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                    
                    // Style code blocks
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono text-gray-900">
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      );
                    },
                    
                    // Style blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-3">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              // Render user messages as plain text
              <div className="text-white">
                {message.content}
              </div>
            )}
            
            <div className={`text-xs mt-2 ${
              message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 border border-gray-200 px-4 py-3 rounded-lg max-w-4xl">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-gray-600 text-sm">Conducting healthcare compliance research...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchMessageList; 