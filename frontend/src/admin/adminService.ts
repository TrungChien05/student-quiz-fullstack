import api from '../services/api';

const ADMIN_TOKEN_KEY = 'admin_token';

export const adminService = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/admin-login', { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    return data;
  },

  logout: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),

  isLoggedIn: () => !!localStorage.getItem(ADMIN_TOKEN_KEY),

  // ─── Stats ───────────────────────────────────────────────────────────────
  getStats: async () => {
    const { data } = await api.get('/admin/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data as { totalUsers: number; totalQuizzes: number; totalPosts: number; totalPlays: number };
  },

  // ─── Users ───────────────────────────────────────────────────────────────
  getUsers: async (page = 0, size = 10) => {
    const { data } = await api.get(`/admin/users?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  updateUserRole: async (id: number, role: string) => {
    const { data } = await api.put(`/admin/users/${id}/role`, { role }, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  deleteUser: async (id: number) => {
    await api.delete(`/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
  },

  updateUserLock: async (id: number, locked: boolean, lockReason?: string) => {
    const { data } = await api.put(`/admin/users/${id}/lock`, { locked, lockReason }, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data as { locked: boolean; lockReason: string; message: string };
  },

  // ─── Quizzes ─────────────────────────────────────────────────────────────
  getQuizzes: async (page = 0, size = 10) => {
    const { data } = await api.get(`/admin/quizzes?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  updateQuizStatus: async (id: number, status: string, rejectReason?: string) => {
    const { data } = await api.put(`/admin/quizzes/${id}/status`, { status, rejectReason }, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  deleteQuiz: async (id: number) => {
    await api.delete(`/admin/quizzes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
  },

  toggleQuizFeatured: async (id: number) => {
    const { data } = await api.put(`/admin/quizzes/${id}/featured`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data as { featured: boolean; message: string };
  },

  // ─── Forum ───────────────────────────────────────────────────────────────
  getPosts: async (page = 0, size = 10) => {
    const { data } = await api.get(`/admin/forum/posts?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  updatePostStatus: async (id: number, status: string, rejectReason?: string) => {
    const { data } = await api.put(`/admin/forum/posts/${id}/status`, { status, rejectReason }, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
    return data;
  },

  deletePost: async (id: number) => {
    await api.delete(`/admin/forum/posts/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` },
    });
  },
};

