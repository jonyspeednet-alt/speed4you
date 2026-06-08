param(
    [int]$MinConf = 0,   # only process items with confidence >= this
    [int]$MaxConf = 99   # only process items with confidence <= this
)

$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$h = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }
Write-Host "Logged in." -ForegroundColor Green

# Collect all matched items with confidence in range
$page = 1; $pageSize = 100; $total = 0
$targets = [System.Collections.ArrayList]::new()

do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $h
    if ($page -eq 1) { $total = $list.total }
    foreach ($item in $list.items) {
        if ($item.metadataStatus -eq 'matched' `
            -and $item.metadataConfidence -ge $MinConf `
            -and $item.metadataConfidence -le $MaxConf `
            -and $item.tmdbId) {
            [void]$targets.Add($item)
        }
    }
    $page++
} while (($page-1)*$pageSize -lt $total -and $page -le 100)

Write-Host "Found $($targets.Count) items to upgrade (conf $MinConf%-$MaxConf%)" -ForegroundColor Yellow
Write-Host ""

$fixed = 0; $failed = 0; $i = 0
foreach ($item in $targets) {
    $i++
    $id     = $item.id
    $tmdbId = $item.tmdbId
    $type   = if ($item.type -eq 'series') { 'tv' } else { 'movie' }

    try {
        # Fetch fresh metadata directly by TMDb ID (no search, no ambiguity)
        $metaBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"tmdbId`":$tmdbId,`"type`":`"$type`"}")
        $meta = Invoke-RestMethod -Uri "$BASE/admin/metadata/tmdb" -Method POST -Headers $h -Body $metaBytes

        if (-not $meta.metadata) { throw "No metadata returned" }

        $tv = $meta.metadata.tags
        if ($tv -is [array] -and $tv.Count -gt 0) { $tagsArr = $tv }
        else { $tagsArr = [string[]]@() }

        $upd = @{
            title              = $meta.metadata.title
            type               = $item.type
            status             = $item.status
            genre              = $meta.metadata.genre
            year               = $meta.metadata.year
            language           = $item.language
            category           = $item.category
            collection         = $item.collection
            tags               = $tagsArr
            description        = $meta.metadata.description
            poster             = $meta.metadata.poster
            backdrop           = $meta.metadata.backdrop
            videoUrl           = $item.videoUrl
            featured           = $item.featured
            featuredOrder      = $item.featuredOrder
            rating             = $meta.metadata.rating
            duration           = $item.duration
            adminNotes         = $item.adminNotes
            tmdbId             = $tmdbId
            imdbId             = $meta.metadata.imdbId
            originalTitle      = $meta.metadata.originalTitle
            originalLanguage   = $meta.metadata.originalLanguage
            metadataStatus     = "matched"
            metadataConfidence = 100
            metadataProvider   = "tmdb"
            metadataUpdatedAt  = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        if ($item.type -eq 'series' -and $item.seasons) { $upd["seasons"] = $item.seasons }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($upd | ConvertTo-Json -Depth 10 -Compress))
        Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Method PUT -Headers $h -Body $bytes | Out-Null

        if ($i % 10 -eq 0) {
            Write-Host "  [$i/$($targets.Count)] Updated $fixed so far..." -ForegroundColor DarkCyan
        }
        $fixed++
        Start-Sleep -Milliseconds 200
    } catch {
        $errMsg = $_.ToString()
        Write-Host "  [$id] FAILED: $errMsg" -ForegroundColor DarkRed
        $failed++
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Upgraded to 100% : $fixed"
Write-Host "Failed           : $failed"
Write-Host "========================================"

# Final summary
$remaining = 0; $pg = 1
do {
    $list2 = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$pg&limit=100" -Headers $h
    if ($pg -eq 1) { $tot = $list2.total }
    $remaining += ($list2.items | Where-Object { $_.metadataStatus -eq 'matched' -and $_.metadataConfidence -lt 100 }).Count
    $pg++
} while (($pg-1)*100 -lt $tot -and $pg -le 100)
Write-Host "Still < 100% confidence: $remaining" -ForegroundColor Yellow
