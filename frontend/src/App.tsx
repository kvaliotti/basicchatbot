import React, { useState, useEffect } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import ChatInterface from './components/ChatInterface';
import { ChatProvider } from './context/ChatContext';
import './App.css';

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);

  useEffect(() => {
    // Check if API key is stored in localStorage
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    localStorage.setItem('openai_api_key', key);
  };

  const handleApiKeyReset = () => {
    setApiKey('');
    setIsApiKeySet(false);
    localStorage.removeItem('openai_api_key');
  };

  return (
    <ChatProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                AI Expert Consultant & Document Chat
              </h1>
              <p className="text-gray-600">
                Get insights from McKinsey, BCG, and Bain consultants or chat with your PDF documents using RAG
              </p>
            </header>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg">
                <ApiKeyInput
                  apiKey={apiKey}
                  onSubmit={handleApiKeySubmit}
                  onReset={handleApiKeyReset}
                  isSet={isApiKeySet}
                />
              </div>
              
              {isApiKeySet && (
                <ChatInterface apiKey={apiKey} />
              )}
            </div>
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}

export default App; 