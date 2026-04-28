#!/usr/bin/env node

/**
 * Local GitHub Webhook Listener for Deployment
 * 
 * This script listens for GitHub push events and triggers local deployment
 * Perfect for local network servers that GitHub Actions cannot reach
 * 
 * Usage:
 *   node local-deploy-webhook.js
 * 
 * Setup:
 *   1. Add webhook to GitHub repository
 *   2. Payload URL: http://your-local-ip:3000/webhook
 *   3. Content type: application/json
 *   4. Events: Push events
 *   5. Secret: Set a secret and update WEBHOOK_SECRET below
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

// Configuration
const PORT = 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';
const DEPLOY_SCRIPT = path.join(__dirname, 'scripts', 'deploy.sh');
const SSH_HOST = '203.0.113.2';
const SSH_PORT = 2973;
const SSH_USER = 'speed4you';
const SSH_KEY = path.join(__dirname, 'deploy_key');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function verifyWebhookSignature(req, body) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        log('red', '❌ No signature provided');
        return false;
    }

    const hash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    const expected = `sha256=${hash}`;
    const valid = crypto.timingSafeEqual(signature, expected);

    if (!valid) {
        log('red', '❌ Invalid webhook signature');
    }

    return valid;
}

function deployToServer() {
    log('cyan', '🚀 Starting deployment to server...');

    const deployCommand = `
    set -e
    echo "📦 Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..

    echo "📦 Preparing deployment package..."
    node scripts/prepare-deploy.cjs

    echo "📤 Copying files to server..."
    scp -r -P ${SSH_PORT} \
      -i ${SSH_KEY} \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      server-deploy scripts/deploy.sh \
      ${SSH_USER}@${SSH_HOST}:/home/speed4you/staging-area/

    echo "🔧 Executing deployment on server..."
    ssh -p ${SSH_PORT} \
      -i ${SSH_KEY} \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      ${SSH_USER}@${SSH_HOST} << 'EOF'
    set -e
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    STAGING_BASE=/home/speed4you/portal-deploy-staging
    REMOTE_STAGING_AREA="/home/speed4you/staging-area"
    STAGING_ROOT="$STAGING_BASE/$TIMESTAMP"
    
    mkdir -p "$STAGING_ROOT"
    mv "$REMOTE_STAGING_AREA/server-deploy/dist" "$STAGING_ROOT/dist" 2>/dev/null || true
    mv "$REMOTE_STAGING_AREA/server-deploy/backend" "$STAGING_ROOT/backend" 2>/dev/null || true
    mv "$REMOTE_STAGING_AREA/deploy.sh" "$STAGING_ROOT/deploy.sh" 2>/dev/null || true
    
    rm -rf "$REMOTE_STAGING_AREA/server-deploy" 2>/dev/null || true
    chmod +x "$STAGING_ROOT/deploy.sh" 2>/dev/null || true
    
    echo "✅ Deployment completed!"
    echo "Directory: $STAGING_ROOT"
    ls -la "$STAGING_ROOT/"
    EOF

    echo "✅ Deployment successful!"
  `;

    exec(deployCommand, (error, stdout, stderr) => {
        if (error) {
            log('red', `❌ Deployment failed: ${error.message}`);
            log('red', stderr);
            return;
        }

        log('green', '✅ Deployment completed successfully!');
        log('green', stdout);
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    if (req.url !== '/webhook') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    let body = '';

    req.on('data', (chunk) => {
        body += chunk.toString();
    });

    req.on('end', () => {
        log('blue', '📨 Webhook received');

        // Verify signature
        if (!verifyWebhookSignature(req, body)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        try {
            const payload = JSON.parse(body);

            // Check if it's a push event
            if (req.headers['x-github-event'] !== 'push') {
                log('yellow', '⚠️  Not a push event, ignoring');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Event ignored' }));
                return;
            }

            // Check if it's to main branch
            if (payload.ref !== 'refs/heads/main') {
                log('yellow', `⚠️  Push to ${payload.ref}, not main branch`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Branch ignored' }));
                return;
            }

            log('green', `✅ Valid push to main branch`);
            log('cyan', `📝 Commit: ${payload.head_commit.id.substring(0, 7)}`);
            log('cyan', `👤 Author: ${payload.head_commit.author.name}`);
            log('cyan', `📄 Message: ${payload.head_commit.message}`);

            // Trigger deployment
            deployToServer();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Deployment triggered' }));
        } catch (error) {
            log('red', `❌ Error processing webhook: ${error.message}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid payload' }));
        }
    });
});

// Start server
server.listen(PORT, () => {
    log('green', `✅ Webhook listener started on port ${PORT}`);
    log('cyan', `📍 Webhook URL: http://your-local-ip:${PORT}/webhook`);
    log('yellow', `⚠️  Make sure to add this URL to GitHub repository settings`);
    log('yellow', `⚠️  Set webhook secret to: ${WEBHOOK_SECRET}`);
    log('blue', `\n🔄 Listening for GitHub push events on main branch...\n`);
});

// Handle errors
server.on('error', (error) => {
    log('red', `❌ Server error: ${error.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('yellow', '\n⏹️  Shutting down webhook listener...');
    server.close(() => {
        log('green', '✅ Webhook listener stopped');
        process.exit(0);
    });
});
