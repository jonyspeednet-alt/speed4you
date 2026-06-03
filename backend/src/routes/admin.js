const express = require('express');
const multer = require('multer');
const requireAdminAuth = require('../middleware/require-admin-auth');
const adminController = require('../controllers/adminController');
const { MAX_UPLOAD_BYTES } = require('../utils/assetHelper');

const router = express.Router();
router.use(requireAdminAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const validate = require('../middleware/validate');
const { contentSchema, bulkUpdateSchema } = require('../utils/validation-schemas');

// Dashboard & Stats
router.get('/dashboard', asyncRoute(adminController.getDashboard));
router.get('/stats', asyncRoute(adminController.getStats));
router.get('/search-analytics', asyncRoute(adminController.getSearchAnalytics));

// Content Management
router.get('/content', asyncRoute(adminController.getContentList));
router.get('/content/organization', asyncRoute(adminController.getLibraryOrganization));
router.get('/content/:id', asyncRoute(adminController.getContentById));

router.post('/content', 
  validate({ body: contentSchema }), 
  asyncRoute(adminController.createContent)
);

router.put('/content/:id', 
  validate({ body: contentSchema.fork(Object.keys(contentSchema.describe().keys), (schema) => schema.optional()) }), 
  asyncRoute(adminController.updateContent)
);

router.post('/content/bulk-update', 
  validate({ body: bulkUpdateSchema }), 
  asyncRoute(adminController.bulkUpdateContent)
);
router.delete('/content/:id', asyncRoute(adminController.deleteContent));
router.post('/content/:id/publish', asyncRoute(adminController.publishContent));
router.post('/content/:id/unpublish', asyncRoute(adminController.unpublishContent));

// Specialized Listings (Movies/Series)
router.get('/movies', asyncRoute(adminController.getMovies));
router.get('/series', asyncRoute(adminController.getSeries));

// Maintenance
router.post('/maintenance/prune', asyncRoute(adminController.pruneCatalog));
router.post('/maintenance/vacuum', asyncRoute(adminController.vacuumDatabase));
router.post('/maintenance/fix-roots', asyncRoute(adminController.fixMisconfiguredRoots));
router.post('/maintenance/recalculate-duplicates', asyncRoute(adminController.recalculateDuplicateCounts));
router.post('/maintenance/cleanup-orphan-roots', asyncRoute(adminController.cleanupOrphanedScannerRoots));

// Uploads
router.post('/upload/poster', upload.single('file'), asyncRoute(adminController.uploadPoster));
router.post('/upload/banner', upload.single('file'), asyncRoute(adminController.uploadBanner));

// Scanner
router.get('/scanner/roots', adminController.getScannerRoots);
router.delete('/scanner/roots/:id', asyncRoute(adminController.deleteScannerRoot));
router.post('/scanner/roots/cleanup', asyncRoute(adminController.cleanupStaleScannerRoots));
router.get('/scanner/drafts', asyncRoute(adminController.getScannerDrafts));
router.get('/scanner/logs', adminController.getScannerLogs);
router.get('/scanner/health', asyncRoute(adminController.getScannerHealth));
router.post('/scanner/cache/clear', asyncRoute(adminController.clearScannerMetadataCache));
router.get('/scanner/jobs/current', adminController.getCurrentScannerJob);
router.post('/scanner/run', adminController.runScanner);
router.post('/scanner/stop', adminController.stopScanner);

// Database
router.get('/db/health', asyncRoute(adminController.getDbHealth));

// User Management
router.get('/users', asyncRoute(adminController.listAdminUsers));
router.post('/users', asyncRoute(adminController.createAdminUser));
router.put('/users/:id', asyncRoute(adminController.updateAdminUser));
router.delete('/users/:id', asyncRoute(adminController.deleteAdminUser));

// Duplicates
router.get('/duplicates/review', adminController.getDuplicatesReport);
router.get('/duplicates/catalog', asyncRoute(adminController.getCatalogDuplicates));
router.get('/duplicates/check', asyncRoute(adminController.checkDuplicateTitle));
router.post('/duplicates/cleanup', asyncRoute(adminController.runDuplicatesCleanup));
router.post('/duplicates/merge', asyncRoute(adminController.mergeCatalogDuplicates));

// Series cleanup — remove episode-level entries incorrectly indexed as standalone series
router.post('/series/cleanup-episodes', asyncRoute(adminController.cleanupOrphanSeriesEpisodes));

// Metadata
router.post('/metadata/tmdb', asyncRoute(adminController.fetchTmdbMetadata));
router.post('/metadata/rematch', asyncRoute(adminController.rematchMetadata));
router.post('/metadata/cleanup-season-duplicates', asyncRoute(adminController.cleanupSeasonDuplicates));

module.exports = router;
