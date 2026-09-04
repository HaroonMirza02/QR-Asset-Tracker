import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Bearer JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('qr_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isPublicRoute = window.location.pathname.startsWith('/scan');
      if (!isPublicRoute) {
        const msg = error.response.data?.error?.message || '';
        localStorage.setItem('qr_auth_error', msg);
        localStorage.removeItem('qr_auth_token');
        localStorage.removeItem('qr_auth_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: any): string {
  if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  return error?.message || 'An unexpected error occurred. Please try again.';
}

export function cleanParams(params: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== undefined && value !== null) {
      clean[key] = value;
    }
  }
  return clean;
}
