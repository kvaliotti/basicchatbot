import axios from 'axios';
import { ChatRequest, ChatResponse, ConversationResponse } from '../types/chat';

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
}

export const chatService = new ChatService(); 