$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $login.token
$headers = @{ "Authorization" = "Bearer $TOKEN" }

# Check a sample of previously not_found items
Write-Host "=== Spot-checking previously unmatched items ===" -ForegroundColor Cyan
$ids = @(4357, 4109, 3971, 2967, 2202)
foreach ($id in $ids) {
    $item = Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Headers $headers
    $color = if ($item.metadataStatus -eq 'matched') { 'Green' } else { 'Red' }
    Write-Host "  ID $id | Status: $($item.metadataStatus) | Title: $($item.title)" -ForegroundColor $color
}

# Count still-unmatched across all published items
Write-Host ""
Write-Host "=== Counting remaining unmatched items ===" -ForegroundColor Cyan
$page = 1
$pageSize = 100
$stillBad = 0
$totalPublished = 0
do {
    $url = "$BASE/admin/content?status=published&page=$page&limit=$pageSize"
    $list = Invoke-RestMethod -Uri $url -Headers $headers
    if ($page -eq 1) { $totalPublished = $list.total }
    $stillBad += ($list.items | Where-Object { $_.metadataStatus -ne 'matched' }).Count
    $page++
} while (($page - 1) * $pageSize -lt $totalPublished -and $page -le 100)

Write-Host "  Still unmatched : $stillBad"
Write-Host "  Total published : $totalPublished"
Write-Host "  Fully matched   : $($totalPublished - $stillBad)" -ForegroundColor Green
