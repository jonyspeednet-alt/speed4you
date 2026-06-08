$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $login.token
$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
Write-Host "Logged in." -ForegroundColor Green

# Known TMDb IDs for items that search API couldn't find
$directMatches = @(
    @{ id = 5504; tmdbId = 62379;  type = "series"; title = "Bhabiji Ghar Par Hain!" }
    @{ id = 2967; tmdbId = 205086; type = "series"; title = "Man vs. Bee" }
)

foreach ($m in $directMatches) {
    $id     = $m.id
    $tmdbId = $m.tmdbId
    $type   = $m.type
    Write-Host "Updating ID $id ('$($m.title)') with TMDb $tmdbId..." -ForegroundColor Cyan

    try {
        $metaBody  = [System.Text.Encoding]::UTF8.GetBytes("{`"tmdbId`":$tmdbId,`"type`":`"$type`"}")
        $meta      = Invoke-RestMethod -Uri "$BASE/admin/metadata/tmdb" -Method POST -Headers $headers -Body $metaBody
        $fullItem  = Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Headers $headers

        $tagsValue = $meta.metadata.tags
        # PowerShell serializes plain @() as null — use typed array to force []
        if ($tagsValue -is [array] -and $tagsValue.Count -gt 0) { $tagsArr = $tagsValue }
        else { $tagsArr = [string[]]@() }

        $upd = @{
            title              = $meta.metadata.title
            type               = $fullItem.type
            status             = $fullItem.status
            genre              = $meta.metadata.genre
            year               = $meta.metadata.year
            language           = $fullItem.language
            category           = $fullItem.category
            collection         = $fullItem.collection
            tags               = $tagsArr
            description        = $meta.metadata.description
            poster             = $meta.metadata.poster
            backdrop           = $meta.metadata.backdrop
            videoUrl           = $fullItem.videoUrl
            featured           = $fullItem.featured
            featuredOrder      = $fullItem.featuredOrder
            rating             = $meta.metadata.rating
            duration           = $fullItem.duration
            adminNotes         = $fullItem.adminNotes
            tmdbId             = $tmdbId
            imdbId             = $meta.metadata.imdbId
            originalTitle      = $meta.metadata.originalTitle
            originalLanguage   = $meta.metadata.originalLanguage
            metadataStatus     = "matched"
            metadataConfidence = 100
            metadataProvider   = "tmdb"
            metadataUpdatedAt  = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        if ($type -eq 'series' -and $fullItem.seasons) { $upd["seasons"] = $fullItem.seasons }

        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($upd | ConvertTo-Json -Depth 10 -Compress))
        Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Method PUT -Headers $headers -Body $bytes | Out-Null
        Write-Host "  ✅ Updated to '$($meta.metadata.title)'" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Final verification ===" -ForegroundColor Cyan
$page = 1; $pageSize = 100; $total = 0; $stillBad = 0
do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $headers
    if ($page -eq 1) { $total = $list.total }
    $stillBad += ($list.items | Where-Object { $_.metadataStatus -ne 'matched' }).Count
    $page++
} while (($page-1)*$pageSize -lt $total -and $page -le 100)

Write-Host "Still unmatched : $stillBad"
Write-Host "Total published : $total"
Write-Host "Fully matched   : $($total - $stillBad) ($([math]::Round(($total - $stillBad)/$total*100, 1))%)" -ForegroundColor Green
