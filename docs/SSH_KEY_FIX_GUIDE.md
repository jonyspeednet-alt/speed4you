# 🔑 SSH Key Passphrase Fix Guide

## Problem

Your SSH key (`deploy_key`) is passphrase protected, which blocks automated deployment.

## Solution

Choose one of the following methods:

---

## Method 1: Remove Passphrase from Existing Key (Recommended)

### Step 1: Remove Passphrase

```bash
# This will prompt for the current passphrase, then set a new empty passphrase
ssh-keygen -p -f deploy_key -N "" -P "Speed##ftpsn"
```

**What this does:**
- `-p`: Change passphrase
- `-f deploy_key`: Key file
- `-N ""`: New passphrase (empty)
- `-P "Speed##ftpsn"`: Old passphrase

### Step 2: Verify Key Works

```bash
# Test SSH connection (should NOT ask for password)
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"
```

Expected output: `OK`

### Step 3: Update GitHub Secret

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/secrets/actions
2. Click on `DEPLOY_SSH_KEY`
3. Copy content of `deploy_key` file (entire private key)
4. Paste it into the secret
5. Click "Update secret"

---

## Method 2: Generate New Key Without Passphrase

### Step 1: Backup Old Key

```bash
# Backup old key
cp deploy_key deploy_key.backup
cp deploy_key.pub deploy_key.pub.backup
```

### Step 2: Generate New Key

```bash
# Generate new ED25519 key without passphrase
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy@speed4you"
```

**When prompted:**
- File name: `deploy_key` (just press Enter)
- Passphrase: Leave empty (just press Enter)
- Confirm passphrase: Leave empty (just press Enter)

### Step 3: Add New Key to Server

```bash
# Copy public key content
cat deploy_key.pub
```

Then on your server (via Putty):

```bash
# Add new public key to authorized_keys
cat >> ~/.ssh/authorized_keys << 'EOF'
[paste deploy_key.pub content here]
EOF

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Test Connection

```bash
# Test SSH connection (should NOT ask for password)
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"
```

Expected output: `OK`

### Step 5: Update GitHub Secret

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/secrets/actions
2. Click on `DEPLOY_SSH_KEY`
3. Copy content of `deploy_key` file (entire private key)
4. Paste it into the secret
5. Click "Update secret"

---

## Method 3: Using ssh-agent (Alternative)

If you want to keep the passphrase but use ssh-agent:

```bash
# Start ssh-agent
eval $(ssh-agent -s)

# Add key to agent (will prompt for passphrase once)
ssh-add deploy_key

# Now SSH connections will use the agent
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"
```

**Note**: This only works for manual deployments, not for automated GitHub Actions.

---

## Verification Checklist

After fixing the SSH key:

- [ ] SSH key file exists: `deploy_key`
- [ ] Public key file exists: `deploy_key.pub`
- [ ] SSH connection works without password:
  ```bash
  ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"
  ```
- [ ] GitHub secret `DEPLOY_SSH_KEY` updated with new private key
- [ ] Webhook listener can connect:
  ```bash
  node local-deploy-webhook.js
  ```

---

## Testing Deployment

Once SSH key is fixed:

```bash
# 1. Start webhook listener
node local-deploy-webhook.js

# 2. In another terminal, make a test commit
git add .
git commit -m "Test deployment with fixed SSH key"
git push origin main

# 3. Watch webhook listener console for deployment logs
```

---

## Troubleshooting

### SSH still asks for password?

```bash
# Check if key is still passphrase protected
ssh-keygen -y -f deploy_key
# If it asks for passphrase, it's still protected
```

### Connection refused?

```bash
# Check if server is reachable
ping 203.0.113.2

# Check if port 2973 is open
telnet 203.0.113.2 2973
```

### Permission denied?

```bash
# Check if public key is on server
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "cat ~/.ssh/authorized_keys"

# Check key permissions on server
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "ls -la ~/.ssh/"
```

---

## Quick Commands

```bash
# Remove passphrase from existing key
ssh-keygen -p -f deploy_key -N "" -P "Speed##ftpsn"

# Generate new key without passphrase
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy@speed4you"

# Test SSH connection
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"

# View public key
cat deploy_key.pub

# View private key (first 5 lines)
head -5 deploy_key
```

---

## Security Notes

1. **Never commit private key** to git
2. **Keep deploy_key secure** - it's like a password
3. **Use different keys** for different purposes
4. **Rotate keys regularly** for security
5. **Use strong passphrases** for manual SSH connections

---

## Next Steps

1. Choose a method above (Method 1 or 2 recommended)
2. Fix the SSH key
3. Test connection
4. Update GitHub secret
5. Start webhook listener
6. Push to main and deploy!

---

**Status**: Ready to fix SSH key passphrase issue
