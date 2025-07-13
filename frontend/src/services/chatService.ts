import axios from 'axios';
import { 
  ChatRequest, ChatResponse, ConversationResponse, 
  PDFUploadResponse, PDFInfo, DeletePDFResponse 
} from '../types/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DeepResearchRequest {
  message: string;
  api_key: string;
  tavily_api_key?: string;
  conversation_history?: ChatMessage[];
}

interface ResearchStep {
  step_number: number;
  tool_name: string;
  tool_input: string;
  tool_output: string;
  timestamp: string;
}

interface DeepResearchResponse {
  final_answer: string;
  research_steps: ResearchStep[];
}

// PRODUCTION DEPLOYMENT CONFIGURATION:
// Set REACT_APP_API_URL environment variable in DigitalOcean App Platform
// Example: https://backend-consultingchatbot-p6ase.ondigitalocean.app
// This should be set in DigitalOcean Dashboard → Settings → Environment Variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ChatService {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.apiClient.post<ChatResponse>('/api/chat', request);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async uploadPDF(file: File): Promise<PDFUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.apiClient.post<PDFUploadResponse>(
        '/api/upload-pdf', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
  }

  async getUploadedPDFs(): Promise<PDFInfo[]> {
    try {
      const response = await this.apiClient.get<PDFInfo[]>('/api/pdfs');
      return response.data;
    } catch (error) {
      console.error('Error getting PDFs:', error);
      throw error;
    }
  }

  async deletePDF(filename: string): Promise<DeletePDFResponse> {
    try {
      const response = await this.apiClient.delete<DeletePDFResponse>('/api/pdfs', {
        data: { filename }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting PDF:', error);
      throw error;
    }
  }

  async getConversations(): Promise<ConversationResponse[]> {
    try {
      const response = await this.apiClient.get<ConversationResponse[]>('/api/conversations');
      return response.data;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  async createConversation(): Promise<ConversationResponse> {
    try {
      const response = await this.apiClient.post<ConversationResponse>('/api/conversations');
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async sendDeepResearchMessage(request: DeepResearchRequest): Promise<DeepResearchResponse> {
    try {
      const response = await this.apiClient.post<DeepResearchResponse>('/api/deep-research', request);
      return response.data;
    } catch (error) {
      console.error('Error sending deep research message:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService(); 