import axios from 'axios';
import { validateAndCleanupToken, isTokenExpired } from '../utils/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  // Auto cleanup expired tokens
  if (token && isTokenExpired(token)) {
    console.warn('⚠️ Token expired, cleaning up...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return Promise.reject(new Error('Token expired'));
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenPreview: token.substring(0, 20) + '...'
    });
  } else {
    console.warn('No token found for request:', config.url);
  }
  return config;
});

// Handle 401 and 403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Log 403 errors for debugging
    if (error.response?.status === 403) {
      console.error('403 Forbidden Error:', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.response?.data?.error
      });
    }
    return Promise.reject(error);
  }
);

export default api;

