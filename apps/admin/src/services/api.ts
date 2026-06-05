import axios from 'axios';
import type { ApiResponse } from '../types/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
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
    const message = err.response?.data?.message || err.message || '网络错误';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
