import axios, { AxiosInstance, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

let rawBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
if (rawBaseURL && !rawBaseURL.startsWith('http://') && !rawBaseURL.startsWith('https://')) {
  rawBaseURL = `https://${rawBaseURL}`;
}
if (rawBaseURL && !rawBaseURL.endsWith('/api')) {
  rawBaseURL = `${rawBaseURL.replace(/\/+$/, '')}/api`;
}
const baseURL = rawBaseURL;

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('token') || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: <T>(url: string, config = {}) => apiClient.get<any, AxiosResponse<T>>(url, config).then(res => res.data),
  post: <T>(url: string, data?: any, config = {}) => apiClient.post<any, AxiosResponse<T>>(url, data, config).then(res => res.data),
  put: <T>(url: string, data?: any, config = {}) => apiClient.put<any, AxiosResponse<T>>(url, data, config).then(res => res.data),
  patch: <T>(url: string, data?: any, config = {}) => apiClient.patch<any, AxiosResponse<T>>(url, data, config).then(res => res.data),
  delete: <T>(url: string, config = {}) => apiClient.delete<any, AxiosResponse<T>>(url, config).then(res => res.data),
};
