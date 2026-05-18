# 🏠 Local Network Deployment Guide

## Problem Identified ✅

Your server is on a **local network** (203.0.113.2:2973), so GitHub Actions (cloud) cannot reach it directly.

**Solution**: Use a local webhook listener that GitHub notifies when you push code.

---

## 🎯 Quick Start (5 minutes)

### Step 1: Find Your Local IP

**Windows:**
```powershell
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Linux/macOS:**
```bash
hostname -I
# or
ifconfig | grep "inet "
```

### Step 2: Start Webhook Listener

```bash
node local-deploy-webhook.js
```

You'll see:
```
✅ Webhook listener started on port 3000
📍 Webhook URL: http://192.168.1.100:3000/webhook
🔄 Listening for GitHub push events on main branch...
```

### Step 3: Add Webhook to GitHub

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/hooks
2. Click **Add webhook**
3. Fill in:
   - **Payload URL**: `http://192.168.1.100:3000/webhook`
   - **Content type**: `application/json`
   - **Secret**: `your-webhook-secret-here`
   - **Events**: Push events
   - **Active**: ✅

4. Click **Add webhook**

### Step 4: Test It!

```bash
git add .
git commit -m "Test local deployment"
git push origin main
```

Watch your webhook listener console - deployment should start automatically! 🚀

---

## 📊 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub (Cloud)                           │
│  You push to main → GitHub sends webhook notification       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP POST
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Your Local Machine (192.168.1.100)             │
│  Webhook Listener (port 3000) receives notification         │
│  ↓                                                           │
│  Runs: npm install, npm run build                           │
│  ↓                                                           │
│  Prepares deployment package                                │
│  ↓                                                           │
│  Connects to local server via SSH                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ SSH (port 2973)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         Your Local Server (203.0.113.2:2973)                │
│  Receives files via SCP                                     │
│  ↓                                                           │
│  Runs deployment script                                     │
│  ↓                                                           │
│  Restarts backend service                                   │
│  ↓                                                           │
│  Site goes live at https://data.speed4you.net/portal/       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

Edit `local-deploy-webhook.js`:

```javascript
const PORT = 3000;                    // Webhook port
const WEBHOOK_SECRET = 'your-secret'; // GitHub webhook secret
const SSH_HOST = '203.0.113.2';       // Your server IP
const SSH_PORT = 2973;                // Your SSH port
const SSH_USER = 'speed4you';         // SSH username
const SSH_KEY = './deploy_key';       // SSH key path
```

---

## 🚀 Keep Listener Running

### Option A: Background Process

**Windows (PowerShell):**
```powershell
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "local-deploy-webhook.js"
```

**Linux/macOS:**
```bash
nohup node local-deploy-webhook.js > webhook.log 2>&1 &
```

### Option B: System Service

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: At startup
4. Action: Start `node local-deploy-webhook.js`

**Linux (systemd):**
```bash
sudo nano /etc/systemd/system/github-webhook.service
```

Add:
```ini
[Unit]
Description=GitHub Webhook Listener
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/speed4you-portal
ExecStart=/usr/bin/node local-deploy-webhook.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable github-webhook
sudo systemctl start github-webhook
```

---

## 🔐 Security

### For Local Network Only:
- Webhook listener only accessible from your network
- Use strong webhook secret
- SSH key authentication

### For Internet Access:
- Setup reverse proxy with HTTPS (nginx/Apache)
- Use firewall rules
- Consider VPN for remote access

---

## 🆘 Troubleshooting

### Webhook not triggering?
```bash
# Check if listener is running
netstat -an | grep 3000

# Check GitHub webhook delivery logs
# Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/hooks
# Click webhook → Recent Deliveries
```

### Deployment fails?
```bash
# Check listener logs
tail -f webhook.log

# Test SSH manually
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"

# Check server logs
ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "tail -f /var/log/syslog"
```

### Port 3000 already in use?
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

---

## 📋 Checklist

- [ ] Found your local IP (e.g., 192.168.1.100)
- [ ] Started webhook listener: `node local-deploy-webhook.js`
- [ ] Added webhook to GitHub repository
- [ ] Set webhook secret in script
- [ ] Tested SSH connection to server
- [ ] Made test push to main branch
- [ ] Verified deployment in webhook logs
- [ ] Setup listener to run on startup

---

## 🎯 Alternative: Self-Hosted Runner

If you prefer GitHub Actions to run locally:

See: `SETUP_SELF_HOSTED_RUNNER.md`

Benefits:
- Full GitHub Actions features
- Better for complex workflows
- More robust

---

## ✨ Once Setup:

Every push to main will:
1. Trigger webhook listener
2. Build frontend
3. Deploy to local server
4. Site goes live!

**No manual deployment needed!** 🚀

---

## 📞 Need Help?

1. Check webhook listener console
2. Check GitHub webhook delivery logs
3. Test SSH connection manually
4. Review troubleshooting section above

---

**Status**: ✅ Ready for Local Network Deployment

Start with: `node local-deploy-webhook.js`
