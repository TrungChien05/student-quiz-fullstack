import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:8080/api' : '/api'
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor – attach token
api.interceptors.request.use((config) => {
  if (config.headers.Authorization) {
    return config;
  }
  const url = config.url || '';
  const isAdminPath = url.startsWith('/admin') || url.startsWith('admin') || url.includes('/admin/');
  const token = isAdminPath
    ? (localStorage.getItem('admin_token') || localStorage.getItem('token'))
    : (localStorage.getItem('token') || localStorage.getItem('admin_token'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message as string | undefined;
    const isLocked = error.response?.status === 403 && msg?.toLowerCase().includes('khóa');

    if (error.response?.status === 401 || isLocked) {
      if (isLocked && msg) {
        sessionStorage.setItem('accountLockMessage', msg);
      }
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
