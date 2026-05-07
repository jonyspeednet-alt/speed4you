# GitHub Secrets Setup Script
# এই script run করার আগে GitHub CLI install করুন: https://cli.github.com/

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not found. Please install it first: https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check if authenticated
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with GitHub. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "🔐 Setting up GitHub Secrets..." -ForegroundColor Green

# Get the repository
$repo = gh repo view --json nameWithOwner -q

Write-Host "📦 Repository: $repo" -ForegroundColor Cyan

# Set ***REMOVED***s
Write-Host "`n📝 Adding ***REMOVED***s..." -ForegroundColor Yellow

# 1. DEPLOY_HOST
gh ***REMOVED*** set DEPLOY_HOST --body "***REMOVED***" --repo $repo
Write-Host "✅ DEPLOY_HOST set"

# 2. DEPLOY_PORT
gh ***REMOVED*** set DEPLOY_PORT --body "2973" --repo $repo
Write-Host "✅ DEPLOY_PORT set"

# 3. DEPLOY_USER
gh ***REMOVED*** set DEPLOY_USER --body "speed4you" --repo $repo
Write-Host "✅ DEPLOY_USER set"

# 4. DEPLOY_SSH_KEY
$sshKey = @"
***REMOVED***
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABAM3Jl+fC
hUViLkUGtgFO3KAAAAGAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIKJOmk9rXcDxfUS+
rUYAOfldhRPNDYLFEiiTwMa1AdKsAAAAoM2ASat6k+yN/Xf4+Iw/bCMKUBOg2hnRoJYlwd
MBmtxdzrQdx2/bZPvfNtEiHin+2A1illIBaylKKsultL7PV7RVtdTaBl4+Pqplxtk5EO/3
92YDpl4/qSkgYoTWgpBrFa86qlLDSz97fOGOTgVvwq72xrJU6LMghyJwxIuyuJm6uyUPF2
8dPrWtzlJ2zKF2/vYfWS98uznLNdSwdDZg1qc=
-----END OPENSSH PRIVATE KEY-----
"@
gh ***REMOVED*** set DEPLOY_SSH_KEY --body $sshKey --repo $repo
Write-Host "✅ DEPLOY_SSH_KEY set"

# 5. DEPLOY_SUDO_PASSWORD
gh ***REMOVED*** set DEPLOY_SUDO_PASSWORD --body "***REMOVED***" --repo $repo
Write-Host "✅ DEPLOY_SUDO_PASSWORD set"

# 6. DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS
gh ***REMOVED*** set DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS --body "https://data.speed4you.net" --repo $repo
Write-Host "✅ DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS set"

# 7. DEPLOY_REMOTE_PLAYER_CACHE_ROOT
gh ***REMOVED*** set DEPLOY_REMOTE_PLAYER_CACHE_ROOT --body "/var/www/html/Extra_Storage/portal-media-cache" --repo $repo

Write-Host "✅ DEPLOY_REMOTE_PLAYER_CACHE_ROOT set"

# 8. DEPLOY_ENV_FILE_CONTENT
Write-Host "`n⚠️  DEPLOY_ENV_FILE_CONTENT needs to be set manually" -ForegroundColor Yellow
Write-Host "This should contain your backend .env file content" -ForegroundColor Yellow
Write-Host "Go to: https://github.com/$repo/settings/***REMOVED***s/actions" -ForegroundColor Cyan
Write-Host "And add DEPLOY_ENV_FILE_CONTENT with your .env content" -ForegroundColor Cyan

Write-Host "`n✅ GitHub Secrets setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Add DEPLOY_ENV_FILE_CONTENT manually (contains sensitive data)"
Write-Host "2. On your server (***REMOVED***), run the SSH key setup:"
Write-Host "   mkdir -p ~/.ssh && chmod 700 ~/.ssh"
Write-Host "   cat >> ~/.ssh/authorized_keys << 'EOF'"
Write-Host "   ***REMOVED*** \isp-entertainment-deploy\"
Write-Host "   EOF"
Write-Host "   chmod 600 ~/.ssh/authorized_keys"
Write-Host "3. Create deployment directories on server:"
Write-Host "   mkdir -p /home/speed4you/portal-deploy-staging"
Write-Host "   mkdir -p /home/speed4you/backups"
Write-Host "   mkdir -p /var/www/html/Extra_Storage/portal-media-cache"

Write-Host "`n🚀 Then push to main branch to trigger deployment!"
