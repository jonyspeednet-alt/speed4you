const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const db = require('../src/config/database');
const { resolveUploadDirectory } = require('../src/utils/assetHelper');
const { ensureContentStore } = require('../src/data/store');

// Load environment variables
dotenv.config();

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('Error: sharp library is required to run this script. Please ensure sharp is installed in backend.', err.message);
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

async function run() {
  console.log('--- Image Optimization & WebP Migration Script ---');
  if (dryRun) {
    console.log('*** DRY RUN MODE: No files will be modified on disk or database ***\n');
  }

  const uploadDir = resolveUploadDirectory();
  console.log(`Resolved upload directory: ${uploadDir}`);

  if (!fs.existsSync(uploadDir)) {
    console.warn(`Warning: Upload directory does not exist or is inaccessible: ${uploadDir}`);
  }

  try {
    // Ensure content store tables are created
    await ensureContentStore();

    // If using in-memory pg-mem database, seed mock records/files for testing
    const { isInMemory } = require('../src/config/database');
    let mockFilesCreated = [];
    if (isInMemory) {
      console.log('[database] Running in-memory database: Seeding mock records for migration testing.');
      await db.query(`
        INSERT INTO content_catalog (id, payload, status)
        VALUES (
          999,
          '{"title": "Test Movie", "poster": "/portal/uploads/posters/test-poster.jpg", "backdrop": "/portal/uploads/backdrops/test-backdrop.png"}'::jsonb,
          'published'
        )
      `);
      
      const mockPosterPath = path.join(uploadDir, 'posters', 'test-poster.jpg');
      const mockBackdropPath = path.join(uploadDir, 'backdrops', 'test-backdrop.png');
      
      fs.mkdirSync(path.dirname(mockPosterPath), { recursive: true });
      fs.mkdirSync(path.dirname(mockBackdropPath), { recursive: true });
      
      // 1x1 pixel transparent GIF as baseline
      const mockImgBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      fs.writeFileSync(mockPosterPath, mockImgBuffer);
      fs.writeFileSync(mockBackdropPath, mockImgBuffer);
      
      mockFilesCreated.push(mockPosterPath, mockBackdropPath);
      console.log(`Created mock files on disk:\n  - ${mockPosterPath}\n  - ${mockBackdropPath}\n`);
    }

    const res = await db.query('SELECT id, payload FROM content_catalog');
    console.log(`Found ${res.rows.length} catalog items to analyze.`);

    let updatedCount = 0;
    let imagesOptimizedCount = 0;

    for (const row of res.rows) {
      const id = row.id;
      const payload = row.payload || {};
      let changed = false;

      // Fields to inspect
      const fields = ['poster', 'backdrop'];

      for (const field of fields) {
        const value = payload[field];
        if (typeof value === 'string' && value.startsWith('/portal/uploads/')) {
          // If it matches a non-webp extension
          const match = value.match(/\.(jpe?g|png)$/i);
          if (match) {
            const relativePath = value.replace('/portal/uploads/', '');
            const absolutePath = path.join(uploadDir, relativePath);

            if (fs.existsSync(absolutePath)) {
              const fileExt = match[1].toLowerCase();
              const newRelativePath = relativePath.replace(/\.(jpe?g|png)$/i, '.webp');
              const newAbsolutePath = absolutePath.replace(/\.(jpe?g|png)$/i, '.webp');
              const newValue = value.replace(/\.(jpe?g|png)$/i, '.webp');

              console.log(`Optimizing ${field} for content ID ${id}: ${relativePath} -> ${newRelativePath}`);

              if (!dryRun) {
                try {
                  const rawBuffer = fs.readFileSync(absolutePath);
                  let pipeline = sharp(rawBuffer);

                  // Determine resize target
                  if (field === 'poster') {
                    pipeline = pipeline.resize({ width: 400, fit: 'inside', withoutEnlargement: true });
                  } else if (field === 'backdrop') {
                    pipeline = pipeline.resize({ width: 1000, fit: 'inside', withoutEnlargement: true });
                  }

                  const optimizedBuffer = await pipeline.webp({ quality: 80 }).toBuffer();
                  
                  // Save optimized image
                  fs.writeFileSync(newAbsolutePath, optimizedBuffer);
                  
                  // Remove old file
                  try {
                    fs.unlinkSync(absolutePath);
                  } catch (delErr) {
                    console.warn(`Could not delete original file ${absolutePath}: ${delErr.message}`);
                  }

                  imagesOptimizedCount++;
                } catch (optErr) {
                  console.error(`Failed to optimize file ${absolutePath}: ${optErr.message}`);
                  continue; // Skip database field update since file processing failed
                }
              } else {
                imagesOptimizedCount++;
              }

              payload[field] = newValue;
              changed = true;
            } else {
              console.warn(`File does not exist on disk for content ID ${id} (${field}): ${absolutePath}`);
            }
          }
        }
      }

      if (changed) {
        updatedCount++;
        if (!dryRun) {
          await db.query('UPDATE content_catalog SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2', [payload, id]);
        }
      }
    }

    // Clean up mock files created during dry-run testing
    if (isInMemory && dryRun && mockFilesCreated.length) {
      console.log('\nCleaning up mock files created during dry-run...');
      for (const f of mockFilesCreated) {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch (e) {}
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Images optimized/converted: ${imagesOptimizedCount}`);
    console.log(`Database rows updated: ${updatedCount}`);
    console.log(dryRun ? 'Dry run finished successfully. No changes were saved.' : 'Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    await db.closePool();
  }
}

run();
