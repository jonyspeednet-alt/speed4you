UPDATE content_catalog SET 
  payload = jsonb_set(
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
                      '{tmdbId}', '1017619'
                    ),
                    '{imdbId}', 'tt23304816'
                  ),
                  '{title}', '13:14: The Challenge of Helping'
                ),
                '{originalTitle}', '13:14: El Reto de Ayudar'
              ),
              '{description}', 'On September 19, 2017, at 1:14 p.m., an earthquake devastated Mexico City and its environs. Immediately, citizens mobilized to help, including the actor and youtuber Juanpa Zurita who quickly organized a group of friends that included singers, actors, content creators and other celebrities from the world of entertainment who helped him raise funds for the reconstruction of the city.'
            ),
            '{poster}', 'https://image.tmdb.org/t/p/w500/5dwR8Qj1uKXYfJAekOfctuiJzAz.jpg'
          ),
          '{backdrop}', 'https://image.tmdb.org/t/p/w1280/aSUpscro9lZB0uYC4S3NxuZDZKn.jpg'
        ),
        '{genres}', '["Documentary","Drama","TV Movie"]'::jsonb
      ),
      '{genre}', 'Documentary, Drama, TV Movie'
    ),
    '{status}', 'published'
  ),
  metadata_status = 'matched',
  metadata_confidence = 100,
  published_at = NOW()
WHERE id = 33957;
