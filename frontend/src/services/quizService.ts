import api from './api';
import type { Quiz, ForumPost, ForumComment, ForumAttachment, CreateQuizRequest, QuizComment } from '../types';

/* ─── Quiz Service ─── */
export const quizService = {
  getFeatured: async (): Promise<Quiz[]> => {
    const { data } = await api.get('/quizzes/featured');
    return data;
  },

  getAll: async (page = 0, size = 12): Promise<{ content: Quiz[]; totalPages: number }> => {
    const { data } = await api.get(`/quizzes?page=${page}&size=${size}`);
    return data;
  },

  getById: async (id: number): Promise<Quiz> => {
    const { data } = await api.get(`/quizzes/${id}`);
    return data;
  },

  recordPlay: async (id: number): Promise<Quiz> => {
    const { data } = await api.post(`/quizzes/${id}/play`);
    return data;
  },

  create: async (req: CreateQuizRequest, file?: File, coverImage?: File): Promise<Quiz> => {
    if (file || coverImage) {
      const formData = new FormData();
      formData.append('title', req.title);
      formData.append('category', req.category);
      formData.append('description', req.description || '');
      formData.append('questionCount', String(req.questionCount));
      if (file) formData.append('file', file);
      if (coverImage) formData.append('coverImage', coverImage);

      const { data } = await api.post('/quizzes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } else {
      const { data } = await api.post('/quizzes', req);
      return data;
    }
  },

  appeal: async (id: number, appealMessage: string): Promise<Quiz> => {
    const { data } = await api.put(`/quizzes/${id}/appeal`, { appealMessage });
    return data;
  },

  getComments: async (quizId: number): Promise<QuizComment[]> => {
    const { data } = await api.get(`/quizzes/${quizId}/comments`);
    return data;
  },

  addComment: async (quizId: number, content: string, parentId?: number): Promise<QuizComment> => {
    const { data } = await api.post(`/quizzes/${quizId}/comments`, { content, parentId });
    return data;
  },

  recordAttempt: async (
    quizId: number,
    score: number,
    totalQuestions: number,
    answers: { questionId: number; selectedAnswer: number | null }[] = []
  ): Promise<any> => {
    const { data } = await api.post(`/quizzes/${quizId}/attempt`, { score, totalQuestions, answers });
    return data;
  },

  getMyAttempts: async (): Promise<any[]> => {
    const { data } = await api.get('/quizzes/attempts/my');
    return data;
  },

  getMostActiveLeaderboard: async (limit = 10): Promise<any[]> => {
    const { data } = await api.get(`/leaderboards/active?limit=${limit}`);
    return data;
  },

  getTopScoringLeaderboard: async (limit = 10): Promise<any[]> => {
    const { data } = await api.get(`/leaderboards/scores?limit=${limit}`);
    return data;
  },
};

/* ─── Auth Service ─── */
export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data; // { token, user }
  },

  register: async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data; // { token, user }
  },
};

/* ─── Forum Service ─── */
export const forumService = {
  getPosts: async (): Promise<ForumPost[]> => {
    const { data } = await api.get('/forum/posts');
    return data;
  },

  getPostById: async (id: number): Promise<ForumPost> => {
    const { data } = await api.get(`/forum/posts/${id}`);
    return data;
  },

  createPost: async (
    title: string,
    content: string,
    tags: string[],
    attachments: ForumAttachment[],
    linkUrl?: string
  ): Promise<ForumPost> => {
    const { data } = await api.post('/forum/posts', {
      title,
      content,
      tags,
      attachments,
      linkUrl
    });
    return data;
  },

  uploadAttachment: async (file: File): Promise<{ url: string; name: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/forum/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  toggleLike: async (postId: number): Promise<{ likeCount: number; liked: boolean }> => {
    const { data } = await api.post(`/forum/posts/${postId}/like`);
    return data;
  },

  getComments: async (postId: number): Promise<ForumComment[]> => {
    const { data } = await api.get(`/forum/posts/${postId}/comments`);
    return data;
  },

  addComment: async (postId: number, content: string, parentId?: number): Promise<ForumComment> => {
    const { data } = await api.post(`/forum/posts/${postId}/comments`, { content, parentId });
    return data;
  },

  appeal: async (postId: number, appealMessage: string): Promise<ForumPost> => {
    const { data } = await api.put(`/forum/posts/${postId}/appeal`, { appealMessage });
    return data;
  },
};
