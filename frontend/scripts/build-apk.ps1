$ErrorActionPreference = "Stop"
$env:VITE_API_URL = "https://speed4you.net/portal-api"
$env:VITE_LOCAL_API_URL = "http://10.45.45.254/portal-api"

Write-Host "=== Building frontend for Android ==="
npm run build

Write-Host "=== Syncing with Capacitor ==="
npx cap sync

Write-Host "=== Building APK ==="
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Speed Net IT\AppData\Local\Android\Sdk"

Set-Location -LiteralPath (Join-Path $PSScriptRoot "..\android")
& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

$apkSource = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = Join-Path $PSScriptRoot "..\apk\speed4you-portal.apk"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "..\apk") -Force | Out-Null
Copy-Item -Path $apkSource -Destination $apkDest -Force

$size = (Get-Item $apkDest).Length
Write-Host "APK built: $apkDest ($([math]::Round($size/1MB, 1)) MB)"

# Also copy to public/ so the website serves the latest APK
$publicApkDest = Join-Path $PSScriptRoot "..\public\speed4you.apk"
Copy-Item -Path $apkSource -Destination $publicApkDest -Force
Write-Host "APK copied to public/: $publicApkDest"

Set-Location -LiteralPath (Join-Path $PSScriptRoot "..")
