$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$h = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }
Write-Host "Logged in." -ForegroundColor Green

$page = 1; $pageSize = 100; $total = 0
$lowConf = [System.Collections.ArrayList]::new()

do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $h
    if ($page -eq 1) { $total = $list.total }
    foreach ($item in $list.items) {
        if ($item.metadataStatus -eq 'matched' -and $item.metadataConfidence -lt 100) {
            [void]$lowConf.Add($item)
        }
    }
    $page++
} while (($page-1)*$pageSize -lt $total -and $page -le 100)

Write-Host "Total published : $total"
Write-Host "Low-confidence  : $($lowConf.Count) items (matched but < 100%)" -ForegroundColor Yellow
Write-Host ""

# Group by confidence level
$groups = $lowConf | Group-Object -Property metadataConfidence | Sort-Object Name
foreach ($g in $groups) {
    Write-Host "  Confidence $($g.Name)%: $($g.Count) items" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Sample of low-confidence items ===" -ForegroundColor Cyan
$lowConf | Select-Object -First 50 | ForEach-Object {
    Write-Host "  [$($_.id)] conf=$($_.metadataConfidence)%  stored='$($_.title)'  tmdb='$($_.originalTitle)'" -ForegroundColor Gray
}
