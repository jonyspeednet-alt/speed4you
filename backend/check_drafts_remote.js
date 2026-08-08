const { db } = require('./src/config/database');
const { ensureContentStore } = require('./src/data/store/base');

(async () => {
  try {
    await ensureContentStore();
    const result = await db.query("SELECT id, title, status, source_type, source_path, metadata_status, metadata_confidence, metadata_updated_at, duplicate_count FROM content_catalog WHERE status = 'draft' ORDER BY id");
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();