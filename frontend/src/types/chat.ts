export interface ChatRequest {
  message: string;
  api_key: string;
  conversation_id?: number;
  pdf_filename?: string;  // For RAG with specific PDF
}

export interface ChatResponse {
  conversation_id: number;
  response: string;
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