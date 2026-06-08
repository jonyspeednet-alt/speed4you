$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $loginResp.token
$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# Fetch all published content and find non-matched items
$unmatchedItems = @()
$page = 1
$pageSize = 100
$total = 0

do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $headers
    if ($page -eq 1) { 
        $total = $list.total
        Write-Host "Total published: $total" 
    }

    foreach ($item in $list.items) {
        $status = $item.metadataStatus
        if ($status -ne 'matched') {
            $unmatchedItems += [PSCustomObject]@{
                id            = $item.id
                title         = $item.title
                type          = $item.type
                status        = $status
                tmdbId        = $item.tmdbId
                confidence    = $item.metadataConfidence
            }
        }
    }
    $page++
    $fetched = ($page - 1) * $pageSize
} while ($fetched -lt $total -and $page -le 100)

Write-Host ""
Write-Host "=== Found $($unmatchedItems.Count) unmatched items ==="
$unmatchedItems | Group-Object status | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) items"
}

Write-Host ""
Write-Host "Sample unmatched items (first 40):"
$unmatchedItems | Select-Object -First 40 | ForEach-Object {
    Write-Host "  [$($_.id)] ($($_.status)) $($_.title)"
}

# Save to CSV
$unmatchedItems | Export-Csv -Path "unmatched-items.csv" -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "Saved all unmatched items to unmatched-items.csv"
