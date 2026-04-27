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

// Uploads
router.post('/upload/poster', upload.single('file'), adminController.uploadPoster);
router.post('/upload/banner', upload.single('file'), adminController.uploadBanner);

// Scanner
router.get('/scanner/roots', adminController.getScannerRoots);
router.get('/scanner/drafts', asyncRoute(adminController.getScannerDrafts));
router.get('/scanner/logs', adminController.getScannerLogs);
router.get('/scanner/health', asyncRoute(adminController.getScannerHealth));
router.get('/scanner/jobs/current', adminController.getCurrentScannerJob);
router.post('/scanner/run', adminController.runScanner);
router.post('/scanner/stop', adminController.stopScanner);

// Database
router.get('/db/health', asyncRoute(adminController.getDbHealth));

// Media Normalizer
router.get('/media-normalizer/status', asyncRoute(adminController.getMediaNormalizerStatus));
router.post('/media-normalizer/start', asyncRoute(adminController.startMediaNormalizer));
router.post('/media-normalizer/stop', asyncRoute(adminController.stopMediaNormalizer));

// Duplicates
router.get('/duplicates/review', adminController.getDuplicatesReport);
router.post('/duplicates/cleanup', adminController.runDuplicatesCleanup);

// Metadata
router.post('/metadata/tmdb', asyncRoute(adminController.fetchTmdbMetadata));

module.exports = router;
