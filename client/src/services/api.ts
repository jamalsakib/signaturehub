import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Attach JWT to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expiry — attempt refresh
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  getLoginUrl: () => api.get<{ loginUrl: string }>('/auth/login'),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
  sync: (id: string) => api.post(`/users/${id}/sync`),
  getSignature: (id: string, preview = false) => api.get(`/users/${id}/signature`, { params: { preview } }),
};

// ── Business Units ───────────────────────────────────────────────────────────
export const businessUnitsApi = {
  list: () => api.get('/business-units'),
  get: (id: string) => api.get(`/business-units/${id}`),
  create: (data: unknown) => api.post('/business-units', data),
  update: (id: string, data: unknown) => api.put(`/business-units/${id}`, data),
  delete: (id: string) => api.delete(`/business-units/${id}`),
};

// ── Templates ────────────────────────────────────────────────────────────────
export const templatesApi = {
  list: (params?: Record<string, unknown>) => api.get('/templates', { params }),
  get: (id: string) => api.get(`/templates/${id}`),
  preview: (id: string, overrides?: Record<string, string>) =>
    api.post(`/templates/${id}/preview`, overrides || {}),
  create: (data: unknown) => api.post('/templates', data),
  update: (id: string, data: unknown) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  clone: (id: string) => api.post(`/templates/${id}/clone`),
  import: (data: unknown) => api.post('/templates/import', data),
};

// ── Campaigns ────────────────────────────────────────────────────────────────
export const campaignsApi = {
  list: (params?: Record<string, unknown>) => api.get('/campaigns', { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  analytics: (id: string, params?: Record<string, unknown>) =>
    api.get(`/campaigns/${id}/analytics`, { params }),
  create: (data: unknown) => api.post('/campaigns', data),
  update: (id: string, data: unknown) => api.put(`/campaigns/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/campaigns/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
};

// ── Rules ────────────────────────────────────────────────────────────────────
export const rulesApi = {
  list: () => api.get('/rules'),
  get: (id: string) => api.get(`/rules/${id}`),
  create: (data: unknown) => api.post('/rules', data),
  update: (id: string, data: unknown) => api.put(`/rules/${id}`, data),
  delete: (id: string) => api.delete(`/rules/${id}`),
  test: (data: unknown) => api.post('/rules/test', data),
  reapply: () => api.post('/rules/reapply'),
};

// ── Assets ───────────────────────────────────────────────────────────────────
export const assetsApi = {
  list: (params?: Record<string, unknown>) => api.get('/assets', { params }),
  upload: (formData: FormData) =>
    api.post('/assets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/assets/${id}`),
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  campaigns: (params?: Record<string, unknown>) => api.get('/analytics/campaigns', { params }),
  users: () => api.get('/analytics/users'),
};

// ── Sync ────────────────────────────────────────────────────────────────────
export const syncApi = {
  syncAll: () => api.post('/sync/all'),
  syncUser: (azureId: string) => api.post(`/sync/user/${azureId}`),
};
