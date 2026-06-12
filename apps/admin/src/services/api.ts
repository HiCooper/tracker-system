import axios from 'axios';
import type { ApiResponse } from '../types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('gateflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap ApiResponse and handle errors
apiClient.interceptors.response.use(
  (res) => {
    const body = res.data as ApiResponse<unknown>;
    if (body.code !== 200) {
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return { ...res, data: body.data };
  },
  (err) => {
    if (err.response?.status === 401) {
      // Clear persisted auth state
      sessionStorage.removeItem('gateflow_token');
      localStorage.removeItem('gateflow_user');
      localStorage.removeItem('gateflow_role');
      // Dispatch event so React router can handle redirect without page reload
      window.dispatchEvent(new CustomEvent('gateflow:auth-expired'));
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    const message = err.response?.data?.message || err.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
