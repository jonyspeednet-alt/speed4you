#!/bin/bash
# =============================================================================
# Speed4You Portal - Quick Setup Script
# =============================================================================
# This script creates .env file with known defaults
# You only need to provide: DB_PASSWORD and ADMIN_PASSWORD

set -e

echo "=========================================="
echo " Speed4You Portal - Quick Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Known defaults from the old configuration
KNOWN_HOST="***REMOVED***"
KNOWN_PORT="2973"
KNOWN_USER="speed4you"
KNOWN_DB_HOST="localhost"
KNOWN_DB_PORT="5432"
KNOWN_DB_NAME="isp_entertainment"
KNOWN_DB_USER="postgres"

echo -e "${CYAN}Known Configuration:${NC}"
echo "  Server: $KNOWN_HOST:$KNOWN_PORT"
echo "  SSH User: $KNOWN_USER"
echo "  Database: $KNOWN_DB_NAME @ $KNOWN_DB_HOST:$KNOWN_DB_PORT"
echo "  DB User: $KNOWN_DB_USER"
echo ""

# Generate JWT Secret
echo -e "${CYAN}Generating JWT Secret...${NC}"
JWT_SECRET=$(openssl rand -hex 64)
echo -e "${GREEN}JWT Secret generated${NC}"

# Get ***REMOVED***s
echo ""
echo -e "${CYAN}Enter the following ***REMOVED***s:${NC}"
echo ""

read -s -p "Database Password ($KNOWN_DB_USER): " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: Database Password is required${NC}"
    exit 1
fi

read -s -p "Admin Password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}ERROR: Admin Password is required${NC}"
    exit 1
fi

# Generate admin ***REMOVED*** hash
echo ""
echo -e "${CYAN}Generating admin ***REMOVED*** hash...${NC}"
ADMIN_PASSWORD_HASH=$(node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('${ADMIN_PASSWORD}', 10));
" 2>/dev/null)

if [ -z "$ADMIN_PASSWORD_HASH" ]; then
    echo -e "${YELLOW}WARNING: Could not generate hash automatically${NC}"
    echo "Run this command later:"
    echo "  node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 10));\""
    ADMIN_PASSWORD_HASH="GENERATE_MANUALLY"
fi

# Create .env file
echo ""
echo -e "${CYAN}Creating .env file...${NC}"

cat > .env << EOF
# =============================================================================
# Speed4You Portal - Environment Configuration
# =============================================================================
# Generated: $(date)
# NEVER commit this file to version control

# Node Environment
NODE_ENV=production

# Database
DB_HOST=$KNOWN_DB_HOST
DB_PORT=$KNOWN_DB_PORT
DB_NAME=$KNOWN_DB_NAME
DB_USER=$KNOWN_DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_POOL_MAX=50
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000

# Authentication
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH

# API Keys (add your keys)
TMDB_API_KEY=YOUR_TMDB_API_KEY
OMDB_API_KEY=YOUR_OMDB_API_KEY

# CORS
CORS_ALLOWED_ORIGINS=https://data.speed4you.net,https://103.79.182.226,capacitor://localhost,http://localhost

# Scanner
SCANNER_MIN_MOVIE_SIZE=104857600
SCANNER_MIN_EPISODE_SIZE=31457280

# Server
PORT=4100
EOF

echo -e "${GREEN}.env file created successfully!${NC}"

# Display summary
echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${CYAN}Your Configuration:${NC}"
echo "  Server: $KNOWN_HOST:$KNOWN_PORT"
echo "  SSH User: $KNOWN_USER"
echo "  Database: $KNOWN_DB_NAME"
echo "  DB User: $KNOWN_DB_USER"
echo "  Admin User: admin"
echo ""
echo -e "${YELLOW}SSH Public Key (add to server):${NC}"
echo "-----------------------------------------------"
cat deploy_key.pub
echo "-----------------------------------------------"
echo ""
echo -e "${CYAN}Run this on your server:${NC}"
echo "  mkdir -p ~/.ssh && chmod 700 ~/.ssh"
echo "  echo '$(cat deploy_key.pub)' >> ~/.ssh/authorized_keys"
echo "  chmod 600 ~/.ssh/authorized_keys"
echo ""
echo -e "${CYAN}GitHub Secrets to set:${NC}"
echo "  DEPLOY_HOST=$KNOWN_HOST"
echo "  DEPLOY_PORT=$KNOWN_PORT"
echo "  DEPLOY_USER=$KNOWN_USER"
echo "  DEPLOY_SSH_KEY_PATH=$(pwd)/deploy_key"
echo "  DEPLOY_SUDO_PASSWORD=YOUR_SUDO_PASSWORD"
echo ""
echo -e "${RED}IMPORTANT: Keep .env and deploy_key files secure!${NC}"
echo ""
