import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import ApiKeyInput from './ApiKeyInput';
import { PDFManager } from './PDFManager';
import { 
  chatService, 
  type AgentLogEntry, 
  type WorkingDirectoryFile, 
  type LinkedInPostResponse 
} from '../services/chatService';

interface LinkedInMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type PostType = 'explainer' | 'critique' | 'consequences' | 'open_questions';

const POST_TYPES = [
  { value: 'explainer', label: '📚 Explainer', description: 'Explain the key concepts and findings of the paper' },
  { value: 'critique', label: '🔍 Critique', description: 'Analyze strengths, weaknesses, and limitations' },
  { value: 'consequences', label: '🌊 Consequences', description: 'Discuss implications and potential impact' },
  { value: 'open_questions', label: '❓ Open Questions', description: 'Highlight remaining research questions and gaps' },
] as const;

const LinkedInWriter: React.FC = () => {
  const [result, setResult] = useState<LinkedInMessage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [tavilyApiKey, setTavilyApiKey] = useState<string>('');
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [postType, setPostType] = useState<PostType>('explainer');
  
  // Sidebar state
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([]);
  const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);
  const [documents, setDocuments] = useState<WorkingDirectoryFile[]>([]);
  const [documentContents, setDocumentContents] = useState<Record<string, string>>({});
  const [sidebarTab, setSidebarTab] = useState<'logs' | 'docs'>('logs');

  const resultRef = useRef<HTMLDivElement>(null);

  const scrollToResult = () => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (result) {
      scrollToResult();
    }
  }, [result]);

  const fetchDocuments = useCallback(async () => {
    if (!workingDirectory) return;
    
    try {
      const response = await chatService.getWorkingDirectoryFiles(workingDirectory);
      
      // Fetch content for all documents FIRST, then update both states together
      const contents: Record<string, string> = {};
      const validDocuments: WorkingDirectoryFile[] = [];
      
      // Process documents in batches to prevent too many simultaneous requests
      const batchSize = 3; // Process 3 documents at a time
      for (let i = 0; i < response.files.length; i += batchSize) {
        const batch = response.files.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (doc) => {
          try {
            const contentResponse = await chatService.getFileContent(workingDirectory, doc.filename);
            contents[doc.filename] = contentResponse.content;
            validDocuments.push(doc);
            console.log(`✅ Loaded content for ${doc.filename}: ${contentResponse.content.length} chars`);
          } catch (error) {
            console.error(`❌ Error fetching content for ${doc.filename}:`, error);
            // Reduced retry delay and only retry if it's likely a timing issue
            if (error instanceof Error && error.message.includes('404')) {
              try {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for file to be written
                const retryResponse = await chatService.getFileContent(workingDirectory, doc.filename);
                contents[doc.filename] = retryResponse.content;
                validDocuments.push(doc);
                console.log(`✅ Retry successful for ${doc.filename}: ${retryResponse.content.length} chars`);
              } catch (retryError) {
                console.error(`❌ Retry failed for ${doc.filename}:`, retryError);
                contents[doc.filename] = `❌ Error loading content: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`;
                validDocuments.push(doc); // Still include it so user can see the error
              }
            } else {
              // For non-404 errors, don't retry
              contents[doc.filename] = `❌ Error loading content: ${error instanceof Error ? error.message : 'Unknown error'}`;
              validDocuments.push(doc);
            }
          }
        }));
      }
      
      // Update both states atomically to prevent race condition
      setDocuments(validDocuments);
      setDocumentContents(contents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [workingDirectory]);

  useEffect(() => {
    // Check if API keys are stored in localStorage
    const savedApiKey = localStorage.getItem('linkedin_writer_api_key');
    const savedTavilyApiKey = localStorage.getItem('linkedin_writer_tavily_key');
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsApiKeySet(true);
    }
    
    if (savedTavilyApiKey) {
      setTavilyApiKey(savedTavilyApiKey);
    }
  }, []);

  // Fetch logs and documents when working directory is available
  useEffect(() => {
    if (workingDirectory) {
      fetchDocuments();
    }
  }, [workingDirectory, fetchDocuments]);

  // Poll for agent logs during execution
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      pollInterval = setInterval(async () => {
        try {
          const response = await chatService.getAgentLogs();
          setAgentLogs(response.logs);
          if (response.working_directory && !workingDirectory) {
            setWorkingDirectory(response.working_directory);
          }
        } catch (error) {
          console.error('Error fetching agent logs:', error);
        }
      }, 1000); // Poll every 1 second for real-time updates (reduced from 500ms to prevent spam)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isLoading, workingDirectory]);

  // Poll for document updates during execution - LESS FREQUENT to prevent spamming
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (isLoading && workingDirectory) {
      pollInterval = setInterval(async () => {
        try {
          await fetchDocuments();
        } catch (error) {
          console.error('Error polling documents:', error);
        }
      }, 3000); // Poll documents every 3 seconds during execution to prevent spamming
    } else if (!isLoading && workingDirectory && documents.length === 0) {
      // One final fetch after execution completes if no documents loaded yet
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isLoading, workingDirectory, fetchDocuments, documents.length]);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setIsApiKeySet(true);
    localStorage.setItem('linkedin_writer_api_key', key);
  };

  const handleApiKeyReset = () => {
    setApiKey('');
    setIsApiKeySet(false);
    setTavilyApiKey('');
    localStorage.removeItem('linkedin_writer_api_key');
    localStorage.removeItem('linkedin_writer_tavily_key');
  };

  const getTemplateMessage = (type: PostType): string => {
    const templates = {
      explainer: "Create an engaging LinkedIn post that explains the key concepts, methodology, and findings of this machine learning paper. Make it accessible to a broad professional audience while highlighting the technical innovations and practical applications.",
      critique: "Write a thoughtful LinkedIn post that provides a balanced critique of this ML/AI paper. Analyze the strengths of the research, identify potential limitations or weaknesses, discuss the methodology, and evaluate the significance of the contributions to the field.",
      consequences: "Develop a LinkedIn post discussing the broader implications and potential consequences of this machine learning research. Explore how these findings might impact industry practices, future research directions, ethical considerations, and real-world applications.",
      open_questions: "Create a LinkedIn post that highlights the interesting open questions and research gaps that remain after this ML/AI paper. Discuss what future research could explore, unresolved challenges, and how the community might build upon these findings."
    };
    return templates[type];
  };

  const handleWritePost = async () => {
    if (!apiKey.trim() || !isApiKeySet) {
      alert('Please enter your OpenAI API key');
      return;
    }

    if (!selectedPdf) {
      alert('Please upload a PDF paper first');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setAgentLogs([]); // Clear existing logs
    setDocuments([]);
    setDocumentContents({});
    setWorkingDirectory(null); // Reset working directory to prevent stale data
    setSidebarTab('logs'); // Switch to logs tab to show progress

    try {
      const templateMessage = getTemplateMessage(postType);
      
      const response: LinkedInPostResponse = await chatService.sendLinkedInPostMessage({
        message: templateMessage,
        api_key: apiKey,
        tavily_api_key: tavilyApiKey || undefined,
        pdf_filename: selectedPdf,
      });

      // Add AI response
      const aiMessage: LinkedInMessage = {
        role: 'assistant',
        content: response.final_answer,
        timestamp: new Date(),
      };
      setResult(aiMessage);

      // Update logs and working directory
      if (response.execution_logs) {
        setAgentLogs(response.execution_logs);
      }
      
      if (response.working_directory) {
        setWorkingDirectory(response.working_directory);
      }

    } catch (error: any) {
      console.error('Error generating LinkedIn post:', error);
      let errorContent = 'Sorry, I encountered an error while generating your LinkedIn post.';
      
      if (error.response?.status === 401) {
        errorContent = 'Invalid OpenAI API key. Please check your API key and try again.';
      } else if (error.response?.data?.detail) {
        errorContent = error.response.data.detail;
      } else if (error.message) {
        errorContent = `Error: ${error.message}`;
      }
      
      const errorMessage: LinkedInMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setResult(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPost = () => {
    // Complete reset of all state for new post
    setResult(null);
    setAgentLogs([]);
    setDocuments([]);
    setDocumentContents({});
    setWorkingDirectory(null);
    setIsLoading(false);
    setSidebarTab('logs');
    console.log('🔄 New post - all state reset');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">📝 LinkedIn Post Writer</h1>
            {result && (
              <button
                onClick={handleNewPost}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Post
              </button>
            )}
          </div>
          
          {/* API Keys and PDF Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* OpenAI API Key */}
            <div>
              <ApiKeyInput 
                apiKey={apiKey} 
                onSubmit={handleApiKeySubmit} 
                onReset={handleApiKeyReset} 
                isSet={isApiKeySet} 
              />
            </div>
            
            {/* Tavily API Key */}
            <div>
              <label htmlFor="tavily-key" className="block text-sm font-medium text-gray-700 mb-1">
                Tavily API Key (Optional)
              </label>
              <input
                id="tavily-key"
                type="password"
                value={tavilyApiKey}
                onChange={(e) => {
                  setTavilyApiKey(e.target.value);
                  if (e.target.value) {
                    localStorage.setItem('linkedin_writer_tavily_key', e.target.value);
                  } else {
                    localStorage.removeItem('linkedin_writer_tavily_key');
                  }
                }}
                placeholder="Enter Tavily API key for web search"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                For current AI/ML trends and news
              </p>
            </div>

            {/* PDF Selection */}
            <div>
              <PDFManager selectedPDF={selectedPdf} onPDFSelect={setSelectedPdf} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            
            {!result ? (
              /* Configuration Interface */
              <div className="flex-1 flex flex-col justify-center p-4">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Create LinkedIn Post 🚀</h2>
                  
                  {/* Compact Team Overview */}
                  <div className="flex justify-center gap-1 mb-4 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">📚 Research</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">✍️ Writing</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">✅ Verification</span>
                  </div>
                </div>

                {/* Compact Post Type Selector */}
                <div className="max-w-lg mx-auto w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type:
                  </label>
                  <div className="grid grid-cols-2 gap-1 mb-4">
                    {POST_TYPES.map((type) => (
                      <label key={type.value} className="relative">
                        <input
                          type="radio"
                          name="postType"
                          value={type.value}
                          checked={postType === type.value}
                          onChange={(e) => setPostType(e.target.value as PostType)}
                          className="sr-only"
                        />
                        <div className={`p-2 border-2 rounded cursor-pointer transition-all ${
                          postType === type.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="font-medium text-gray-900 text-xs">{type.label}</div>
                          <div className="text-xs text-gray-500 mt-1 leading-tight">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Write Post Button */}
                  <button
                    onClick={handleWritePost}
                    disabled={isLoading || !selectedPdf || !isApiKeySet}
                    className={`w-full py-3 px-4 text-white font-semibold rounded-lg transition-all ${
                      isLoading || !selectedPdf || !isApiKeySet
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-sm">Agents working...</span>
                      </div>
                    ) : (
                      '🚀 Write LinkedIn Post'
                    )}
                  </button>

                  {(!selectedPdf || !isApiKeySet) && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {!isApiKeySet && 'Enter API key. '}
                      {!selectedPdf && 'Upload PDF. '}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Result Display - Show All Generated Content */
              <div className="flex-1 overflow-y-auto p-6" ref={resultRef}>
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      LinkedIn Post Generation Complete ({POST_TYPES.find(t => t.value === postType)?.label})
                    </h3>
                    <span className="text-sm text-gray-500">
                      Generated {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* Show all generated documents */}
                  {documents.length > 0 ? (
                    <div className="space-y-8">
                      {documents
                        .sort((a, b) => {
                          // Sort to show logical order: outline first, then drafts, then final
                          const order = ['outline_', 'draft_', 'post_', 'edited_', 'viral_', 'outline', 'draft', 'post', 'final'];
                          const aFileName = a.filename.toLowerCase();
                          const bFileName = b.filename.toLowerCase();
                          const aOrder = order.findIndex(keyword => aFileName.includes(keyword));
                          const bOrder = order.findIndex(keyword => bFileName.includes(keyword));
                          if (aOrder === -1 && bOrder === -1) return a.filename.localeCompare(b.filename);
                          if (aOrder === -1) return 1;
                          if (bOrder === -1) return -1;
                          return aOrder - bOrder;
                        })
                        .map((doc, index) => (
                        <div key={doc.filename} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          {/* Document Header */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900">
                                📄 {doc.filename.replace(/\.(txt|md)$/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-500">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </span>
                                <button
                                  onClick={() => documentContents[doc.filename] && navigator.clipboard.writeText(documentContents[doc.filename])}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  📋 Copy
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Document Content */}
                          <div className="p-6">
                            {documentContents[doc.filename] ? (
                              <div className="prose prose-lg max-w-none">
                                <ReactMarkdown>{documentContents[doc.filename]}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="text-gray-500 italic">
                                {isLoading ? "Loading content..." : "⚠️ Content not available"}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Final Summary */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                        <h4 className="text-lg font-semibold text-green-800 mb-3">🎉 Generation Complete!</h4>
                        <p className="text-green-700 mb-4">
                          Your LinkedIn post has been created by our multi-crew AI agents. Above you can see all the work products:
                          outlines, drafts, and the final polished post.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {documents.map((doc) => (
                            <button
                              key={doc.filename}
                              onClick={() => documentContents[doc.filename] && navigator.clipboard.writeText(documentContents[doc.filename])}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              📋 Copy {doc.filename.replace(/\.(txt|md)$/, '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback to original content if no documents */
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                          {result.content}
                        </div>
                      </div>
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() => navigator.clipboard.writeText(result.content)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          📋 Copy to Clipboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Show when loading or when we have agent data */}
        {(isLoading || agentLogs.length > 0 || documents.length > 0) && (
          <div className="w-96 flex flex-col p-4 pl-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSidebarTab('logs')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      sidebarTab === 'logs'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🔍 Agent Logs ({agentLogs.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('docs')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      sidebarTab === 'docs'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📄 Documents ({documents.length})
                  </button>
                </div>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                                  {sidebarTab === 'logs' ? (
                  /* Agent Logs Tab */
                  <div className="p-4">
                    {agentLogs.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        {isLoading ? "🔄 Waiting for agent logs..." : "No agent logs yet. Run the LinkedIn writer to see logs."}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {agentLogs.map((log, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-blue-600">{log.agent_name}</span>
                              <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mb-1">{log.action}</div>
                            <div className="text-xs text-gray-600">{log.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Documents Tab - Show all content inline */
                  <div className="flex-1 overflow-y-auto p-4">
                    {documents.length === 0 ? (
                      <p className="text-gray-500 text-sm">No documents created yet. Run the LinkedIn writer to see generated documents.</p>
                    ) : (
                      <div className="space-y-6">
                        {documents.map((doc) => (
                          <div key={doc.filename} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* File Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900 text-sm">{doc.filename}</h4>
                              <div className="text-xs text-gray-500 mt-1">
                                {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.modified).toLocaleString()}
                              </div>
                            </div>
                            
                            {/* File Content */}
                            <div className="p-4">
                              {documentContents[doc.filename] ? (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown>{documentContents[doc.filename]}</ReactMarkdown>
                                </div>
                              ) : (
                                <div className="text-gray-500 text-sm italic">
                                  {isLoading ? "Loading content..." : "⚠️ Content not available"}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInWriter; 