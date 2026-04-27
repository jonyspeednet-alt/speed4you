import sys

file_path = "c:\\Users\\Speed Net IT\\Documents\\codex local ai test\\isp-entertainment-portal\\backend\\src\\routes\\admin.js"

content = """const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../config/database');
const requireAdminAuth = require('../middleware/require-admin-auth');
const {
  createItem,
  deleteItem,
  getItemById,
  getRecentItems,
  getScannerRuns,
  getStats,
  getLibraryOrganization,
  listItems,
  loadScannerRoots,
  pruneCatalog,
  updateItem,
  vacuumDatabase,
} = require('../data/store');
const { getCurrentScanJob, getScannerHealth, startScanJob, stopScanJob } = require('../services/scanner');
const { fetchMetadataByTmdbId } = require('../services/metadata-enricher');
const {
  getMediaNormalizerStatus,
  startMediaNormalizer,
  stopMediaNormalizer,
} = require('../services/media-normalizer');
const {
  getDuplicateReviewReport,
  runDuplicateCleanup,
} = require('../services/duplicate-review');
const { AppError } = require('../utils/error');

const router = express.Router();
"""

with open(file_path, "r", encoding="utf-8") as f:
    old_content = f.read()

# find router.use(requireAdminAuth);
idx = old_content.find("router.use(requireAdminAuth);")
if idx != -1:
    new_content = content + old_content[idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

# Add router.post('/maintenance/vacuum', asyncRoute(async (req, res) => { res.json(await vacuumDatabase()); }));
with open(file_path, "r", encoding="utf-8") as f:
    c2 = f.read()
    
if "router.post('/maintenance/vacuum'" not in c2:
    c2 = c2.replace(
        "router.post('/maintenance/prune', asyncRoute(async (req, res) => {\n  res.json(await pruneCatalog());\n}));",
        "router.post('/maintenance/prune', asyncRoute(async (req, res) => {\n  res.json(await pruneCatalog());\n}));\n\nrouter.post('/maintenance/vacuum', asyncRoute(async (req, res) => {\n  res.json(await vacuumDatabase());\n}));"
    )
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(c2)
