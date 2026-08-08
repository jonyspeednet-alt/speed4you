const { db } = require('./src/config/database');
const { ensureContentStore } = require('./src/data/store/base');
const { fetchMetadataByTmdbId, fetchMetadataByImdbId } = require('./src/services/metadata-enricher');

(async () => {
  try {
    await ensureContentStore();
    
    // Get all draft items with not_found metadata status
    const result = await db.query(
      "SELECT id, title, payload FROM content_catalog WHERE status = 'draft' AND metadata_status = 'not_found' LIMIT 10"
    );
    
    console.log(`Found ${result.rows.length} draft items to enrich`);
    
    for (const row of result.rows) {
      const item = row.payload;
      console.log(`Processing: ${item.title} (ID: ${row.id})`);
      
      // Try to fetch metadata using TMDB
      try {
        const metadata = await fetchMetadataByTmdbId(item.title, item.year, item.type);
        if (metadata) {
          console.log(`✓ Found metadata for ${item.title}`);
          // Update the item with new metadata
          item.poster = metadata.poster || item.poster;
          item.backdrop = metadata.backdrop || item.backdrop;
          item.description = metadata.overview || item.description;
          item.metadataStatus = 'matched';
          item.metadataConfidence = metadata.confidence || 50;
          item.metadataUpdatedAt = new Date().toISOString();
          
          // Update database
          await db.query(
            "UPDATE content_catalog SET payload = $1::jsonb, metadata_status = 'matched', metadata_confidence = $2 WHERE id = $3",
            [JSON.stringify(item), item.metadataConfidence, row.id]
          );
        } else {
          console.log(`✗ No metadata found for ${item.title}`);
        }
      } catch (error) {
        console.error(`Error processing ${item.title}:`, error.message);
      }
    }
    
    console.log('Metadata enrichment complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();