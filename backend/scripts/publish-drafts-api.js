require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:4100/api/admin';
const AUTH = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD
};

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const auth = Buffer.from(`${AUTH.username}:${AUTH.password}`).toString('base64');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('=== GETTING ALL DRAFT ITEMS ===\n');

    // Get all content with draft status
    const allContent = await makeRequest('/content?status=draft&limit=1000');
    
    console.log(`Found ${allContent.items?.length || 0} draft items\n`);

    if (!allContent.items || allContent.items.length === 0) {
      console.log('No draft items found to process.');
      return;
    }

    let publishedCount = 0;
    let failedCount = 0;

    for (const item of allContent.items) {
      console.log(`\n--- Processing ID ${item.id}: ${item.title || 'No title'} ---`);
      
      try {
        // Check if has basic required info
        if (!item.title || item.title.trim() === '') {
          console.log(`  ⚠️  Skipping: No title`);
          continue;
        }

        // Publish the item
        const result = await makeRequest(`/content/${item.id}/publish`, {
          method: 'POST'
        });

        console.log(`  ✅ Published: ${item.title}`);
        publishedCount++;

      } catch (error) {
        console.error(`  ❌ Failed to publish ID ${item.id}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total drafts processed: ${allContent.items.length}`);
    console.log(`Successfully published: ${publishedCount}`);
    console.log(`Failed: ${failedCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();