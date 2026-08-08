UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            payload,
            '{imdbId}', '"tt16292538"'::jsonb
          ),
          '{poster}', '"https://image.tmdb.org/t/p/w500/5dwR8Qj1uKXYfJAekOfctuiJzAz.jpg"'::jsonb
        ),
        '{backdrop}', '"https://image.tmdb.org/t/p/w1280/aSUpscro9lZB0uYC4S3NxuZDZKn.jpg"'::jsonb
      ),
      '{description}', '"On September 19, 2017, at 1:14 p.m., an earthquake devastated Mexico City and its environs. Immediately, citizens mobilized to help, including the actor and youtuber Juanpa Zurita who quickly organized a group of friends that included singers, actors, content creators and other celebrities from the world of entertainment who helped him raise funds for the reconstruction of the city."'::jsonb
      ),
    '{originalTitle}', '"13:14: El Reto de Ayudar"'::jsonb
  ),
  metadata_status = 'matched',
  status = 'published',
  published_at = NOW()
WHERE id = 33957;
