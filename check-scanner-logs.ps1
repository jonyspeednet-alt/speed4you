param(
  [switch]$Help
)

if ($Help) {
  @"
Usage: .\check-scanner-logs.ps1

Checks scanner logs and state on the remote server via SSH deploy key.
"@
  exit
}

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot

# --- Load deploy config ---
$envFile = Join-Path $scriptDir '.env.deploy'
if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Error ".env.deploy not found at $envFile"
  exit 1
}

$config = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#')) {
    $eq = $line.IndexOf('=')
    if ($eq -gt 0) {
      $config[$line.Substring(0, $eq).Trim()] = $line.Substring($eq + 1).Trim()
    }
  }
}

$ssh       = 'ssh.exe'
$keyFile   = Join-Path $scriptDir 'deploy_key'
$hostAddr  = $config['DEPLOY_HOST']
$port      = $config['DEPLOY_PORT']
$user      = $config['DEPLOY_USER']
$backendPath = $config['DEPLOY_REMOTE_BACKEND_PATH']

if (-not $hostAddr -or -not $user) {
  Write-Error "Missing required SSH config in .env.deploy"
  exit 1
}

$sshArgs = @(
  '-i', $keyFile
  '-p', $port
  '-o', 'StrictHostKeyChecking=accept-new'
  '-o', 'BatchMode=yes'
  '-o', 'ConnectTimeout=15'
  "$user@$hostAddr"
)

function Run-Remote {
  param([string]$Command)
  $output = & $ssh @sshArgs $Command 2>&1
  if ($LASTEXITCODE -ne 0) { throw "SSH command failed (exit $LASTEXITCODE)" }
  return $output
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Scanner Log Check: $hostAddr" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- 1. Scanner JSON state files ---
Write-Host "--- 1. Scanner JSON State Files ---" -ForegroundColor Yellow
$scannerFiles = @('scanner-log.json', 'scanner-roots.json', 'scanner-runtime.json', 'scanner-state.json')
foreach ($f in $scannerFiles) {
  $path = "$backendPath/src/data/$f"
  try {
    $result = Run-Remote "if [ -f '$path' ]; then echo 'EXISTS'; wc -c < '$path'; cat '$path'; else echo 'NOT_FOUND'; fi"
    $lines = $result -split "`n"
    if ($lines[0] -eq 'EXISTS') {
      $size = $lines[1]
      $json = $lines[2..$($lines.Length-1)] -join "`n"
      Write-Host "`n  $f ($size bytes):" -ForegroundColor Green
      # Pretty-print if valid JSON
      try { $json | ConvertFrom-Json | ConvertTo-Json -Depth 10 } catch { Write-Host $json }
    } else {
      Write-Host "`n  $f : NOT FOUND" -ForegroundColor Red
    }
  } catch {
    Write-Host "`n  $f : ERROR - $_" -ForegroundColor Red
  }
}

# --- 2. Scanner events from server logs ---
Write-Host "`n--- 2. Server Log: [scanner] events (last 30) ---" -ForegroundColor Yellow
try {
  $serverLog = "$backendPath/server.log"
  $errLog = "$backendPath/server.err.log"
  $result = Run-Remote @"
echo '=== server.log ==='
if [ -f '$serverLog' ]; then grep -i '\[scanner\]' '$serverLog' | tail -30; else echo '(no server.log)'; fi
echo ''
echo '=== server.err.log ==='
if [ -f '$errLog' ]; then grep -i '\[scanner\]' '$errLog' | tail -30; else echo '(no server.err.log)'; fi
echo ''
echo '=== server.log tail (20) ==='
if [ -f '$serverLog' ]; then tail -20 '$serverLog'; fi
echo ''
echo '=== server.err.log tail (20) ==='
if [ -f '$errLog' ]; then tail -20 '$errLog'; fi
"@
  Write-Host $result
} catch {
  Write-Host "  ERROR: $_" -ForegroundColor Red
}

# --- 3. PostgreSQL scanner_runs table ---
Write-Host "`n--- 3. PostgreSQL: Last 5 Scanner Runs ---" -ForegroundColor Yellow
try {
  $result = Run-Remote @"
if command -v psql >/dev/null 2>&1; then
  psql -d isp_entertainment -c "\x on" 2>/dev/null && psql -d isp_entertainment -c "SELECT id, status, started_at, completed_at, roots_requested, roots_scanned, total_created, total_updated, total_deleted, total_unchanged, total_duplicate_drafts, error FROM scanner_runs ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo '(psql connected but query failed)'
else
  echo '(psql not found)'
fi
"@
  Write-Host $result
} catch {
  Write-Host "  ERROR: $_" -ForegroundColor Red
}

# --- 4. PostgreSQL scanner_runtime (current job) ---
Write-Host "`n--- 4. PostgreSQL: Current Scanner Runtime ---" -ForegroundColor Yellow
try {
  $result = Run-Remote @"
if command -v psql >/dev/null 2>&1; then
  psql -d isp_entertainment -t -A -c "SELECT value FROM app_state WHERE key='scanner_runtime';" 2>/dev/null || echo '(query failed)'
else
  echo '(psql not found)'
fi
"@
  if ($result -and $result -notlike '(psql*') {
    try { $result | ConvertFrom-Json | ConvertTo-Json -Depth 10 } catch { Write-Host $result }
  } else {
    Write-Host $result
  }
} catch {
  Write-Host "  ERROR: $_" -ForegroundColor Red
}

# --- 5. Scanner roots ---
Write-Host "`n--- 5. PostgreSQL: Scanner Roots ---" -ForegroundColor Yellow
try {
  $result = Run-Remote @"
if command -v psql >/dev/null 2>&1; then
  psql -d isp_entertainment -c "SELECT id, label, type, language, category, scan_path, enabled, discovered FROM scanner_roots ORDER BY label;" 2>/dev/null || echo '(query failed)'
else
  echo '(psql not found)'
fi
"@
  Write-Host $result
} catch {
  Write-Host "  ERROR: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Check Complete" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
