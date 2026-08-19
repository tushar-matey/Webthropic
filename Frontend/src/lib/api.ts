import axios, { type AxiosError } from 'axios';
import { BACKEND_URL } from '../config.js';

export const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // Crucial: Send and receive HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for centralized error message extraction
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success?: boolean; message?: string; errors?: any[] }>) => {
    const customMessage = error.response?.data?.message;
    if (customMessage) {
      return Promise.reject(new Error(customMessage));
    }
    return Promise.reject(error);
  }
);
