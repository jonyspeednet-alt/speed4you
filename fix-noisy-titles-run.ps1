param(
    [switch]$DryRun
)

$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $loginResp.token
$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }

Write-Host "Logged in successfully to production API."
if ($DryRun) {
    Write-Host ">>> RUNNING IN DRY RUN MODE - No database changes will be made <<<" -ForegroundColor Yellow
}

# Fetch all published content
$page = 1
$pageSize = 100
$total = 0
$noisyItems = @()

do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$page&limit=$pageSize" -Headers $headers
    if ($page -eq 1) { 
        $total = $list.total
        Write-Host "Total published items in catalog: $total"
    }

    foreach ($item in $list.items) {
        if ($item.metadataStatus -eq 'matched') {
            $t = $item.title
            
            # URL Decode title for inspection
            $decoded = [Uri]::UnescapeDataString($t)
            
            # Detect noisy titles: contain resolution/codec/format/language patterns or URL encoded spaces
            $isNoisy = $t -like "*%20*" -or 
                       $decoded -match '\b(480p|720p|1080p|2160p|4k|WEBRip|BluRay|x264|x265|HEVC|HDRip|WEB-DL|BDRip)\b' -or
                       $decoded -match '\[(Dual Audio|Hindi|English|Multi)\]' -or
                       $decoded -match '\b(S\d{2}E\d{2}|Season \d)\b' -or
                       $decoded -match '\b(HDTV|DVDRip|CAM|TS|TC)\b' -or
                       $decoded -match '\-=!' -or
                       ($decoded.Length -gt 80 -and $decoded -match '\(')

            if ($isNoisy) {
                $noisyItems += $item
            }
        }
    }
    $page++
    $fetched = ($page - 1) * $pageSize
    Write-Host "  Scanned $fetched / $total items..."
} while ($fetched -lt $total -and $page -le 100)

Write-Host ""
Write-Host "Found $($noisyItems.Count) items with matched metadata but noisy titles." -ForegroundColor Cyan
Write-Host ""

$updatedCount = 0
$errorCount = 0

foreach ($noisyItem in $noisyItems) {
    $id = $noisyItem.id
    $noisyTitle = $noisyItem.title
    $tmdbId = $noisyItem.tmdbId
    $type = $noisyItem.type

    Write-Host "Processing [$id]: $noisyTitle"
    
    try {
        # 1. Fetch the full detailed item payload
        $fullItem = Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Method GET -Headers $headers
        
        # 2. Fetch clean metadata from TMDB endpoint
        $tmdbBody = @{ tmdbId = $tmdbId; type = $type } | ConvertTo-Json -Compress
        $tmdbResp = Invoke-RestMethod -Uri "$BASE/admin/metadata/tmdb" -Method POST -Headers $headers -Body $tmdbBody
        
        $cleanTitle = $tmdbResp.metadata.title
        if ([string]::IsNullOrWhiteSpace($cleanTitle)) {
            Write-Host "  [Warning] Received empty clean title from TMDB for ID $id. Skipping." -ForegroundColor Yellow
            continue
        }

        # Double check that we actually got a clean title and it's different
        if ($cleanTitle -eq $noisyTitle) {
            Write-Host "  Title is already clean. Skipping." -ForegroundColor Gray
            continue
        }

        # 3. Construct update body matching contentSchema
        $updateBody = @{
            title               = $cleanTitle
            type                = $fullItem.type
            status              = $fullItem.status
            genre               = $fullItem.genre
            year                = $fullItem.year
            language            = $fullItem.language
            category            = $fullItem.category
            collection          = $fullItem.collection
            tags                = $fullItem.tags
            description         = $fullItem.description
            poster              = $fullItem.poster
            backdrop            = $fullItem.backdrop
            videoUrl            = $fullItem.videoUrl
            featured            = $fullItem.featured
            featuredOrder       = $fullItem.featuredOrder
            rating              = $fullItem.rating
            duration            = $fullItem.duration
            adminNotes          = $fullItem.adminNotes
            tmdbId              = $fullItem.tmdbId
            imdbId              = $fullItem.imdbId
            originalTitle       = $tmdbResp.metadata.originalTitle
            originalLanguage    = $tmdbResp.metadata.originalLanguage
            metadataStatus      = "matched"
            metadataConfidence  = 100
            metadataProvider    = "tmdb"
            metadataUpdatedAt   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
        }

        # Merge seasons if it is a series
        if ($type -eq 'series' -and $fullItem.seasons) {
            $updateBody["seasons"] = $fullItem.seasons
        }

        if (-not $DryRun) {
            # Send PUT request
            $updateJson = $updateBody | ConvertTo-Json -Depth 10 -Compress
            $updateBytes = [System.Text.Encoding]::UTF8.GetBytes($updateJson)
            $updateResp = Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Method PUT -Headers $headers -Body $updateBytes
            Write-Host "  ✅ Updated: '$noisyTitle' -> '$cleanTitle'" -ForegroundColor Green
        } else {
            Write-Host "  [Dry-Run] Would update: '$noisyTitle' -> '$cleanTitle'" -ForegroundColor Yellow
        }
        
        $updatedCount++
        Start-Sleep -Milliseconds 150 # Brief throttle to be nice to API / DB
    }
    catch {
        Write-Host "  ❌ Error processing ID ${id}: $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "=== Fix complete ===" -ForegroundColor Cyan
Write-Host "Total matched & noisy items processed: $updatedCount"
Write-Host "Total errors encountered: $errorCount"
