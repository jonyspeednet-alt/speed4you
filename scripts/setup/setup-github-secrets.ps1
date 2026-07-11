# GitHub Secrets Setup Script
# এই script run করার আগে GitHub CLI install করুন: https://cli.github.com/
#
# IMPORTANT: This script does NOT contain any hardcoded ***REMOVED***s.
# You will be prompted to enter each value, or read from environment variables.

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Please install it first: https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check if authenticated
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not authenticated with GitHub. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "Setting up GitHub Secrets..." -ForegroundColor Green

# Get the repository
$repo = gh repo view --json nameWithOwner -q

Write-Host "Repository: $repo" -ForegroundColor Cyan

# Set ***REMOVED***s
Write-Host "`nAdding ***REMOVED***s..." -ForegroundColor Yellow

# 1. DEPLOY_HOST
$deployHost = if ($env:DEPLOY_HOST) { $env:DEPLOY_HOST } else { Read-Host "Enter DEPLOY_HOST (e.g., ***REMOVED***)" }
gh ***REMOVED*** set DEPLOY_HOST --body "$deployHost" --repo $repo
Write-Host "DEPLOY_HOST set"

# 2. DEPLOY_PORT
$deployPort = if ($env:DEPLOY_PORT) { $env:DEPLOY_PORT } else { Read-Host "Enter DEPLOY_PORT (e.g., 2973)" }
gh ***REMOVED*** set DEPLOY_PORT --body "$deployPort" --repo $repo
Write-Host "DEPLOY_PORT set"

# 3. DEPLOY_USER
$deployUser = if ($env:DEPLOY_USER) { $env:DEPLOY_USER } else { Read-Host "Enter DEPLOY_USER (e.g., speed4you)" }
gh ***REMOVED*** set DEPLOY_USER --body "$deployUser" --repo $repo
Write-Host "DEPLOY_USER set"

# 4. DEPLOY_SSH_KEY - Must be provided as file path or env var
Write-Host "`nIMPORTANT: DEPLOY_SSH_KEY must be set from a file, NOT hardcoded." -ForegroundColor Yellow
$sshKeyPath = if ($env:DEPLOY_SSH_KEY_PATH) { $env:DEPLOY_SSH_KEY_PATH } else { Read-Host "Enter path to SSH private key file" }
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "SSH key file not found: $sshKeyPath" -ForegroundColor Red
    exit 1
}
$sshKey = Get-Content -Raw $sshKeyPath
gh ***REMOVED*** set DEPLOY_SSH_KEY --body $sshKey --repo $repo
Write-Host "DEPLOY_SSH_KEY set"

# 5. DEPLOY_SUDO_PASSWORD
Write-Host "`nIMPORTANT: Do not reuse ***REMOVED***s from other services." -ForegroundColor Yellow
$sudoPassword = if ($env:DEPLOY_SUDO_PASSWORD) { $env:DEPLOY_SUDO_PASSWORD } else { Read-Host "Enter DEPLOY_SUDO_PASSWORD" -AsSecureString }
if ($sudoPassword -is [System.Security.SecureString]) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sudoPassword)
    $sudoPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}
gh ***REMOVED*** set DEPLOY_SUDO_PASSWORD --body $sudoPassword --repo $repo
Write-Host "DEPLOY_SUDO_PASSWORD set"

# 6. DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS
$corsOrigins = if ($env:DEPLOY_CORS_ORIGINS) { $env:DEPLOY_CORS_ORIGINS } else { Read-Host "Enter CORS allowed origins (comma-separated)" }
gh ***REMOVED*** set DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS --body "$corsOrigins" --repo $repo
Write-Host "DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS set"

# 7. DEPLOY_REMOTE_PLAYER_CACHE_ROOT
$cacheRoot = if ($env:DEPLOY_CACHE_ROOT) { $env:DEPLOY_CACHE_ROOT } else { Read-Host "Enter player cache root path" }
gh ***REMOVED*** set DEPLOY_REMOTE_PLAYER_CACHE_ROOT --body "$cacheRoot" --repo $repo
Write-Host "DEPLOY_REMOTE_PLAYER_CACHE_ROOT set"

# 8. DEPLOY_ENV_FILE_CONTENT
Write-Host "`nDEPLOY_ENV_FILE_CONTENT needs to be set manually" -ForegroundColor Yellow
Write-Host "This should contain your backend .env file content" -ForegroundColor Yellow
Write-Host "Go to: https://github.com/$repo/settings/***REMOVED***s/actions" -ForegroundColor Cyan
Write-Host "And add DEPLOY_ENV_FILE_CONTENT with your .env content" -ForegroundColor Cyan

Write-Host "`nGitHub Secrets setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Add DEPLOY_ENV_FILE_CONTENT manually (contains sensitive data)"
Write-Host "2. On your server, run the SSH key setup:"
Write-Host "   mkdir -p ~/.ssh && chmod 700 ~/.ssh"
Write-Host "   cat >> ~/.ssh/authorized_keys << 'EOF'"
Write-Host "   ssh-ed25519 YOUR_PUBLIC_KEY_HERE isp-entertainment-deploy"
Write-Host "   EOF"
Write-Host "   chmod 600 ~/.ssh/authorized_keys"
Write-Host "3. Create deployment directories on server:"
Write-Host "   mkdir -p /home/speed4you/portal-deploy-staging"
Write-Host "   mkdir -p /home/speed4you/backups"
Write-Host "   mkdir -p /var/www/html/Extra_Storage/portal-media-cache"

Write-Host "`nThen push to main branch to trigger deployment!"
