import apiClient from './apiClient';

function cachedGet(path, params = {}) {
  return apiClient(`${path}?${new URLSearchParams(params)}`);
}

function clearAdminCache() {
  // Now handled globally by React Query (queryClient.invalidateQueries)
}

export const adminService = {
  getDashboard: () => cachedGet('/admin/dashboard'),
  getStats: () => cachedGet('/admin/stats'),
  getSearchAnalytics: () => cachedGet('/admin/search-analytics'),
  getScannerRoots: () => cachedGet('/admin/scanner/roots'),
  getScannerHealth: () => cachedGet('/admin/scanner/health'),
  getScannerLogs: (limit = 10) => cachedGet('/admin/scanner/logs', { limit }),
  getCurrentScannerJob: () => apiClient('/admin/scanner/jobs/current'),
  runScanner: (rootIds = []) => apiClient('/admin/scanner/run', {
    method: 'POST',
    body: JSON.stringify({ rootIds }),
  }).finally(clearAdminCache),
  stopScanner: () => apiClient('/admin/scanner/stop', { method: 'POST' }).finally(clearAdminCache),
  clearScannerMetadataCache: () => apiClient('/admin/scanner/cache/clear', { method: 'POST' }).finally(clearAdminCache),

  getDuplicateReview: () => cachedGet('/admin/duplicates/review'),
  getCatalogDuplicates: (params = {}) => cachedGet('/admin/duplicates/catalog', params),
  checkDuplicateTitle: (params = {}) => cachedGet('/admin/duplicates/check', params),
  runDuplicateCleanup: (body = {}) => apiClient('/admin/duplicates/cleanup', {
    method: 'POST',
    body: JSON.stringify(body),
  }).finally(clearAdminCache),
  mergeCatalogDuplicates: (keepId, removeIds) => apiClient('/admin/duplicates/merge', {
    method: 'POST',
    body: JSON.stringify({ keepId, removeIds }),
  }).finally(clearAdminCache),
  pruneCatalog: () => apiClient('/admin/maintenance/prune', { method: 'POST' }).finally(clearAdminCache),
  runVacuum: () => apiClient('/admin/maintenance/vacuum', { method: 'POST' }).finally(clearAdminCache),
  recalculateDuplicateCounts: () => apiClient('/admin/maintenance/recalculate-duplicates', { method: 'POST' }).finally(clearAdminCache),
  cleanupOrphanedRoots: () => apiClient('/admin/maintenance/cleanup-orphan-roots', { method: 'POST' }).finally(clearAdminCache),
  getScannerDrafts: (status = 'draft') => cachedGet('/admin/scanner/drafts', { status }),

  // Content management
  getContent: (params = {}) => cachedGet('/admin/content', { ...params, summary: 'true' }),
  getContentOrganization: (params = {}) => cachedGet('/admin/content/organization', params),
  getContentById: (id) => apiClient(`/admin/content/${id}`),
  createContent: (data) => apiClient('/admin/content', {
    method: 'POST',
    body: JSON.stringify(data),
  }).finally(clearAdminCache),
  updateContent: (id, data) => apiClient(`/admin/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).finally(clearAdminCache),
  bulkUpdateContent: (ids, changes) => apiClient('/admin/content/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ ids, changes }),
  }).finally(clearAdminCache),
  deleteContent: (id) => apiClient(`/admin/content/${id}`, { method: 'DELETE' }).finally(clearAdminCache),
  publishContent: (id) => apiClient(`/admin/content/${id}/publish`, { method: 'POST' }).finally(clearAdminCache),
  unpublishContent: (id) => apiClient(`/admin/content/${id}/unpublish`, { method: 'POST' }).finally(clearAdminCache),
  
  // Movies
  getMovies: (params = {}) => cachedGet('/admin/movies', { ...params, summary: 'true' }),
  
  // Series
  getSeries: (params = {}) => cachedGet('/admin/series', { ...params, summary: 'true' }),
  getDbHealth: () => cachedGet('/admin/db/health'),
  
  // Media uploads
  uploadPoster: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient('/admin/upload/poster', {
      method: 'POST',
      body: formData,
    });
  },
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient('/admin/upload/banner', {
      method: 'POST',
      body: formData,
    });
  },
  importTmdbMetadata: (tmdbId, type = 'movie') => apiClient('/admin/metadata/tmdb', {
    method: 'POST',
    body: JSON.stringify({ tmdbId, type }),
  }).finally(clearAdminCache),

  listAdminUsers: () => apiClient('/admin/users'),
  createAdminUser: (data) => apiClient('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id, data) => apiClient(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminUser: (id) => apiClient(`/admin/users/${id}`, { method: 'DELETE' }),

  // Series cleanup — remove episode-level entries incorrectly indexed as standalone series
  cleanupOrphanSeriesEpisodes: () => apiClient('/admin/series/cleanup-episodes', { method: 'POST' }),

  // Fix misconfigured scanner roots (movie roots set as type 'series')
  fixMisconfiguredRoots: (dry = true) => apiClient(`/admin/maintenance/fix-roots?dry=${dry}`, { method: 'POST' }),
};

export default adminService;
