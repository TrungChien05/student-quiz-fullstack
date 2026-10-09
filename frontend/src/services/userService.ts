import api from './api';
import type { Quiz, ForumPost } from '../types';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  interests?: string;
  bio?: string;
  profileCompleted: boolean;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;

  totalQuizzes: number;
  totalPosts: number;
  quizzes: Quiz[];
  posts?: ForumPost[];
}

export interface UpdateProfileData {
  name?: string;
  avatar?: string;
  password?: string;
  gender?: UserProfile['gender'] | '';
  interests?: string;
  bio?: string;
}

export const userService = {
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/users/me');
    return response.data;
  },
  getUserProfile: async (userId: number): Promise<UserProfile> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  updateProfile: async (data: UpdateProfileData): Promise<UserProfile> => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
  /** Upload ảnh avatar lên Cloudinary qua endpoint riêng, trả về UserProfile đã cập nhật */
  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
