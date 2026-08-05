-- Fix Series 32690 (Regai) - Wrong TMDB metadata
-- Current: TMDB 207555 (3-Day Dare*Devils - Japanese Documentary)
-- Correct: TMDB 306825 (Regai - Tamil Crime Thriller)

UPDATE content_catalog
SET payload = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(
                        payload,
                        '{tmdbId}', '306825'
                      ),
                      '{title}', '"Regai"'
                    ),
                    '{parsedTitle}', '"Regai"'
                  ),
                  '{originalTitle}', '"Regai"'
                ),
                '{description}', '"SI Vetri investigates a medical team that is trying to cover up deaths of clinical trial participants by staging them as accidents. Can Vetri put an end to this sinister plot before it is too late?"'
              ),
              '{genre}', '"Crime, Mystery"'
            ),
            '{genres}', '["Crime", "Mystery"]'
          ),
          '{tags}', '["Crime", "Mystery"]'
        ),
        '{category}', '"Crime"'
      ),
      '{language}', '"Tamil"'
    ),
    '{poster}', '"https://image.tmdb.org/t/p/w500/c7qJEHPMhc2rrx5k7HRJs6jIGjE.jpg"'
  ),
  '{backdrop}', '"https://image.tmdb.org/t/p/w1280/qYJWMyvuJBaRnPlBqQpHOeESqhK.jpg"'
),
-- Also update the flattened columns
title = 'Regai',
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
  LEFT(payload->>'poster', 60) AS poster,
  LEFT(payload->>'backdrop', 60) AS backdrop
FROM content_catalog
WHERE id = 32690;
