import apiClient from './apiClient';

export const authService = {
  login: (username, ***REMOVED***) => apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, ***REMOVED*** }),
  }),
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  verify: () => apiClient('/auth/verify', { method: 'POST' }),
  refresh: () => apiClient('/auth/refresh', { method: 'POST' }),
};

export default authService;
