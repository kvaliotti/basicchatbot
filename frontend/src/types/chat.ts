export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  api_key: string;
  conversation_id?: number;
}

export interface ChatResponse {
  conversation_id: number;
  response: string;
}

export interface MessageResponse {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  id: number;
  created_at: string;
  messages: MessageResponse[];
} 