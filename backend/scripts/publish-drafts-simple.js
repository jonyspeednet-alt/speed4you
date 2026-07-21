require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Simple script to publish drafts using the admin API
// This requires the production server to be running

const API_BASE = `http://${process.env.DEPLOY_HOST || 'localhost'}:${process.env.PORT || 4100}/api/admin`;
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY;

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Admin-Access-Key': ADMIN_ACCESS_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('=== CONNECTING TO PRODUCTION API ===');
    console.log(`API Base: ${API_BASE}`);
    console.log(`Admin Access Key: ${ADMIN_ACCESS_KEY ? 'Set' : 'Not set'}\n`);

    // First, try to get dashboard stats to verify connection
    console.log('Testing connection...');
    const dashboard = await makeRequest('/dashboard');
    console.log('✅ Connected to production API\n');

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

        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

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
    console.error('Fatal error:', error.message);
    console.error('\nMake sure the production server is running and accessible.');
    console.error('You may need to deploy to the production server first.');
    process.exit(1);
  }
}

main();