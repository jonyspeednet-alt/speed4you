# 🏠 Local Network Deployment Setup

Since your server is on a local network (203.0.113.2:2973), GitHub Actions cannot reach it directly.

**Solution**: Use a local webhook listener that triggers deployment when you push to GitHub.

---

## 🎯 How It Works:

```
1. You push to main branch
   ↓
2. GitHub sends webhook to your local machine
   ↓
3. Local webhook listener receives the event
   ↓
4. Listener runs deployment script locally
   ↓
5. Script connects to your local server (203.0.113.2:2973)
   ↓
6. Deployment happens!
   ↓
7. Site goes live at https://data.speed4you.net/portal/
```

---

## 📋 Two Options:

### Option 1: Self-Hosted Runner (Recommended for production)
- More robust and feature-rich
- Runs full GitHub Actions workflows locally
- Better for complex deployments
- See: `SETUP_SELF_HOSTED_RUNNER.md`

### Option 2: Webhook Listener (Simple and lightweight)
- Lightweight and easy to setup
- Perfect for simple deployments
- Runs on your local machine
- See below for setup

---

## 🚀 Option 2: Quick Webhook Setup

### Step 1: Find Your Local IP

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" (usually 192.168.x.x or 10.x.x.x)
```

**Linux/macOS:**
```bash
ifconfig
# or
hostname -I
```

Example: `192.168.1.100`

### Step 2: Setup Port Forwarding (if needed)

If your router blocks incoming connections:
1. Go to router settings (usually 192.168.1.1)
2. Setup port forwarding: External port 3000 → Internal IP:3000
3. Note your public IP from: https://whatismyipaddress.com

### Step 3: Start Webhook Listener

**Windows:**
```powershell
node local-deploy-webhook.js
```

**Linux/macOS:**
```bash
node local-deploy-webhook.js
```

You should see:
```
✅ Webhook listener started on port 3000
📍 Webhook URL: http://your-local-ip:3000/webhook
🔄 Listening for GitHub push events on main branch...
```

### Step 4: Add Webhook to GitHub

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/hooks
2. Click **Add webhook**
3. Fill in:
   - **Payload URL**: `http://your-local-ip:3000/webhook`
   - **Content type**: `application/json`
   - **Secret**: `your-webhook-secret-here` (update in script)
   - **Events**: Select "Push events"
   - **Active**: ✅ Checked

4. Click **Add webhook**

### Step 5: Test Webhook

Make a small change and push:
```bash
git add .
git commit -m "Test webhook deployment"
git push origin main
```

Watch your webhook listener console - you should see deployment logs!

---

## 🔧 Configuration

Edit `local-deploy-webhook.js` to customize:

```javascript
const PORT = 3000;                    // Webhook port
const WEBHOOK_SECRET = 'your-secret'; // Must match GitHub webhook secret
const SSH_HOST = '203.0.113.2';       // Your server IP
const SSH_PORT = 2973;                // Your SSH port
const SSH_USER = 'speed4you';         // SSH username
const SSH_KEY = './deploy_key';       // Path to SSH key
```

---

## 🔐 Security Notes:

1. **Use HTTPS in production**: Setup reverse proxy with SSL
2. **Webhook Secret**: Use a strong, random secret
3. **Firewall**: Only allow GitHub's IP ranges if possible
4. **SSH Key**: Keep deploy_key secure and never commit it

---

## 🆘 Troubleshooting:

### Webhook not triggering?
- Check if listener is running
- Verify webhook URL is correct
- Check GitHub webhook delivery logs
- Ensure port 3000 is open

### Deployment fails?
- Check listener console logs
- Verify SSH key is correct
- Test SSH connection manually:
  ```bash
  ssh -i deploy_key -p 2973 speed4you@203.0.113.2 "echo OK"
  ```

### Port already in use?
- Change PORT in script to 3001, 3002, etc.
- Or kill process using port 3000:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  
  # Linux/macOS
  lsof -i :3000
  kill -9 <PID>
  ```

---

## 🚀 Keep Listener Running

### Option A: Run in Background

**Windows (PowerShell):**
```powershell
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "local-deploy-webhook.js"
```

**Linux/macOS:**
```bash
nohup node local-deploy-webhook.js > webhook.log 2>&1 &
```

### Option B: Run as Service

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: At startup
4. Set action: Start program `node local-deploy-webhook.js`

**Linux (systemd):**
Create `/etc/systemd/system/github-webhook.service`:
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

## 📊 Workflow Update

The workflow file is already configured for local deployment. No changes needed!

---

## ✨ Next Steps:

1. Find your local IP
2. Start webhook listener: `node local-deploy-webhook.js`
3. Add webhook to GitHub
4. Test by pushing to main
5. Watch deployment happen!

---

## 🎉 Once Setup:

Every push to main will automatically:
1. Trigger webhook listener
2. Build frontend
3. Deploy to your local server
4. Site goes live!

**No manual deployment needed!** 🚀

---

**Status**: Ready for Local Deployment Setup
