const query = `
      SELECT payload,
             (ts_rank(search_vector, plainto_tsquery('english', 'spider')) * 10 + 
              similarity(title, 'spider') * 5) as db_score
      FROM content_catalog 
      WHERE status = 'published'
        AND ((search_vector @@ plainto_tsquery('english', 'spider')) OR (title % 'spider') OR (payload->>'originalTitle' % 'spider'))
      ORDER BY db_score DESC 
      LIMIT 1
    `;

console.log('Query length:', query.length);
console.log('Character at 329:', JSON.stringify(query.substring(320, 340)));
console.log('Index 329:', query[329]);
console.log('Context:', query.substring(300, 360));
