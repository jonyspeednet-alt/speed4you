import apiClient from './apiClient';

const adminAccessKey = (import.meta.env.VITE_ADMIN_ACCESS_KEY || '').trim();

export const authService = {
  login: (username, password) => {
    const headers = {};
    if (adminAccessKey) {
      headers['X-Admin-Access'] = adminAccessKey;
    }
    return apiClient('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers,
    });
  },
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  verify: () => apiClient('/auth/verify', { method: 'POST' }),
  refresh: () => apiClient('/auth/refresh', { method: 'POST' }),
};

export default authService;
