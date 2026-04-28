# Helper script to generate GitHub secrets commands

function Import-EnvFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith('#')) {
            $parts = $line.Split('=', 2)
            if ($parts.Length -eq 2) {
                $name = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"').Trim("'")
                if (-not $env:$name) {
                    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
                }
            }
        }
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$configLoaded = $false
$envFilePath = $null

$candidatePaths = @(
  (Join-Path $projectRoot '.env.deploy.local'),
  (Join-Path $projectRoot '.env.deploy'),
  (Join-Path $projectRoot 'backend\.env.deploy'),
  (Join-Path $projectRoot 'backend\.env.deploy.local')
)

foreach ($path in $candidatePaths) {
    if (Test-Path $path) {
        Write-Host "Loading credentials from $path"
        $envFilePath = $path
        Import-EnvFile -Path $path
        $configLoaded = $true
        break
    }
}

if (-not $configLoaded) {
    Write-Warning "Could not find a .env deploy file. Credentials must be set as local environment variables."
}

$requiredVars = @(
    'DEPLOY_HOST',
    'DEPLOY_USER',
    'DEPLOY_PASSWORD',
    'DEPLOY_SUDO_PASSWORD',
    'DEPLOY_REMOTE_BACKEND_PATH',
    'DEPLOY_REMOTE_FRONTEND_PATH',
    'DEPLOY_REMOTE_CORS_ALLOWED_ORIGINS',
    'DEPLOY_REMOTE_PLAYER_CACHE_ROOT',
    'DEPLOY_HOST_KEY'
)
$optionalVars = @{ 'DEPLOY_PORT' = '22' }

$secrets = @{}
$missingVars = $false

foreach ($varName in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($varName)
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Error "Required credential '$varName' is not set. Cannot generate commands."
        $missingVars = $true
    } else {
        $secrets[$varName] = $value
    }
}

if ($missingVars) {
    Write-Error "Please set the missing variables and run the script again."
    exit 1
}

foreach ($varName in $optionalVars.Keys) {
    $value = [Environment]::GetEnvironmentVariable($varName)
    if ([string]::IsNullOrWhiteSpace($value)) {
        $secrets[$varName] = $optionalVars[$varName]
    } else {
        $secrets[$varName] = $value
    }
}

Write-Host "`n[32m--- GitHub CLI Commands to Set All Secrets ---[0m"
Write-Host "[33mRun the following commands in a terminal where GitHub CLI is installed.[0m"

$commandParts = @()
foreach ($key in $secrets.Keys) {
    $commandParts += "gh secret set $($key) --body `"$($secrets[$key])`""
}

if ($envFilePath) {
    $commandParts += "gh secret set DEPLOY_ENV_FILE_CONTENT --body `"$([System.IO.File]::ReadAllText($envFilePath))`""
} else {
    Write-Warning "Cannot set DEPLOY_ENV_FILE_CONTENT as no .env file was found."
}

$fullCommand = $commandParts -join " && `n"
Write-Output $fullCommand

