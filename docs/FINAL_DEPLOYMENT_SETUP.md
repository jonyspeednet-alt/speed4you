# 🚀 Final Deployment Setup Guide

## ✅ What's Done:

1. ✅ GitHub Actions workflow configured
2. ✅ Deployment scripts ready
3. ✅ Code pushed to GitHub (main branch)
4. ✅ SSH keys generated

## 📋 What You Need to Do:

### Option A: Using GitHub CLI (Recommended - Fastest)

**Prerequisites:**
- Install GitHub CLI: https://cli.github.com/
- Run: `gh auth login`

**Then run:**
```powershell
.\setup-github-secrets.ps1
```

This will automatically set all secrets except `DEPLOY_ENV_FILE_CONTENT`.

---

### Option B: Manual Setup (If GitHub CLI not available)

Go to: **GitHub → Your Repository → Settings → Secrets and variables → Actions**

Click "New repository secret" and add these 8 secrets:

#### 1. DEPLOY_HOST
```
203.0.113.2
```

#### 2. DEPLOY_PORT
```
2973
```

#### 3. DEPLOY_USER
```
speed4you
```

#### 4. DEPLOY_SSH_KEY
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABAM3Jl+fC
hUViLkUGtgFO3KAAAAGAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIKJOmk9rXcDxfUS+
rUYAOfldhRPNDYLFEiiTwMa1AdKsAAAAoM2ASat6k+yN/Xf4+Iw/bCMKUBOg2hnRoJYlwd
MBmtxdzrQdx2/bZPvfNtEiHin+2A1illIBaylKKsultL7PV7RVtdTaBl4+Pqplxtk5EO/3
92YDpl4/qSkgYoTWgpBrFa86qlLDSz97fOGOTgVvwq72xrJU6LMghyJwxIuyuJm6uyUPF2
8dPrWtzlJ2zKF2/vYfWS98uznLNdSwdDZg1qc=
-----END OPENSSH PRIVATE KEY-----
```

#### 5. DEPLOY_SUDO_PASSWORD
```
Speed##ftpsn
```

#### 6. DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS
```
https://data.speed4you.net
```

#### 7. DEPLOY_REMOTE_PLAYER_CACHE_ROOT
```
/var/www/html/Extra_Storage/portal-media-cache
```


#### 8. DEPLOY_ENV_FILE_CONTENT
```
# Your backend .env file content here
# Example:
DATABASE_URL=postgresql://user:pass@localhost/dbname
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5000
```

---

## 🖥️ Server Setup (203.0.113.2)

Connect via Putty and run these commands:

### Step 1: Add SSH Key
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKJOmk9rXcDxfUS+rUYAOfldhRPNDYLFEiiTwMa1AdKs \isp-entertainment-deploy\
EOF
chmod 600 ~/.ssh/authorized_keys
```

### Step 2: Create Deployment Directories
```bash
mkdir -p /home/speed4you/portal-deploy-staging
mkdir -p /home/speed4you/backups
mkdir -p /home/speed4you/cache
chmod 755 /home/speed4you/portal-deploy-staging
chmod 755 /home/speed4you/backups
chmod 755 /var/www/html/Extra_Storage/portal-media-cache

```

### Step 3: Verify SSH Connection (from your local machine)
```bash
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo 'SSH Connection Successful!'"
```

---

## 🎯 Testing Deployment

### Test 1: Verify GitHub Secrets
```bash
# Go to GitHub → Actions tab
# You should see the workflow run
# Check if all secrets are properly set
```

### Test 2: Manual SSH Test
```bash
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "ls -la /home/speed4you/"
```

### Test 3: Trigger Deployment
Make a small change and push:
```bash
git add .
git commit -m "Test deployment trigger"
git push origin main
```

Then go to GitHub → Actions and watch the deployment.

---

## 📊 Deployment Workflow

```
1. You push to main branch
   ↓
2. GitHub Actions triggered automatically
   ↓
3. Checkout code
   ↓
4. Setup Node.js 22
   ↓
5. Build frontend (npm install + npm run build)
   ↓
6. Prepare deployment package
   ↓
7. Copy files to server via SCP
   ↓
8. Execute deploy script on server
   ↓
9. Stop old backend process
   ↓
10. Start new backend process
   ↓
11. Verify deployment
   ↓
12. Live at https://data.speed4you.net/portal/
```

---

## 🔍 Monitoring & Troubleshooting

### Check Deployment Status
1. Go to GitHub → Your Repository → Actions
2. Click on the latest workflow run
3. View logs for each step

### Common Issues & Solutions

#### ❌ SSH Connection Failed
```
Solution:
1. Verify SSH key is added to server: cat ~/.ssh/authorized_keys
2. Check port 2973 is open: sudo ufw allow 2973
3. Test connection: ssh -i deploy_key -p 2973 speed4you@203.0.113.2
```

#### ❌ Build Failed
```
Solution:
1. Check GitHub Actions logs
2. Verify frontend dependencies: cd frontend && npm install
3. Test build locally: npm run build
```

#### ❌ Deploy Script Failed
```
Solution:
1. Check if directories exist on server
2. Verify .env file content is correct
3. Check service name: systemctl list-unit-files | grep portal
```

#### ❌ Service Won't Start
```
Solution:
1. SSH to server and check logs
2. Verify port 5000 is available: sudo lsof -i :5000
3. Check backend dependencies: cd /home/speed4you/backend && npm install
```

---

## 📝 Files Created

- `.github/workflows/deploy.yml` - Main deployment workflow
- `DEPLOYMENT_CHECKLIST.md` - Setup checklist
- `DEPLOYMENT_VERIFICATION.md` - Verification report
- `GITHUB_SECRETS_SETUP.md` - Secrets guide
- `setup-github-secrets.ps1` - Automated secrets setup script
- `setup-deploy-key.sh` - Server SSH key setup script
- `FINAL_DEPLOYMENT_SETUP.md` - This file

---

## ✨ Next Steps

1. **Add GitHub Secrets** (Option A or B above)
2. **Setup Server** (Run commands on 203.0.113.2)
3. **Test SSH Connection**
4. **Make a test commit and push**
5. **Monitor GitHub Actions**
6. **Verify at https://data.speed4you.net/portal/**

---

## 🎉 You're All Set!

Once you complete the above steps, every push to the main branch will automatically:
- Build your frontend
- Deploy to your server
- Restart the backend service
- Go live!

**Happy deploying! 🚀**
