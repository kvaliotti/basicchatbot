export interface ChatRequest {
  message: string;
  api_key: string;
  conversation_id?: number;
  pdf_filename?: string;  // For RAG with specific PDF
  chat_mode?: 'general' | 'research_reviewer';  // NEW: Chat mode selection
}

export interface ChatResponse {
  conversation_id: number;
  response: string;
  recommendations?: string[];  // NEW: Extracted recommendations from LLM
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  id: number;
  created_at: string;
  messages: Message[];
}

// NEW: Chat mode types
export type ChatMode = 'general' | 'research_reviewer';

export interface ChatModeInfo {
  id: ChatMode;
  label: string;
  description: string;
  icon: string;
}

// NEW: Recommendation types
export interface Recommendation {
  id: string;
  content: string;
  timestamp: Date;
  sourceMessage?: string;  // The message that generated this recommendation
}

// New types for PDF/RAG functionality
export interface PDFUploadResponse {
  filename: string;
  chunks_count: number;
  status: string;
  message: string;
}

export interface PDFInfo {
  filename: string;
  chunks_count: number;
  total_length: number;
  file_size: number;
}

export interface DeletePDFRequest {
  filename: string;
}

export interface DeletePDFResponse {
  success: boolean;
  message: string;
} 