import api from './api';
import type { ChatMessage, Conversation, FriendshipStatus } from '../types';

export interface Author {
  id: number;
  name: string;
  avatar?: string;
}

export const chatService = {
  // Friendships
  sendRequest: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.post(`/friendships/request/${friendId}`);
    return response.data;
  },

  acceptRequest: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.post(`/friendships/accept/${friendId}`);
    return response.data;
  },

  declineRequest: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.post(`/friendships/decline/${friendId}`);
    return response.data;
  },

  removeFriend: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/friendships/remove/${friendId}`);
    return response.data;
  },

  getFriends: async (): Promise<Author[]> => {
    const response = await api.get('/friendships');
    return response.data;
  },

  getFriendsOfUser: async (userId: number): Promise<Author[]> => {
    const response = await api.get(`/friendships/user/${userId}`);
    return response.data;
  },

  getPendingRequests: async (): Promise<Author[]> => {
    const response = await api.get('/friendships/pending');
    return response.data;
  },

  getFriendshipStatus: async (friendId: number): Promise<FriendshipStatus> => {
    const response = await api.get(`/friendships/status/${friendId}`);
    return response.data;
  },

  // Messages
  sendMessage: async (recipientId: number, content: string): Promise<ChatMessage> => {
    const response = await api.post('/messages', { recipientId, content });
    return response.data;
  },

  getChatHistory: async (friendId: number): Promise<ChatMessage[]> => {
    const response = await api.get(`/messages/${friendId}`);
    return response.data;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  markAsRead: async (friendId: number): Promise<{ message: string }> => {
    const response = await api.post(`/messages/read/${friendId}`);
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/messages/unread-count');
    return response.data;
  }
};
