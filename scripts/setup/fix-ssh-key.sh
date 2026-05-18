#!/bin/bash

# SSH Key Passphrase Fix Script
# This script removes passphrase from existing SSH key or generates a new one

set -e

echo "🔑 SSH Key Passphrase Fix"
echo "=========================="
echo ""

# Check if deploy_key exists
if [ -f "deploy_key" ]; then
    echo "✅ Found existing deploy_key"
    echo ""
    
    # Try to remove passphrase
    echo "🔧 Attempting to remove passphrase..."
    echo "Enter current passphrase when prompted (or press Ctrl+C to cancel):"
    echo ""
    
    # Remove passphrase
    ssh-keygen -p -f deploy_key -N "" 2>&1
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Passphrase removed successfully!"
    else
        echo ""
        echo "⚠️  Could not remove passphrase"
        echo "Trying to generate new key instead..."
        echo ""
        
        # Backup old key
        cp deploy_key deploy_key.backup-$(date +%s)
        cp deploy_key.pub deploy_key.pub.backup-$(date +%s)
        
        # Generate new key
        ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy@speed4you"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ New SSH key generated successfully!"
        else
            echo ""
            echo "❌ Failed to generate new key"
            exit 1
        fi
    fi
else
    echo "❌ deploy_key not found"
    echo "Generating new key..."
    echo ""
    
    ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy@speed4you"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SSH key generated successfully!"
    else
        echo ""
        echo "❌ Failed to generate key"
        exit 1
    fi
fi

echo ""
echo "📋 Key Information:"
echo "===================="
echo ""

echo "Fingerprint:"
ssh-keygen -l -f deploy_key
echo ""

echo "Public Key (deploy_key.pub):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat deploy_key.pub
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✨ Next Steps:"
echo "=============="
echo "1. Copy the public key above"
echo "2. Add it to server: cat >> ~/.ssh/authorized_keys"
echo "3. Test connection: ssh -i deploy_key -p 2973 speed4you@203.0.113.2 'echo OK'"
echo "4. Update GitHub secret DEPLOY_SSH_KEY with private key content"
echo "5. Start webhook listener: node local-deploy-webhook.js"
echo ""

echo "✅ SSH key fix complete!"
