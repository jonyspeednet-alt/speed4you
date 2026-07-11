#!/bin/bash
# =============================================================================
# Speed4You Portal - Complete Security Setup Script
# =============================================================================
# This script helps you set up all credentials securely
# Run this ONCE after cloning the repository

set -e

echo "=========================================="
echo " Speed4You Portal - Security Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}WARNING: .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Aborted."
        exit 1
    fi
fi

echo -e "${CYAN}Step 1: Generate JWT Secret${NC}"
JWT_SECRET=$(openssl rand -hex 64)
echo -e "${GREEN}Generated JWT Secret${NC}"

echo ""
echo -p "${CYAN}Step 2: Database Configuration${NC}"
read -p "DB Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "DB Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "DB Name [isp_entertainment]: " DB_NAME
DB_NAME=${DB_NAME:-isp_entertainment}

read -p "DB User: " DB_USER
if [ -z "$DB_USER" ]; then
    echo -e "${RED}ERROR: DB User is required${NC}"
    exit 1
fi

read -s -p "DB Password: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: DB Password is required${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Step 3: Admin Configuration${NC}"
read -p "Admin Username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -s -p "Admin Password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}ERROR: Admin Password is required${NC}"
    exit 1
fi

# Generate bcrypt hash for admin ***REMOVED***
echo -e "${CYAN}Generating ***REMOVED*** hash...${NC}"
ADMIN_PASSWORD_HASH=$(node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('${ADMIN_PASSWORD}', 10);
console.log(hash);
" 2>/dev/null || echo "")

if [ -z "$ADMIN_PASSWORD_HASH" ]; then
    echo -e "${YELLOW}WARNING: Could not generate ***REMOVED*** hash. You'll need to generate it manually.${NC}"
    echo "Run: node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 10));\""
fi

echo ""
echo -e "${CYAN}Step 4: API Keys${NC}"
read -p "TMDB API Key (optional): " TMDB_API_KEY
read -p "OMDB API Key (optional): " OMDB_API_KEY

echo ""
echo -e "${CYAN}Step 5: CORS Configuration${NC}"
read -p "CORS Allowed Origins [https://data.speed4you.net,https://103.79.182.226,capacitor://localhost,http://localhost]: " CORS_ALLOWED_ORIGINS
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-"https://data.speed4you.net,https://103.79.182.226,capacitor://localhost,http://localhost"}

echo ""
echo -e "${CYAN}Step 6: Server Configuration${NC}"
read -p "Server Port [4100]: " PORT
PORT=${PORT:-4100}

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
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_POOL_MAX=50
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000

# Authentication
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH

# API Keys
TMDB_API_KEY=$TMDB_API_KEY
OMDB_API_KEY=$OMDB_API_KEY

# CORS
CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS

# Scanner
SCANNER_MIN_MOVIE_SIZE=104857600
SCANNER_MIN_EPISODE_SIZE=31457280

# Server
PORT=$PORT
EOF

echo -e "${GREEN}.env file created successfully!${NC}"

# Create .env.deploy for GitHub Actions
echo ""
echo -e "${CYAN}Creating .env.deploy file for GitHub Actions...${NC}"

cat > .env.deploy << EOF
# =============================================================================
# Deployment Environment Variables (for GitHub Actions)
# =============================================================================
# This file is used by GitHub Actions deployment workflow
# NEVER commit this file to version control

# Backend environment content (will be deployed to server)
BACKEND_ENV=NODE_ENV=production
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH
TMDB_API_KEY=$TMDB_API_KEY
OMDB_API_KEY=$OMDB_API_KEY
CORS_ALLOWED_ORIGINS=$CORS_ALLOWED_ORIGINS
PORT=$PORT
EOF

echo -e "${GREEN}.env.deploy file created successfully!${NC}"

# Display setup instructions
echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${CYAN}Generated Files:${NC}"
echo "  - .env (backend configuration)"
echo "  - .env.deploy (GitHub Actions)"
echo "  - deploy_key (SSH private key)"
echo "  - deploy_key.pub (SSH public key)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Add SSH public key to your server:"
echo "   -----------------------------------------------"
echo "   $(cat deploy_key.pub)"
echo "   -----------------------------------------------"
echo "   Run on server:"
echo "   mkdir -p ~/.ssh && chmod 700 ~/.ssh"
echo "   echo '$(cat deploy_key.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "2. Set GitHub Secrets (run on your local machine):"
echo "   DEPLOY_HOST=$(hostname -I | awk '{print $1}')"
echo "   DEPLOY_PORT=22"
echo "   DEPLOY_USER=speed4you"
echo "   DEPLOY_SSH_KEY_PATH=$(pwd)/deploy_key"
echo "   DEPLOY_SUDO_PASSWORD=YOUR_SUDO_PASSWORD"
echo ""
echo "3. Push to GitHub to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'chore: add deployment configuration'"
echo "   git push origin main"
echo ""
echo -e "${RED}IMPORTANT: Keep these files secure and NEVER commit them!${NC}"
echo ""
