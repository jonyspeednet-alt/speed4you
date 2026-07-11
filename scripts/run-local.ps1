# scripts/run-local.ps1
$BackendPort = 3001
$FrontendPort = 4173
$DBPort = 5432

# Read from environment or prompt
$RemoteHost = if ($env:DEPLOY_HOST) { $env:DEPLOY_HOST } else { Read-Host "Enter remote host (e.g., ***REMOVED***)" }
$RemoteSSHPort = if ($env:DEPLOY_PORT) { $env:DEPLOY_PORT } else { Read-Host "Enter SSH port (e.g., 2973)" }
$SSHKeyPath = if ($env:DEPLOY_SSH_KEY_PATH) { $env:DEPLOY_SSH_KEY_PATH } else { Read-Host "Enter path to SSH private key" }

function Kill-PortProcess($Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if ($connections) {
    $uniquePids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $uniquePids) {
      $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -ne 'powershell') {
        Write-Host "Killing existing process $p on port $Port..."
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

# 1. Check/Start SSH Tunnel
Write-Host "Checking SSH Tunnel to Production Database..." -ForegroundColor Cyan
$tunnel = Get-NetTCPConnection -LocalPort $DBPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if (-not $tunnel) {
  Write-Host "Starting SSH Tunnel via plink..." -ForegroundColor Yellow
  Start-Process plink -ArgumentList "-hostkey 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL+eak04klnhd45aow1QDKLZO990Z7fdUmtAvPnO8mAf' -P $RemoteSSHPort -i `"$SSHKeyPath`" -L $DBPort:localhost:$DBPort -N speed4you@$RemoteHost" -WindowStyle Hidden
  Start-Sleep -Seconds 3
} else {
  Write-Host "SSH Tunnel is already running." -ForegroundColor Green
}

# 2. Kill existing processes
Write-Host "Cleaning up ports $BackendPort and $FrontendPort..." -ForegroundColor Cyan
Kill-PortProcess $BackendPort
Kill-PortProcess $FrontendPort

# 3. Start Backend and Frontend in Dev Mode
Write-Host "Starting Portal in Development Mode..." -ForegroundColor Cyan
Start-Process npm.cmd -ArgumentList "run dev" -NoNewWindow
Write-Host "Waiting for portal to initialize..." -ForegroundColor Yellow

# 4. Wait for frontend and open browser
$maxRetries = 30
$retryCount = 0
$url = "http://localhost:$FrontendPort"

while ($retryCount -lt $maxRetries) {
  try {
    $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
      Write-Host "Portal is ready! Opening browser..." -ForegroundColor Green
      Start-Process $url
      break
    }
  } catch {
    # Still starting
  }
  $retryCount++
  Start-Sleep -Seconds 2
}

if ($retryCount -eq $maxRetries) {
  Write-Host "Portal taking longer than expected. Please visit $url manually." -ForegroundColor Red
}
