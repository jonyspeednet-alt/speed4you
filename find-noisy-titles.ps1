param()

$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $loginResp.token
$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
Write-Host "Logged in."

# Fetch all published content and find matched items with noisy titles
$noisyItems = @()
$page = 1
$pageSize = 100
$total = 0

do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $headers
    if ($page -eq 1) { $total = $list.total; Write-Host "Total published: $total" }

    foreach ($item in $list.items) {
        if ($item.metadataStatus -eq 'matched') {
            $t = $item.title
            # Detect noisy titles: contain resolution/codec/format patterns
            $isNoisy = $t -match '\b(480p|720p|1080p|2160p|4k|WEBRip|BluRay|x264|x265|HEVC|HDRip|WEB-DL|BDRip)\b' -or
                       $t -match '\[(Dual Audio|Hindi|English|Multi)\]' -or
                       $t -match '\b(S\d{2}E\d{2}|Season \d)\b' -or
                       $t -match '\b(HDTV|DVDRip|CAM|TS|TC)\b' -or
                       $t -match '\-=!' -or
                       ($t.Length -gt 80 -and $t -match '\(')

            if ($isNoisy) {
                $noisyItems += [PSCustomObject]@{
                    id           = $item.id
                    title        = $t
                    tmdbId       = $item.tmdbId
                    confidence   = $item.metadataConfidence
                    originalTitle= $item.originalTitle
                }
            }
        }
    }
    $page++
    $fetched = ($page - 1) * $pageSize
    Write-Host "  Scanned page $($page-1) ($fetched / $total)..."
} while ($fetched -lt $total -and $page -le 100)

Write-Host ""
Write-Host "=== Items with matched metadata but noisy titles: $($noisyItems.Count) ==="
$noisyItems | Select-Object -First 20 | ForEach-Object {
    Write-Host ""
    Write-Host "  [$($_.id)] $($_.title)"
    Write-Host "    tmdbId=$($_.tmdbId)  confidence=$($_.confidence)  originalTitle=$($_.originalTitle)"
}

# Save to file for the fix script
$noisyItems | Export-Csv -Path "noisy-titles.csv" -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "Saved $($noisyItems.Count) items to noisy-titles.csv"
