const { db } = require('./src/data/store/base');
const fs = require('fs');
const path = require('path');

(async () => {
  const rootsResult = await db.query('SELECT * FROM scanner_roots ORDER BY id');
  const roots = rootsResult.rows;
  
  console.log('=== Comprehensive Scanner Analysis ===\n');
  
  for (const root of roots) {
    console.log(`\n=== Root: ${root.id} (${root.label}) ===`);
    console.log(`Path: ${root.scan_path}`);
    console.log(`Type: ${root.type}`);
    
    const dbItems = await db.query(
      "SELECT id, title, payload FROM content_catalog WHERE source_root_id = $1 ORDER BY title",
      [root.id]
    );
    
    console.log(`Database items: ${dbItems.rows.length}`);
    
    if (fs.existsSync(root.scan_path)) {
      try {
        const entries = fs.readdirSync(root.scan_path);
        const totalEntries = entries.length;
        console.log(`Filesystem entries: ${totalEntries}`);
        
        if (root.type === 'series') {
          const folders = entries.filter(e => {
            const fullPath = path.join(root.scan_path, e);
            return fs.statSync(fullPath).isDirectory();
          });
          console.log(`Series folders: ${folders.length}`);
        }
        
        if (root.type === 'movie') {
          const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.webm'];
          const videos = entries.filter(e => 
            videoExtensions.some(ext => e.toLowerCase().endsWith(ext))
          );
          console.log(`Video files: ${videos.length}`);
        }
        
        if (dbItems.rows.length < totalEntries) {
          console.log(`\nSample filesystem entries not in DB:`);
          const dbTitles = new Set(dbItems.rows.map(item => {
            const title = item.title.toLowerCase();
            return title.replace(/[^a-z0-9]/g, '');
          }));
          
          entries.slice(0, 5).forEach(entry => {
            const normalized = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!Array.from(dbTitles).some(t => t.includes(normalized.substring(0, 10)))) {
              console.log(`- ${entry}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`Error reading filesystem: ${error.message}`);
      }
    } else {
      console.log('Path does not exist on filesystem');
    }
  }
  
  process.exit(0);
})();
