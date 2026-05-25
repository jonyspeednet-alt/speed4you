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
  getMediaNormalizerStatus: () => apiClient('/admin/media-normalizer/status'),
  startMediaNormalizer: () => apiClient('/admin/media-normalizer/start', { method: 'POST' }).finally(clearAdminCache),
  stopMediaNormalizer: () => apiClient('/admin/media-normalizer/stop', { method: 'POST' }).finally(clearAdminCache),
  retryMediaNormalizerFile: (filePath) => apiClient('/admin/media-normalizer/retry', {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  }).finally(clearAdminCache),
  getDuplicateReview: () => cachedGet('/admin/duplicates/review'),
  runDuplicateCleanup: () => apiClient('/admin/duplicates/cleanup', { method: 'POST' }).finally(clearAdminCache),
  pruneCatalog: () => apiClient('/admin/maintenance/prune', { method: 'POST' }).finally(clearAdminCache),
  runVacuum: () => apiClient('/admin/maintenance/vacuum', { method: 'POST' }).finally(clearAdminCache),
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
  getNormalizerConfig: () => apiClient('/admin/media-normalizer/config'),
  setNormalizerConfig: (config) => apiClient('/admin/media-normalizer/config', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  pauseMediaNormalizer: () => apiClient('/admin/media-normalizer/pause', { method: 'POST' }),
  resumeMediaNormalizer: () => apiClient('/admin/media-normalizer/resume', { method: 'POST' }),
  retryAllFailedFiles: () => apiClient('/admin/media-normalizer/retry-all', { method: 'POST' }),
  listAdminUsers: () => apiClient('/admin/users'),
  createAdminUser: (data) => apiClient('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id, data) => apiClient(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminUser: (id) => apiClient(`/admin/users/${id}`, { method: 'DELETE' }),

  // Pipeline Queue
  getPipelineStatus: () => apiClient('/admin/pipeline/status'),
  getPipelineScannerQueue: (limit) => cachedGet('/admin/pipeline/scanner-queue', { limit }),
  getPipelineNormalizerQueue: (limit) => cachedGet('/admin/pipeline/normalizer-queue', { limit }),
  getPipelineLog: (limit) => cachedGet('/admin/pipeline/log', { limit }),
  startPipeline: () => apiClient('/admin/pipeline/start', { method: 'POST' }),
  clearPipeline: () => apiClient('/admin/pipeline/clear', { method: 'POST' }),
  retryPipelineScannerItem: (id) => apiClient(`/admin/pipeline/retry-scanner/${id}`, { method: 'POST' }),
  retryPipelineNormalizerItem: (id) => apiClient(`/admin/pipeline/retry-normalizer/${id}`, { method: 'POST' }),
  retryAllPipelineFailed: () => apiClient('/admin/pipeline/retry-all-failed', { method: 'POST' }),
  startScanner: () => apiClient('/admin/pipeline/scanner/start', { method: 'POST' }),
  stopScanner: () => apiClient('/admin/pipeline/scanner/stop', { method: 'POST' }),
  startNormalizer: () => apiClient('/admin/pipeline/normalizer/start', { method: 'POST' }),
  stopNormalizer: () => apiClient('/admin/pipeline/normalizer/stop', { method: 'POST' }),
};

export default adminService;
