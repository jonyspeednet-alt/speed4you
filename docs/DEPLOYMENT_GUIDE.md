# Speed4You ISP Entertainment Portal — Deployment Guide

> **Consolidated document** — replaces the following legacy files, which can be deleted after this guide is verified:
> `DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_READY.md`, `DEPLOYMENT_STATUS.md`, `DEPLOYMENT_VERIFICATION.md`, `DEPLOYMENT_IMPROVEMENTS.md`, `DEPLOYMENT_TEST_REPORT.md`, `DEPLOYMENT_TEST.md`, `FINAL_DEPLOYMENT_SETUP.md`, `LOCAL_DEPLOYMENT_SETUP.md`, `LOCAL_NETWORK_DEPLOYMENT_GUIDE.md`, `GITHUB_SECRETS_SETUP.md`, `SSH_KEY_FIX_GUIDE.md`, `TODO_NEXT.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [GitHub Secrets Setup](#3-github-***REMOVED***s-setup)
4. [SSH Key Setup](#4-ssh-key-setup)
5. [Server Setup](#5-server-setup)
6. [Deployment Methods](#6-deployment-methods)
7. [Environment Configuration](#7-environment-configuration)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Troubleshooting](#9-troubleshooting)
10. [Maintenance](#10-maintenance)

---

## 1. Overview

The Speed4You ISP Entertainment Portal is a full-stack web application that delivers a Netflix-like streaming experience to subscribers on the ISP's local network. The system comprises a React frontend served as static files, an Express.js backend API, a PostgreSQL database, and FFmpeg-based media transcoding capabilities. The deployment architecture is designed for an ISP-controlled server environment where the application is accessed exclusively over the provider's local network, with an optional public-facing domain for external access.

The frontend is built with Vite and React, producing an optimized static bundle that the backend Express server serves from the `frontend/dist` directory. In production, the Vite base path is set to `/portal/`, meaning all static assets are served under this prefix. The API is mounted at three route prefixes for maximum compatibility: `/api` (legacy and direct access), `/portal-api/api` (configured as the Vite proxy target during development), and `/` (for nginx reverse-proxy setups where the API is served from the root path). The backend enforces Helmet Content Security Policy headers, HSTS, and CORS allowlisting in production. Rate limiting is applied globally: 5,000 requests per 15-minute window for general API routes and 20,000 requests per minute for read-only public content endpoints.

Deployments are automated via GitHub Actions. On every push to the `main` branch, the workflow checks out the code, installs dependencies, builds the frontend, uploads the built assets and backend code to the server via SCP, and restarts the backend service via SSH. The system also supports manual deployment and a webhook-based local deployment path for servers that reside on private networks unreachable by GitHub Actions runners. This guide covers every deployment scenario, the complete server setup process, environment variable configuration, post-deployment verification steps, and common troubleshooting scenarios.

---

## 2. Prerequisites

Before beginning deployment, ensure that the following prerequisites are met. Each item is required for the automated or manual deployment pipeline to function correctly. Missing any of these will result in deployment failures or runtime errors in production.

### Infrastructure Requirements

| Requirement | Details |
|---|---|
| **Server** | A Linux server (Ubuntu 20.04+ or similar) accessible via SSH. The server must have sufficient disk space for media files and the player cache. |
| **Node.js** | Version 20 or later installed on the server. The GitHub Actions workflow uses Node.js 20. Use the same version locally to avoid compatibility issues. |
| **PostgreSQL** | Version 13 or later running on the same server (or accessible from it). The database must be created and the connection credentials configured before the backend starts. |
| **FFmpeg** | Both `ffmpeg` and `ffprobe` must be installed on the server for media transcoding and the player cache system. Install via the system package manager (e.g., `sudo apt install ffmpeg`). |
| **Nginx** | A reverse proxy (nginx recommended) configured to forward requests to the backend Express server and serve the frontend static files. |

### Local Development Requirements

| Requirement | Details |
|---|---|
| **Git** | For cloning the repository and pushing changes that trigger deployments. |
| **Node.js 20+** | For running local development servers and build scripts. |
| **npm** | Comes with Node.js. Used for installing dependencies and running scripts. |

### Access Requirements

- **SSH access** to the deployment server with key-based authentication configured.
- **GitHub repository** admin or maintainer access to configure repository ***REMOVED***s and webhooks.
- **Sudo privileges** on the server (needed for service restarts and directory creation).

### Quick Local Development

For local development without any deployment setup:

```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd speed4you

# Install all dependencies (frontend + backend)
npm run install:all

# Start development mode (frontend dev server + backend)
npm run dev
```

The development mode starts the Vite dev server on port 4173 with hot module replacement, and proxies `/portal-api` requests to the backend running on port 3001. The backend falls back to an in-memory `pg-mem` database if PostgreSQL is not available locally, making it possible to develop without a local database instance.

For a local production build test:

```bash
npm run build          # Builds frontend to frontend/dist
npm run start          # Starts backend which serves frontend/dist
```

---

## 3. GitHub Secrets Setup

GitHub Secrets store sensitive deployment credentials that the GitHub Actions workflow references at runtime. Secrets are never exposed in logs and are only available to workflows running on the repository. All ***REMOVED***s must be configured before the first deployment attempt; missing any required ***REMOVED*** will cause the workflow to fail.

### Adding Secrets via GitHub Web UI

1. Navigate to your GitHub repository.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository ***REMOVED*****.
4. Enter the ***REMOVED*** name exactly as listed below (case-sensitive).
5. Paste the ***REMOVED*** value and click **Add ***REMOVED*****.

### Adding Secrets via GitHub CLI

If you have the [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated, you can add ***REMOVED***s from the terminal:

```bash
gh ***REMOVED*** set DEPLOY_HOST -b "<YOUR_SERVER_IP>"
gh ***REMOVED*** set DEPLOY_PORT -b "<YOUR_SSH_PORT>"
gh ***REMOVED*** set DEPLOY_USER -b "<YOUR_SSH_USERNAME>"
gh ***REMOVED*** set DEPLOY_SSH_KEY < <PATH_TO_YOUR_PRIVATE_KEY>
gh ***REMOVED*** set JWT_SECRET -b "<YOUR_JWT_SECRET>"
gh ***REMOVED*** set TMDB_API_KEY -b "<YOUR_TMDB_API_KEY>"
gh ***REMOVED*** set DEPLOY_SUDO_PASSWORD -b "<YOUR_SUDO_PASSWORD>"
gh ***REMOVED*** set DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS -b "<YOUR_PRODUCTION_CORS_ORIGIN>"
gh ***REMOVED*** set DEPLOY_REMOTE_PLAYER_CACHE_ROOT -b "<YOUR_PLAYER_CACHE_PATH>"
gh ***REMOVED*** set DEPLOY_ENV_FILE_CONTENT -b "<YOUR_ENV_FILE_CONTENT>"
```

### Required Secrets Reference

| Secret Name | Description | Example Value |
|---|---|---|
| `DEPLOY_HOST` | Server hostname or IP address | `<YOUR_SERVER_IP>` |
| `DEPLOY_PORT` | SSH port for the server | `<YOUR_SSH_PORT>` |
| `DEPLOY_USER` | SSH username for deployment | `<YOUR_SSH_USERNAME>` |
| `DEPLOY_SSH_KEY` | SSH private key for authentication (entire contents of the private key file, including BEGIN/END lines) | `<YOUR_SSH_PRIVATE_KEY>` |
| `JWT_SECRET` | Secret key used for signing JWT tokens. Must be at least 32 characters in production. | `<YOUR_JWT_SECRET>` |
| `TMDB_API_KEY` | The Movie Database (TMDb) API key for metadata enrichment | `<YOUR_TMDB_API_KEY>` |
| `DEPLOY_SUDO_PASSWORD` | Sudo ***REMOVED*** for the SSH user (required for service restarts) | `<YOUR_SUDO_PASSWORD>` |
| `DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins in production | `https://<YOUR_DOMAIN>` |
| `DEPLOY_REMOTE_PLAYER_CACHE_ROOT` | Absolute path on the server for the FFmpeg player cache directory | `<YOUR_PLAYER_CACHE_PATH>` |
| `DEPLOY_ENV_FILE_CONTENT` | The complete content of the backend `.env` file. This is written verbatim to the server during deployment. | See Section 7 for the full template |

### Security Best Practices for Secrets

- **Never commit ***REMOVED***s** to the repository, even in `.env.example` files. Use placeholder values in example files.
- **Rotate ***REMOVED***s periodically**, especially after any team member with access leaves the project.
- **Use a strong JWT ***REMOVED***** — the application enforces a minimum of 32 characters in production and rejects known weak values such as `***REMOVED***` or `***REMOVED***`.
- **Limit repository access** — only grant write access to trusted collaborators who need to trigger deployments.
- **Audit ***REMOVED*** usage** — periodically review which ***REMOVED***s are defined and remove any that are no longer needed.

---

## 4. SSH Key Setup

SSH key-based authentication is the backbone of the automated deployment pipeline. The GitHub Actions workflow and the local webhook listener both rely on SSH keys to connect to the server without interactive ***REMOVED*** prompts. This section covers generating a new key pair, installing the public key on the server, adding the private key to GitHub Secrets, and verifying the connection end-to-end.

### Step 1: Generate an Ed25519 Key Pair

Ed25519 is the recommended key type for modern SSH deployments. It provides stronger security with shorter keys compared to RSA and is supported by all current OpenSSH versions. **Generate the key without a passphrase**, because automated CI/CD processes cannot provide interactive ***REMOVED*** input.

```bash
# Generate a new ed25519 key pair without a passphrase
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy@speed4you"
```

This creates two files in your current directory:
- `deploy_key` — the private key (keep this secure and never commit it to the repository)
- `deploy_key.pub` — the public key (this will be added to the server)

**Important:** If you already have an existing key that is passphrase-protected, you must either remove the passphrase or generate a new key. A passphrase-protected key will block automated deployments because neither GitHub Actions nor the webhook listener can provide the passphrase interactively. To remove a passphrase from an existing key:

```bash
ssh-keygen -p -f deploy_key -N "" -P "<CURRENT_PASSPHRASE>"
```

### Step 2: Add the Public Key to the Server

Connect to your server via any method (e.g., PuTTY, existing SSH session) and add the public key to the `authorized_keys` file:

```bash
# On the server:
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Append the public key (paste the contents of deploy_key.pub)
cat >> ~/.ssh/authorized_keys << 'EOF'
<PASTE_YOUR_PUBLIC_KEY_CONTENT_HERE>
EOF

chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Add the Private Key to GitHub Secrets

Copy the entire contents of the `deploy_key` file (including the `***REMOVED***` and `-----END OPENSSH PRIVATE KEY-----` lines) and add it as the `DEPLOY_SSH_KEY` ***REMOVED*** in your GitHub repository settings. See [Section 3](#3-github-***REMOVED***s-setup) for detailed instructions on adding ***REMOVED***s.

### Step 4: Test the SSH Connection

From your local machine, verify that the key works without prompting for a ***REMOVED***:

```bash
ssh -i deploy_key -p <YOUR_SSH_PORT> <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP> "echo 'Connection successful!'"
```

Expected output: `Connection successful!`

If the connection fails, see the [Troubleshooting](#9-troubleshooting) section for common SSH issues and their resolutions.

### Security Notes

- **Never commit** the private key file (`deploy_key`) to the repository. Add it to `.gitignore`.
- **Rotate keys** if you suspect the private key has been compromised.
- **Use separate keys** for deployment and personal SSH access to the server.
- **Restrict the key** on the server by prefixing the `authorized_keys` entry with `command="/path/to/restricted-shell"` if you want to limit what the deployment key can execute.

---

## 5. Server Setup

This section covers the initial one-time setup required on the ISP server before the first deployment. These steps create the necessary directory structure, install software dependencies, configure the PostgreSQL database, and set up the nginx reverse proxy. Once completed, the server is ready to receive automated deployments from GitHub Actions.

### Step 1: Create Deployment Directories

The deployment process expects several directories to exist on the server. Create them with appropriate permissions:

```bash
# Staging area for incoming deployment files
mkdir -p /home/<YOUR_SSH_USERNAME>/portal-deploy-staging
mkdir -p /home/<YOUR_SSH_USERNAME>/isp-portal-backend

# Backup directory for rollback capability
mkdir -p /home/<YOUR_SSH_USERNAME>/backups

# Player cache directory for FFmpeg-transcoded media
mkdir -p <YOUR_PLAYER_CACHE_PATH>
chmod 755 <YOUR_PLAYER_CACHE_PATH>

# Set ownership if needed
chown -R <YOUR_SSH_USERNAME>:<YOUR_SSH_USERNAME> /home/<YOUR_SSH_USERNAME>/portal-deploy-staging
chown -R <YOUR_SSH_USERNAME>:<YOUR_SSH_USERNAME> /home/<YOUR_SSH_USERNAME>/backups
```

### Step 2: Install Node.js on the Server

Install Node.js 20 LTS using the NodeSource repository (recommended for Ubuntu/Debian):

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

Optionally, install PM2 for robust process management:

```bash
sudo npm install -g pm2
```

### Step 3: Configure PostgreSQL

Install PostgreSQL if not already available, then create the database and user:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Switch to the postgres user and create the database
sudo -u postgres psql <<EOF
CREATE USER <YOUR_DB_USER> WITH PASSWORD '<YOUR_DB_PASSWORD>';
CREATE DATABASE isp_entertainment OWNER <YOUR_DB_USER>;
GRANT ALL PRIVILEGES ON DATABASE isp_entertainment TO <YOUR_DB_USER>;
EOF

# Verify the connection
psql -h localhost -U <YOUR_DB_USER> -d isp_entertainment -c "SELECT 1;"
```

The backend will automatically run database migrations on startup via the `ensureContentStore()` function. No manual schema setup is required.

### Step 4: Install FFmpeg

FFmpeg is required for the player cache system, which transcodes media files into browser-compatible formats:

```bash
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
ffprobe -version
```

### Step 5: Configure Nginx Reverse Proxy

Create an nginx configuration file that proxies API requests to the backend and serves frontend static files. The example below assumes the backend runs on port 4100 (adjust to match your `PORT` environment variable) and the frontend is served from `/var/www/html/portal`:

```nginx
server {
    listen 80;
    server_name <YOUR_DOMAIN>;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <YOUR_DOMAIN>;

    ssl_certificate     /etc/ssl/certs/<YOUR_SSL_CERT>;
    ssl_certificate_key /etc/ssl/private/<YOUR_SSL_KEY>;

    # Frontend static files (built React app)
    location /portal {
        alias /var/www/html/portal;
        try_files $uri $uri/ /portal/index.html;
    }

    # API proxy — forward to the backend Express server
    location /portal-api/ {
        proxy_pass http://127.0.0.1:<YOUR_BACKEND_PORT>/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:<YOUR_BACKEND_PORT>/health;
    }
}
```

After creating the configuration, test and reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Set Up the Backend as a System Service

Create a systemd service file for automatic startup and process management:

```bash
sudo tee /etc/systemd/system/isp-portal-backend.service > /dev/null <<EOF
[Unit]
Description=ISP Entertainment Portal Backend
After=network.target postgresql.service

[Service]
Type=simple
User=<YOUR_SSH_USERNAME>
WorkingDirectory=/home/<YOUR_SSH_USERNAME>/isp-portal-backend
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable isp-portal-backend
```

If you prefer PM2 instead of systemd, the deployment script will detect and use PM2 automatically if it is installed on the server. You can also create an `ecosystem.config.js` file in the backend directory for PM2-specific configuration including memory limits, log paths, and instance management.

---

## 6. Deployment Methods

The Speed4You portal supports three deployment methods, each suited to different network topologies and operational preferences. Choose the method that best fits your server's accessibility and your team's workflow.

### Method A: GitHub Actions (Recommended for Public-Facing Servers)

This is the primary and recommended deployment method. It is fully automated: every push to the `main` branch triggers the GitHub Actions workflow, which builds the frontend, uploads the backend and frontend files to the server via SCP, and restarts the backend service via SSH.

**Workflow Steps:**

1. Developer pushes code to the `main` branch.
2. GitHub Actions checks out the repository.
3. Node.js 20 is set up with npm caching.
4. Frontend and backend dependencies are installed (`npm ci`).
5. Frontend is built with Vite (`npm run build`), producing the `frontend/dist` directory.
6. The built frontend is uploaded to `/var/www/html/portal` on the server.
7. The backend code is uploaded to `/home/<YOUR_SSH_USERNAME>/isp-portal-backend` on the server.
8. Backend dependencies are installed on the server (`npm ci --omit=dev`).
9. The `.env` file is written from the `DEPLOY_ENV_FILE_CONTENT` ***REMOVED***.
10. The backend service is restarted (PM2 or systemd, auto-detected).
11. A deployment summary is printed.

**Triggering a deployment:**

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

You can also trigger the workflow manually from the GitHub Actions tab using the **Run workflow** button (the workflow has `workflow_dispatch` enabled).

**Monitoring:** Go to your repository's **Actions** tab to view workflow runs, inspect logs, and diagnose failures.

### Method B: Manual Deployment

If you need to deploy without GitHub Actions (e.g., for testing, hotfixes, or when GitHub is unavailable), you can run the deployment steps manually from your local machine.

**Steps:**

```bash
# 1. Build the frontend locally
cd frontend
npm ci
npm run build
cd ..

# 2. Upload frontend build to the server
scp -r -P <YOUR_SSH_PORT> \
  -i <PATH_TO_YOUR_PRIVATE_KEY> \
  frontend/dist/* \
  <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP>:/var/www/html/portal/

# 3. Upload backend code to the server
scp -r -P <YOUR_SSH_PORT> \
  -i <PATH_TO_YOUR_PRIVATE_KEY> \
  backend/* \
  <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP>:/home/<YOUR_SSH_USERNAME>/isp-portal-backend/

# 4. SSH into the server and restart the backend
ssh -p <YOUR_SSH_PORT> \
  -i <PATH_TO_YOUR_PRIVATE_KEY> \
  <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP> << 'EOF'
  cd /home/<YOUR_SSH_USERNAME>/isp-portal-backend
  npm ci --omit=dev
  sudo systemctl restart isp-portal-backend
EOF
```

### Method C: Local Network Deployment (Webhook-Based)

When the server is on a local network that GitHub Actions cannot reach directly, use the webhook-based deployment method. A local webhook listener runs on a machine that has network access to both the internet (to receive GitHub webhook events) and the ISP server (to deploy via SSH).

**How it works:**

1. You push to `main` on GitHub.
2. GitHub sends an HTTP POST webhook to your local machine.
3. The local webhook listener (`local-deploy-webhook.js`) receives and validates the event.
4. The listener builds the frontend locally, then SCPs the files to the server and restarts the backend via SSH.

**Setup:**

```bash
# 1. Start the webhook listener
node local-deploy-webhook.js

# 2. Add a webhook to your GitHub repository:
#    - Go to: Repository > Settings > Webhooks > Add webhook
#    - Payload URL: http://<YOUR_LOCAL_IP>:3000/webhook
#    - Content type: application/json
#    - Secret: <YOUR_WEBHOOK_SECRET>  (must match WEBHOOK_SECRET env var)
#    - Events: Push events only
#    - Active: Yes
```

**Running as a persistent service (Linux systemd):**

```ini
[Unit]
Description=GitHub Webhook Listener
After=network.target

[Service]
Type=simple
User=<YOUR_LOCAL_USER>
WorkingDirectory=<PATH_TO_PROJECT>
ExecStart=/usr/bin/node local-deploy-webhook.js
Restart=always
Environment=WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>

[Install]
WantedBy=multi-user.target
```

**Alternative:** For a more robust setup, consider using a [GitHub Actions self-hosted runner](./SETUP_SELF_HOSTED_RUNNER.md) on the local network. This provides full GitHub Actions functionality without requiring a webhook listener.

---

## 7. Environment Configuration

The backend requires a comprehensive set of environment variables to operate correctly. These are stored in a `.env` file on the server and loaded by the `dotenv` package at startup. The application validates these variables on boot — in production mode, missing required variables will cause the server to exit immediately with a descriptive error message.

### Complete Environment Variable Reference

| Variable | Required | Description | Production Default |
|---|---|---|---|
| `NODE_ENV` | Yes | Application environment. Set to `production` for deployment. | `production` |
| `PORT` | Yes | Port the Express server listens on. Must match the nginx proxy configuration. | Configurable (e.g., 4100) |
| `DB_HOST` | Yes | PostgreSQL host. | `localhost` |
| `DB_PORT` | No | PostgreSQL port. | `5432` |
| `DB_NAME` | Yes | PostgreSQL database name. | `isp_entertainment` |
| `DB_USER` | Yes | PostgreSQL user. | — |
| `DB_PASSWORD` | Yes | PostgreSQL ***REMOVED***. | — |
| `DB_POOL_MAX` | No | Maximum database connection pool size. | `20` |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens. Minimum 32 characters in production. Must not be a known weak value. | — |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins. **Required in production** — the application will refuse to start without it. | — |
| `ADMIN_USERNAME` | Yes | Admin panel username. | — |
| `ADMIN_PASSWORD_HASH` | Yes | Bcrypt hash of the admin ***REMOVED***. | — |
| `TMDB_API_KEY` | No | TMDb API key for metadata enrichment. | — |
| `PLAYER_CACHE_ROOT` | No | Absolute path for the FFmpeg player cache directory. | `/var/www/html/Extra_Storage/portal-media-cache` (production) |
| `FFMPEG_PATH` | No | Absolute path to the `ffmpeg` binary. | `ffmpeg` (resolved from PATH) |
| `FFPROBE_PATH` | No | Absolute path to the `ffprobe` binary. | `ffprobe` (resolved from PATH) |
| `TRUST_PROXY_HOPS` | No | Number of trusted reverse proxy hops. Set to the number of proxies in front of the server. | `1` |
| `GLOBAL_API_RATE_LIMIT_MAX` | No | Maximum requests per 15-minute window for general API routes. | `5000` |
| `PUBLIC_API_RATE_LIMIT_MAX` | No | Maximum requests per minute for read-only public content endpoints. | `20000` |
| `SCANNER_HEALTH_PUBLIC_VERBOSE` | No | Set to `true` to include sensitive details in the public scanner health endpoint. | `false` |

### Example Production `.env` File

This is the content you should set as the `DEPLOY_ENV_FILE_CONTENT` GitHub ***REMOVED***. The deployment workflow writes this verbatim to the server's `.env` file:

```env
NODE_ENV=production
PORT=<YOUR_BACKEND_PORT>

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isp_entertainment
DB_USER=<YOUR_DB_USER>
DB_PASSWORD=<YOUR_DB_PASSWORD>
DB_POOL_MAX=20

# Authentication
JWT_SECRET=<YOUR_JWT_SECRET_MIN_32_CHARS>
ADMIN_USERNAME=<YOUR_ADMIN_USERNAME>
ADMIN_PASSWORD_HASH=<YOUR_BCRYPT_HASH>

# CORS — REQUIRED in production
CORS_ALLOWED_ORIGINS=https://<YOUR_DOMAIN>

# TMDb Metadata
TMDB_API_KEY=<YOUR_TMDB_API_KEY>

# Media / Player Cache
PLAYER_CACHE_ROOT=<YOUR_PLAYER_CACHE_PATH>
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Reverse Proxy
TRUST_PROXY_HOPS=1

# Rate Limiting
GLOBAL_API_RATE_LIMIT_MAX=5000
PUBLIC_API_RATE_LIMIT_MAX=20000
```

### Environment Validation

The backend performs strict environment validation on startup via the `checkEnv()` function. In production mode (`NODE_ENV=production`):

- **Missing required variables** (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) will cause the server to exit with an error listing the missing variables.
- **Weak JWT ***REMOVED***s** (less than 32 characters or matching known default values like `***REMOVED***`) will be rejected.
- **Missing CORS origins** will cause the server to refuse to start, since an open CORS policy in production is a security risk.

In development mode, missing variables produce warnings rather than errors, and the database falls back to an in-memory `pg-mem` store if PostgreSQL is unavailable.

---

## 8. Post-Deployment Verification

After every deployment — whether automated, manual, or webhook-triggered — you should perform the following verification checks to confirm that the application is running correctly. These checks cover the deployment pipeline, the backend API, the frontend, and critical user-facing functionality. Spending a few minutes on verification after each deployment prevents issues from going unnoticed until users report them.

### Step 1: Check GitHub Actions Status

If using GitHub Actions, navigate to your repository's **Actions** tab and verify that the latest workflow run shows a green checkmark (success). If it shows a red X (failure), click on the run to inspect the logs for each step. Common failure points include SSH connection issues, build errors, and missing ***REMOVED***s. The workflow has concurrency controls that cancel in-progress deployments when a new one starts, so you should only see one active deployment at a time.

### Step 2: Test the Backend Health Endpoint

The backend exposes a `/health` endpoint that returns a JSON response confirming the server is operational:

```bash
# Direct health check (from the server)
curl -fsS http://127.0.0.1:<YOUR_BACKEND_PORT>/health

# Via nginx (from outside the server)
curl -fsS https://<YOUR_DOMAIN>/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

The scanner health endpoint provides additional diagnostics:

```bash
curl -fsS https://<YOUR_DOMAIN>/health/scanner
```

### Step 3: Test the Frontend

Visit the portal URL in a browser:

```
https://<YOUR_DOMAIN>/portal/
```

Verify that:
- The page loads without console errors.
- The hero banner and content rails render correctly.
- Navigation between pages works (Browse, Search, TV Mode).
- Static assets (images, CSS, JS) load successfully (check the Network tab in browser DevTools for 404 errors).

### Step 4: Test the API Content Endpoint

Verify that the backend is serving content data:

```bash
curl -fsS https://<YOUR_DOMAIN>/portal-api/api/content/latest?limit=3
```

This should return a JSON array of content items. A 403 or CORS error indicates that the `CORS_ALLOWED_ORIGINS` environment variable is misconfigured.

### Step 5: Test Admin Login

Navigate to the admin login page and verify that you can authenticate with the configured admin credentials. The admin panel should load and display the dashboard with scanner health and content library information.

### Step 6: Test Content Browsing and Playback

Browse the content library, open a movie or series detail page, and attempt to play a video. Verify that the player cache system is functioning by checking that transcoded media files appear in the `PLAYER_CACHE_ROOT` directory on the server:

```bash
ls -la <YOUR_PLAYER_CACHE_PATH>/
```

### Verification Checklist

| Check | Command / Action | Expected Result |
|---|---|---|
| GitHub Actions success | View Actions tab | Green checkmark |
| Backend health | `curl /health` | `{"status":"ok",...}` |
| Frontend loads | Visit `/portal/` | Page renders without errors |
| API returns data | `curl /portal-api/api/content/latest?limit=3` | JSON array of items |
| Admin login works | Login with admin credentials | Dashboard loads |
| Video playback works | Play a movie or episode | Video starts streaming |
| Scanner health | `curl /health/scanner` | JSON with root status info |

---

## 9. Troubleshooting

This section covers the most common deployment issues, their root causes, and step-by-step resolution procedures. The issues are ordered by frequency of occurrence.

### 504 Gateway Timeout

**Symptoms:** The browser shows a "504 Gateway Timeout" error when accessing the portal. Nginx logs indicate that it could not connect to the upstream backend.

**Root Cause:** The most common cause is a port mismatch between the nginx configuration and the backend `.env` file. Nginx proxies requests to a specific port (e.g., 4100), but if the backend starts on a different port (e.g., 3001 or 5000), nginx cannot reach it.

**Resolution:**

1. Check which port the backend is actually listening on:
   ```bash
   sudo lsof -iTCP -sTCP:LISTEN | grep node
   ```

2. Verify the `PORT` value in the backend `.env` file:
   ```bash
   cat /home/<YOUR_SSH_USERNAME>/isp-portal-backend/.env | grep PORT
   ```

3. Verify the nginx proxy_pass directive matches:
   ```bash
   grep proxy_pass /etc/nginx/sites-enabled/*
   ```

4. Ensure all three values agree. If they differ, update the `.env` file and restart the backend:
   ```bash
   sudo systemctl restart isp-portal-backend
   ```

5. If using `DEPLOY_ENV_FILE_CONTENT` in GitHub Secrets, update the ***REMOVED*** to include the correct `PORT` value so future deployments do not overwrite it with the wrong port.

### SSH Connection Issues

**Symptoms:** GitHub Actions fails at the "Upload" or "Restart" step with "Connection refused", "Permission denied", or "Authentication failed".

**Resolution:**

1. **Verify the key is not passphrase-protected:**
   ```bash
   ssh-keygen -y -f deploy_key
   # If this asks for a passphrase, the key must be regenerated without one
   ```

2. **Verify the public key is on the server:**
   ```bash
   ssh <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP> "cat ~/.ssh/authorized_keys"
   ```

3. **Check file permissions on the server:**
   ```bash
   ls -la ~/.ssh/
   # ~/.ssh should be 700
   # ~/.ssh/authorized_keys should be 600
   ```

4. **Verify the SSH port is open and reachable:**
   ```bash
   telnet <YOUR_SERVER_IP> <YOUR_SSH_PORT>
   ```

5. **Test the connection manually:**
   ```bash
   ssh -i deploy_key -p <YOUR_SSH_PORT> <YOUR_SSH_USERNAME>@<YOUR_SERVER_IP> "echo OK"
   ```

6. **Check the `DEPLOY_SSH_KEY` GitHub ***REMOVED***** — make sure it includes the entire private key file content, including the BEGIN and END lines, with no extra whitespace or line breaks added accidentally.

### CORS Errors

**Symptoms:** The frontend loads but API calls fail with 403 errors in the browser console, or the browser blocks requests with a CORS policy error.

**Root Cause:** The `CORS_ALLOWED_ORIGINS` environment variable is either not set, set incorrectly, or does not include the origin from which the frontend is being accessed.

**Resolution:**

1. Check the current CORS configuration on the server:
   ```bash
   cat /home/<YOUR_SSH_USERNAME>/isp-portal-backend/.env | grep CORS
   ```

2. Ensure the value includes the exact origin URL that the browser uses, including the protocol (`https://`) and no trailing slash:
   ```
   CORS_ALLOWED_ORIGINS=https://<YOUR_DOMAIN>
   ```

3. For multiple origins, separate them with commas:
   ```
   CORS_ALLOWED_ORIGINS=https://<YOUR_DOMAIN>,http://<YOUR_LOCAL_IP>:<YOUR_BACKEND_PORT>
   ```

4. Restart the backend after making changes:
   ```bash
   sudo systemctl restart isp-portal-backend
   ```

### Content Not Loading

**Symptoms:** The frontend renders but shows empty content rails, "No content available" messages, or 404 errors on media files.

**Resolution:**

1. **Check scanner roots** — the media scanner needs to know where to find media files:
   ```bash
   curl -fsS http://127.0.0.1:<YOUR_BACKEND_PORT>/health/scanner
   ```
   Look at the `roots` array for `exists: false` or `checkable: false` entries, which indicate missing or inaccessible media directories.

2. **Verify media file paths** — ensure the media directories on the server contain the expected files and that the backend user has read access:
   ```bash
   ls -la /path/to/media/directory/
   ```

3. **Trigger a manual scan** — use the admin panel to initiate a media scan, or call the admin API endpoint directly.

4. **Check FFmpeg availability** — the player cache system requires FFmpeg:
   ```bash
   which ffmpeg && ffmpeg -version
   ```

### Build Failures

**Symptoms:** The GitHub Actions workflow fails at the "Build frontend" step with compilation errors.

**Resolution:**

1. **Reproduce locally first:**
   ```bash
   cd frontend && npm ci && npm run build
   ```

2. **Check Node.js version** — the workflow uses Node.js 20. If you are using a different version locally, there may be dependency incompatibilities:
   ```bash
   node --version
   ```

3. **Clear dependency caches** and reinstall:
   ```bash
   rm -rf frontend/node_modules frontend/package-lock.json
   cd frontend && npm install && npm run build
   ```

### Service Won't Start

**Symptoms:** After deployment, the backend service fails to start. Health checks time out and the site is unreachable.

**Resolution:**

1. **Check service logs:**
   ```bash
   sudo journalctl -u isp-portal-backend --no-pager -n 50
   ```

2. **Check for port conflicts:**
   ```bash
   sudo lsof -i :<YOUR_BACKEND_PORT>
   ```

3. **Check for environment variable errors** — the server may have exited due to a missing or invalid env var. The error message will list the specific problem.

4. **Check database connectivity:**
   ```bash
   psql -h localhost -U <YOUR_DB_USER> -d isp_entertainment -c "SELECT 1;"
   ```

5. **If using PM2**, check PM2 logs:
   ```bash
   pm2 logs isp-portal-backend --lines 50
   pm2 status
   ```

---

## 10. Maintenance

Ongoing maintenance is essential to keep the portal running smoothly and securely. This section covers routine maintenance tasks, backup procedures, update strategies, and monitoring recommendations.

### Routine Maintenance Tasks

| Task | Frequency | Command / Action |
|---|---|---|
| **Review GitHub Actions logs** | After every deployment | Repository > Actions tab |
| **Check disk space** | Weekly | `df -h` on the server |
| **Check player cache size** | Monthly | `du -sh <YOUR_PLAYER_CACHE_PATH>` |
| **Review database size** | Monthly | `psql -c "SELECT pg_size_pretty(pg_database_size('isp_entertainment'));"` |
| **Rotate JWT ***REMOVED***** | Quarterly | Update `JWT_SECRET` in `.env` and `DEPLOY_ENV_FILE_CONTENT` ***REMOVED***, then restart |
| **Update dependencies** | Monthly | Review `npm audit` output for both frontend and backend |
| **Rotate SSH keys** | Semi-annually | Generate new keys, update server and GitHub Secrets |

### Database Backups

Set up automated PostgreSQL backups using the provided script or a cron job:

```bash
# Using the project's backup script
bash scripts/backup-db.sh

# Or manually with pg_dump
pg_dump -h localhost -U <YOUR_DB_USER> isp_entertainment \
  | gzip > /home/<YOUR_SSH_USERNAME>/backups/db-$(date +%Y%m%d-%H%M%S).sql.gz
```

For automated daily backups, add a cron entry:

```bash
# Edit crontab
crontab -e

# Add: Backup at 3 AM daily
0 3 * * * pg_dump -h localhost -U <YOUR_DB_USER> isp_entertainment | gzip > /home/<YOUR_SSH_USERNAME>/backups/db-$(date +\%Y\%m\%d).sql.gz
```

### Rolling Back a Failed Deployment

If a deployment introduces a critical bug, you can roll back to the previous version:

1. **Using the backup directory** — the deployment script creates backups of the previous frontend and backend data files before overwriting:
   ```bash
   ls -la /home/<YOUR_SSH_USERNAME>/backups/
   ```

2. **Using Git** — revert to the previous commit and redeploy:
   ```bash
   git revert HEAD
   git push origin main
   ```
   This triggers a new deployment with the reverted code.

3. **Manual rollback** — restore files from the backup directory:
   ```bash
   # Restore frontend
   sudo cp -a /home/<YOUR_SSH_USERNAME>/backups/<TIMESTAMP>/frontend/. /var/www/html/portal/

   # Restore backend data files
   cp -a /home/<YOUR_SSH_USERNAME>/backups/<TIMESTAMP>/backend-data/. /home/<YOUR_SSH_USERNAME>/isp-portal-backend/src/data/

   # Restart
   sudo systemctl restart isp-portal-backend
   ```

### Player Cache Management

The player cache can grow significantly over time. Use the built-in cache management tools to monitor and clean it:

```bash
# View cache report
cd /home/<YOUR_SSH_USERNAME>/isp-portal-backend
node scripts/manage-player-cache.js --report

# Remove stale partial cache files
node scripts/manage-player-cache.js --report --remove-stale-partials

# Prewarm the cache for specific content
node scripts/prewarm-player-cache.js
```

### Monitoring and Alerting

Consider setting up external monitoring for the production site:

- **Uptime monitoring** — Use a service like UptimeRobot or Better Uptime to monitor the `/health` endpoint. Configure alerts for downtime exceeding 1 minute.
- **Log monitoring** — Use `pm2 logs` or `journalctl -u isp-portal-backend -f` to tail backend logs in real time.
- **Resource monitoring** — Use `htop` or install a monitoring agent to track CPU, memory, and disk usage on the server.
- **SSL certificate monitoring** — Set reminders to renew SSL certificates before they expire, or use Let's Encrypt with automatic renewal.

### Updating the Application

The normal update flow is:

1. Make changes on a feature branch.
2. Test locally with `npm run dev`.
3. Merge to `main` via pull request.
4. GitHub Actions automatically deploys.
5. Verify the deployment using the post-deployment checklist in [Section 8](#8-post-deployment-verification).

For emergency hotfixes, you can push directly to `main` or use the manual deployment method described in [Section 6](#6-deployment-methods).

---

*This document consolidates and replaces all prior deployment documentation. After verifying this guide is complete and accurate, the following legacy files can be safely deleted: `DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_READY.md`, `DEPLOYMENT_STATUS.md`, `DEPLOYMENT_VERIFICATION.md`, `DEPLOYMENT_IMPROVEMENTS.md`, `DEPLOYMENT_TEST_REPORT.md`, `DEPLOYMENT_TEST.md`, `FINAL_DEPLOYMENT_SETUP.md`, `LOCAL_DEPLOYMENT_SETUP.md`, `LOCAL_NETWORK_DEPLOYMENT_GUIDE.md`, `GITHUB_SECRETS_SETUP.md`, `SSH_KEY_FIX_GUIDE.md`, `TODO_NEXT.md`.*
