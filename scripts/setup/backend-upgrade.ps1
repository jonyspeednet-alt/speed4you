# Backend Upgrade Script - ISP Entertainment Portal (PowerShell)
# Usage: .\backend-upgrade.ps1

param(
    [switch]$SkipTests = $false,
    [switch]$SkipAudit = $false
)

# Colors
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error-Custom { Write-Host "✗ $args" -ForegroundColor Red }
function Write-Header { Write-Host "================================" -ForegroundColor Cyan; Write-Host $args -ForegroundColor Cyan; Write-Host "================================" -ForegroundColor Cyan }

# Main process
function Start-BackendUpgrade {
    Write-Header "Backend Upgrade - ISP Entertainment Portal"
    
    # Check backend directory
    if (-not (Test-Path "backend")) {
        Write-Error-Custom "backend directory not found!"
        exit 1
    }
    
    Push-Location backend
    
    try {
        # Step 1: Backup
        Write-Header "Step 1: Backing up current state"
        if (Test-Path "package-lock.json") {
            Copy-Item "package-lock.json" "package-lock.json.backup"
            Write-Success "Backed up package-lock.json"
        } else {
            Write-Warning "No package-lock.json found"
        }
        
        # Step 2: Update dependencies
        Write-Header "Step 2: Updating dependencies"
        
        Write-Host "Updating production dependencies..."
        & npm install `
            "express@^4.21.2" `
            "dotenv@^17.4.2" `
            "helmet@^8.1.0" `
            "joi@^18.1.2" `
            "jsonwebtoken@^9.0.3" `
            --save
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to update production dependencies"
        }
        Write-Success "Production dependencies updated"
        
        Write-Host "Updating dev dependencies..."
        & npm install "nodemon@latest" --save-dev
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to update dev dependencies"
        }
        Write-Success "Dev dependencies updated"
        
        # Step 3: Security audit
        if (-not $SkipAudit) {
            Write-Header "Step 3: Checking for vulnerabilities"
            
            & npm audit
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "No vulnerabilities found"
            } else {
                Write-Warning "Some vulnerabilities detected"
            }
        }
        
        # Step 4: Tests
        if (-not $SkipTests) {
            Write-Header "Step 4: Running tests"
            
            & npm test
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "All tests passed"
            } else {
                Write-Warning "Some tests failed - review manually"
            }
        }
        
        # Step 5: Summary
        Write-Header "Summary"
        
        Write-Success "Backend upgrade completed!"
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Review changes: git status"
        Write-Host "2. Test locally: npm run dev"
        Write-Host "3. Run all tests: npm test"
        Write-Host "4. Create PR for review"
        Write-Host ""
        
        Write-Host "Installed versions:" -ForegroundColor Yellow
        & npm list --depth=0
        
    } catch {
        Write-Error-Custom "Upgrade failed: $_"
        exit 1
    } finally {
        Pop-Location
    }
}

# Run the upgrade
Start-BackendUpgrade
