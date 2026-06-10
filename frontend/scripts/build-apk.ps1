$ErrorActionPreference = "Stop"
$env:VITE_API_URL = "https://speed4you.net/portal-api"

Write-Host "=== Building frontend for Android ==="
npm run build

Write-Host "=== Syncing with Capacitor ==="
npx cap sync

Write-Host "=== Building APK ==="
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$androidHome = "C:\Users\Speed Net IT\AppData\Local\Android\Sdk"

Set-Location -LiteralPath (Join-Path $PSScriptRoot "..\android")
& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

$apkSource = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = Join-Path $PSScriptRoot "..\apk\speed4you-portal.apk"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "..\apk") -Force | Out-Null
Copy-Item -Path $apkSource -Destination $apkDest -Force

$size = (Get-Item $apkDest).Length
Write-Host "APK built: $apkDest ($([math]::Round($size/1MB, 1)) MB)"
Set-Location -LiteralPath (Join-Path $PSScriptRoot "..")
