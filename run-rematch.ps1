$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $login.token
Write-Host "Logged in successfully."

$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

Write-Host "Calling /metadata/rematch endpoint (this may take a few minutes)..."
$reqBody = [System.Text.Encoding]::UTF8.GetBytes('{"batchSize":5}')
$result = Invoke-RestMethod -Uri "$BASE/admin/metadata/rematch" -Method POST -Headers $headers -Body $reqBody -TimeoutSec 600

Write-Host ""
Write-Host "=== Rematch Complete ===" -ForegroundColor Cyan
Write-Host "Total items processed : $($result.total)"
Write-Host "Successfully matched  : $($result.matched)"
Write-Host "Failed                : $($result.failed)"
Write-Host "Dry Run               : $($result.dryRun)"

if ($result.errors -and $result.errors.Count -gt 0) {
    Write-Host ""
    Write-Host "--- Errors (first 50) ---" -ForegroundColor Yellow
    foreach ($e in $result.errors) {
        Write-Host "  ID $($e.id): $($e.error)" -ForegroundColor Red
    }
}
