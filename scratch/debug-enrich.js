const path = require('path');
require('dotenv').config();
const db = require('./src/config/database');
const { enrichItemWithMetadata, cleanSearchTitle } = require('./src/services/scanner-enhanced-metadata');

async function debug() {
  const queryResult = await db.query(
    `SELECT id, payload FROM content_catalog
     WHERE status = 'published'
       AND payload->>'poster' NOT LIKE 'http%'
       AND payload->>'poster' NOT LIKE '/portal/uploads%'
     LIMIT 1`
  );

  if (queryResult.rows.length === 0) {
    console.log("No items with non-http / non-upload posters found.");
    process.exit(0);
  }

  const row = queryResult.rows[0];
  const item = row.payload;
  console.log("=== Database Item ===");
  console.log("ID:", row.id);
  console.log("Title:", item.title);
  console.log("Poster:", item.poster);
  console.log("Backdrop:", item.backdrop);
  console.log("Parsed Title:", cleanSearchTitle(item.title));

  console.log("\n=== Enrichment ===");
  try {
    const enriched = await enrichItemWithMetadata(item);
    console.log("Enriched Title:", enriched.title);
    console.log("Enriched Poster:", enriched.poster);
    console.log("Enriched Backdrop:", enriched.backdrop);
    console.log("Metadata Status:", enriched.metadataStatus);
    console.log("Metadata Provider:", enriched.metadataProvider);
    console.log("Confidence:", enriched.metadataConfidence);
    console.log("Error:", enriched.metadataError);
  } catch (err) {
    console.error("Enrichment Error:", err);
  }

  process.exit(0);
}

debug();
