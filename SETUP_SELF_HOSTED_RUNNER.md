# 🚀 Setup GitHub Actions Self-Hosted Runner

Since your server is on a local network, GitHub Actions (cloud) cannot directly access it. 

**Solution**: Setup a Self-Hosted Runner on your local network that will:
- Listen for GitHub push events
- Run deployment jobs locally
- Deploy to your server automatically

---

## 📋 Prerequisites:

- Your local machine or server with internet access
- GitHub account with repository access
- Node.js installed (optional, but recommended)

---

## 🔧 Setup Steps:

### Step 1: Go to GitHub Repository Settings

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**

### Step 2: Download Runner

Choose your OS:
- **Windows**: Download the Windows runner
- **Linux**: Download the Linux runner
- **macOS**: Download the macOS runner

### Step 3: Extract and Configure

**On Windows:**
```powershell
# Extract the downloaded file
Expand-Archive -Path actions-runner-win-x64-2.320.0.zip -DestinationPath C:\actions-runner

# Navigate to the directory
cd C:\actions-runner

# Configure the runner
.\config.cmd --url https://github.com/jonyspeednet-alt/speed4you-portal --token YOUR_TOKEN_HERE
```

**On Linux/macOS:**
```bash
# Extract the downloaded file
tar xzf actions-runner-linux-x64-2.320.0.tar.gz

# Navigate to the directory
cd actions-runner

# Configure the runner
./config.sh --url https://github.com/jonyspeednet-alt/speed4you-portal --token YOUR_TOKEN_HERE
```

### Step 4: Run the Runner

**On Windows:**
```powershell
.\run.cmd
```

**On Linux/macOS:**
```bash
./run.sh
```

### Step 5: Keep Runner Running

**Option A - Run as Service (Recommended):**

**Windows:**
```powershell
.\config.cmd --url https://github.com/jonyspeednet-alt/speed4you-portal --token YOUR_TOKEN_HERE --svc
.\svc.cmd install
.\svc.cmd start
```

**Linux:**
```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

**Option B - Run in Background:**

**Windows (PowerShell):**
```powershell
Start-Process -NoNewWindow -FilePath ".\run.cmd"
```

**Linux/macOS:**
```bash
nohup ./run.sh &
```

---

## ✅ Verify Runner is Connected

1. Go to: https://github.com/jonyspeednet-alt/speed4you-portal/settings/actions/runners
2. You should see your runner listed as **Idle** (green)

---

## 🔄 Update Workflow to Use Self-Hosted Runner

Update `.github/workflows/deploy.yml`:

Change this:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
```

To this:
```yaml
jobs:
  deploy:
    runs-on: self-hosted
```

---

## 🎯 How It Works:

```
1. You push to main branch
   ↓
2. GitHub sends webhook to your runner
   ↓
3. Self-hosted runner receives the event
   ↓
4. Runner executes the workflow locally
   ↓
5. Runner connects to your local server (203.0.113.2:2973)
   ↓
6. Deployment happens!
   ↓
7. Site goes live at https://data.speed4you.net/portal/
```

---

## 🆘 Troubleshooting:

### Runner not showing up?
- Check internet connection
- Verify token is correct
- Check firewall settings

### Runner shows offline?
- Restart the runner
- Check logs in the runner directory
- Verify GitHub token hasn't expired

### Deployment still fails?
- Check runner logs
- Verify SSH key is on your local machine
- Check server connectivity from your local machine

---

## 📝 Alternative: Simple Webhook Script

If you prefer a simpler approach without self-hosted runner, I can create a webhook listener script that:
- Listens for GitHub push events
- Triggers local deployment script
- Runs on your local machine

Let me know if you want this instead!

---

## 🚀 Next Steps:

1. Download the self-hosted runner from GitHub
2. Configure it with your repository token
3. Run it on your local machine
4. Update the workflow to use `runs-on: self-hosted`
5. Push to main and watch it deploy!

---

**Status**: Ready for Self-Hosted Runner Setup
