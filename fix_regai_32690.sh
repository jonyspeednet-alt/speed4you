#!/bin/bash
# Fix Series 32690 (Regai) - Wrong TMDB metadata at series level
# Current: TMDB 207555 (3-Day Dare*Devils - Japanese Documentary)  
# Correct: TMDB 306825 (Regai - Tamil Crime Thriller)
# Note: Episode data (stills, descriptions) is already correct

set -e

DB_NAME="${DB_NAME:-isp_entertainment}"
DB_USER="${DB_USER:-speed4you}"

echo "=== Fixing Series 32690 (Regai) - Series Level Metadata ==="
echo ""

psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 << 'EOSQL'
UPDATE content_catalog
SET payload = jsonb_set(payload, '{tmdbId}', '306825');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{description}', '"SI Vetri investigates a medical team that is trying to cover up deaths of clinical trial participants by staging them as accidents. Can Vetri put an end to this sinister plot before it is too late?"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{genre}', '"Crime, Mystery"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{genres}', '["Crime", "Mystery"]');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{tags}', '["Crime", "Mystery"]');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{category}', '"Crime"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{language}', '"Tamil"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{originalTitle}', '"Regai"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{parsedTitle}', '"Regai"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{poster}', '"https://image.tmdb.org/t/p/w500/c7qJEHPMhc2rrx5k7HRJs6jIGjE.jpg"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{backdrop}', '"https://image.tmdb.org/t/p/w1280/qYJWMyvuJBaRnPlBqQpHOeESqhK.jpg"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{metadataStatus}', '"matched"');

UPDATE content_catalog
SET payload = jsonb_set(payload, '{metadataProvider}', '"tmdb"');

-- Update flattened columns too
UPDATE content_catalog
SET title = 'Regai',
    language = 'Tamil',
    category = 'Crime'
WHERE id = 32690;

-- Verify
SELECT
  id,
  title,
  language,
  category,
  payload->>'tmdbId' AS tmdb_id,
  payload->>'originalTitle' AS orig_title,
  payload->>'genre' AS genre,
  LEFT(payload->>'description', 80) AS desc_preview,
  LEFT(payload->>'poster', 60) AS poster_url,
  LEFT(payload->>'backdrop', 60) AS backdrop_url,
  payload->>'metadataStatus' AS meta_status
FROM content_catalog
WHERE id = 32690;
EOSQL

echo ""
echo "=== Done! Series 32690 (Regai) fixed ==="
echo ""
echo "Changes made:"
echo "  TMDB ID:    207555 -> 306825"
echo "  Genre:      Documentary, Reality -> Crime, Mystery"
echo "  Language:   English -> Tamil"
echo "  Category:   Documentary -> Crime"
echo "  Poster:     Updated to correct Regai poster"
echo "  Backdrop:   Updated to correct Regai backdrop"
echo "  Description: Updated to correct Regai description"
echo ""
echo "Verify: curl -s https://speed4you.net/portal-api/api/series/32690 | node -e \"var d='';process.stdin.on('data',function(c){d+=c});process.stdin.on('end',function(){var j=JSON.parse(d);console.log('Title:',j.title);console.log('TMDB:',j.tmdbId);console.log('Genre:',j.genre);console.log('Lang:',j.language)})\""
