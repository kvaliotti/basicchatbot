import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ApiKeyInput from './components/ApiKeyInput';
import ChatInterface from './components/ChatInterface';
import DeepResearchAgent from './components/DeepResearchAgent';
import LinkedInWriter from './components/LinkedInWriter';

import { ChatProvider, useChatContext } from './context/ChatContext';
import './App.css';

function MainApp() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const { chatMode, setChatMode } = useChatContext();

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
    <div className="min-h-screen bg-gray-100">
      {!isApiKeySet ? (
        // Centered layout for API key input
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

            <div className="bg-white rounded-lg shadow-lg">
              <ApiKeyInput
                apiKey={apiKey}
                onSubmit={handleApiKeySubmit}
                onReset={handleApiKeyReset}
                isSet={isApiKeySet}
              />
            </div>
          </div>
        </div>
      ) : (
        // Full-width layout for chat interface with sidebar
        <div className="h-screen bg-gray-100 flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">
                    AI Expert Consultant & Document Chat
                  </h1>
                  <p className="text-xs text-gray-600">
                    Multi-mode consulting with research recommendations
                  </p>
                </div>
                
                {/* Mode Selector integrated into header */}
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Mode:</label>
                  <div className="relative">
                    <select
                      value={chatMode}
                      onChange={(e) => setChatMode(e.target.value as 'general' | 'research_reviewer')}
                      className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer pr-8"
                    >
                      <option value="general">💼 General</option>
                      <option value="research_reviewer">🔬 Research Reviewer</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleApiKeyReset}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Change API Key
              </button>
            </div>
          </header>
          
          <main className="flex-1 overflow-hidden">
            <ChatInterface apiKey={apiKey} />
          </main>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <ChatProvider>
            <MainApp />
          </ChatProvider>
        } />
        <Route path="/deep-research-agent" element={<DeepResearchAgent />} />
        <Route path="/linkedin-writer" element={<LinkedInWriter />} />
      </Routes>
    </Router>
  );
}

export default App; 