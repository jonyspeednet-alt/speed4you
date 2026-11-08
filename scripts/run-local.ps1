# scripts/run-local.ps1
$ErrorActionPreference = 'Continue'

$BackendPort = 3001
$FrontendPort = 4173
$DBPort = 5433

function Kill-PortProcess($Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if ($connections) {
    $uniquePids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $uniquePids) {
      $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -ne 'powershell') {
        Write-Host "Cleaning process $p on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

# 1. Clean up ports
Write-Host "Cleaning up ports $BackendPort, $FrontendPort, and $DBPort..." -ForegroundColor Cyan
Kill-PortProcess $BackendPort
Kill-PortProcess $FrontendPort
Kill-PortProcess $DBPort

# 2. Start SSH Tunnel to Database via OpenSSH
Write-Host "Establishing SSH Tunnel to Database (speed4you-server 127.0.0.1:5432 -> 127.0.0.1:$DBPort)..." -ForegroundColor Cyan
$tunnelJob = Start-Job -ScriptBlock {
  ssh -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 5433:127.0.0.1:5432 speed4you-server
}

# Wait up to 5 seconds for tunnel port to listen
$tunnelReady = $false
for ($i = 0; $i -lt 5; $i++) {
  Start-Sleep -Seconds 1
  $tunnel = Get-NetTCPConnection -LocalPort $DBPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
  if ($tunnel) {
    $tunnelReady = $true
    break
  }
}

if ($tunnelReady) {
  Write-Host "SSH Database Tunnel established on port $DBPort." -ForegroundColor Green
} else {
  Write-Host "SSH Tunnel not established (will run with in-memory dev database)." -ForegroundColor DarkYellow
}

# 3. Start Backend & Frontend
Write-Host "Starting Vite frontend and Node backend..." -ForegroundColor Cyan
$devProc = Start-Process npm.cmd -ArgumentList "run dev" -PassThru -NoNewWindow

# 4. Wait for frontend server
$url = "http://127.0.0.1:$FrontendPort"
Write-Host "Waiting for site to respond at $url ..." -ForegroundColor Yellow

$ready = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 2
  try {
    $resp = curl.exe -s -o /dev/null -w "%{http_code}" "$url/"
    if ($resp -eq "200") {
      $ready = $true
      break
    }
  } catch {}
  Write-Host "." -NoNewline
}

Write-Host ""
if ($ready) {
  Write-Host "Site is ready! Opening in browser: $url" -ForegroundColor Green
  Start-Process $url
} else {
  Write-Host "Opening browser at $url..." -ForegroundColor Yellow
  Start-Process $url
}

Write-Host ""
Write-Host "Local dev server is running. Press Ctrl+C to stop." -ForegroundColor Cyan

try {
  if ($devProc) {
    $devProc.WaitForExit()
  }
} finally {
  Write-Host "Shutting down..." -ForegroundColor Yellow
  if ($tunnelJob) {
    Stop-Job $tunnelJob -ErrorAction SilentlyContinue
    Remove-Job $tunnelJob -Force -ErrorAction SilentlyContinue
  }
  Kill-PortProcess $BackendPort
  Kill-PortProcess $FrontendPort
  Kill-PortProcess $DBPort
}
