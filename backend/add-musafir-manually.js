const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isp_entertainment',
  user: 'postgres',
  password: 'postgres',
});

async function addMusafirManually() {
  try {
    // Get next available ID
    const idResult = await pool.query('SELECT MAX(id) as max_id FROM content_catalog');
    const nextId = (idResult.rows[0].max_id || 0) + 1;
    
    const musafirData = {
      title: 'Musafir Cafe',
      type: 'series',
      year: 2026,
      description: 'Musafir Cafe - A series',
      poster: '',
      backdrop: '',
      source_type: 'manual',
      source_root_id: 'requested-series',
      seasons: [
        {
          seasonNumber: 1,
          episodeCount: 8,
          episodes: [
            { episodeNumber: 1, title: 'Episode 1', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E01.720p.mkv' },
            { episodeNumber: 2, title: 'Episode 2', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E02.720p.mkv' },
            { episodeNumber: 3, title: 'Episode 3', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E03.720p.mkv' },
            { episodeNumber: 4, title: 'Episode 4', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E04.720p.mkv' },
            { episodeNumber: 5, title: 'Episode 5', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E05.720p.mkv' },
            { episodeNumber: 6, title: 'Episode 6', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E06.720p.mkv' },
            { episodeNumber: 7, title: 'Episode 7', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E07.720p.mkv' },
            { episodeNumber: 8, title: 'Episode 8', videoUrl: '/Requested/Series/Musafir Cafe (2026)/S1/Musafir.Cafe.S01E08.720p.mkv' },
          ]
        }
      ]
    };

    const result = await pool.query(
      `INSERT INTO content_catalog (id, payload, content_type, status, source_type, source_root_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING id`,
      [nextId, JSON.stringify(musafirData), 'series', 'published', 'manual', 'requested-series']
    );

    console.log('Musafir Cafe added successfully with ID:', result.rows[0].id);
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
  process.exit(0);
}

addMusafirManually();
