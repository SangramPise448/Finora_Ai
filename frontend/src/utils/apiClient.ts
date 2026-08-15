import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getStoredToken = (): string | null => {
  return localStorage.getItem('finora_token') || sessionStorage.getItem('finora_token');
};

export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem('finora_refresh_token') || sessionStorage.getItem('finora_refresh_token');
};

export const clearStoredAuth = () => {
  localStorage.removeItem('finora_token');
  localStorage.removeItem('finora_refresh_token');
  sessionStorage.removeItem('finora_token');
  sessionStorage.removeItem('finora_refresh_token');
  delete apiClient.defaults.headers.common['Authorization'];
};

export const setStoredTokens = (accessToken: string, refreshToken?: string, rememberMe: boolean = true) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('finora_token', accessToken);
  if (refreshToken) {
    storage.setItem('finora_refresh_token', refreshToken);
  }
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
};

// Create Axios Instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single-Flight Queue state variables
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach current token dynamically
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Single-Flight Refresh Queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Don't intercept auth endpoints like login/register/refresh itself
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue pending request until refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('finora:session-expired'));
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const resData = refreshResponse.data;
        const newAccessToken = resData.access_token || resData.data?.access_token;
        const newRefreshToken = resData.refresh_token || resData.data?.refresh_token || refreshToken;

        if (!newAccessToken) {
          throw new Error('Refresh response missing token');
        }

        const isLocal = Boolean(localStorage.getItem('finora_token'));
        setStoredTokens(newAccessToken, newRefreshToken, isLocal);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('finora:session-expired'));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
