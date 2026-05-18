import sys

file_path = "c:\\Users\\Speed Net IT\\Documents\\codex local ai test\\isp-entertainment-portal\\backend\\src\\data\\store.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

exports_block = """
module.exports = {
  addWatchlistEntry,
  appendMediaNormalizerLog,
  createItem,
  deleteItem,
  deleteItemsByScanSignatures,
  deleteScannerItemsNotInSignatures,
  ensureContentStore,
  ensureUser,
  findAdminByUsername,
  getAppState,
  getCatalogMeta,
  getDuplicateGroupsForItems,
  getItemById,
  getItemByScanSignature,
  getItemsByIds,
  getLibraryOrganization,
  getMediaNormalizerLog,
  getMediaNormalizerState,
  getRecentItems,
  getRecentSearches,
  getScannerRuns,
  getStats,
  getSuggestions,
  getWatchlistEntries,
  getWatchProgressEntries,
  listItems,
  loadScannerLog,
  loadScannerRoots,
  loadScannerRuntime,
  loadScannerState,
  markWatchProgressComplete,
  normalizeTitleKey,
  pruneCatalog,
  recordRecentSearch,
  recordScannerRun,
  refreshCatalogReferencesForNormalizedFile,
  removeWatchlistEntry,
  saveMediaNormalizerLog: appendMediaNormalizerLog,
  saveMediaNormalizerState,
  saveScannerLog,
  saveScannerRoots,
  saveScannerRuntime,
  saveScannerState,
  searchItems,
  setAppState,
  setCatalogMeta,
  touchAdminLogin,
  updateItem,
  upsertScannedItem,
  upsertWatchProgress,
  vacuumDatabase,
};
"""

if "module.exports =" not in content:
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(exports_block)
