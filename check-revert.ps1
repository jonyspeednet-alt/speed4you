$BASE = "https://speed4you.net/portal-api/api"
$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$h = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }

$i2967 = Invoke-RestMethod -Uri "$BASE/admin/content/2967" -Headers $h
Write-Host "ID 2967: title='$($i2967.title)' status='$($i2967.metadataStatus)'"

$i5504 = Invoke-RestMethod -Uri "$BASE/admin/content/5504" -Headers $h
Write-Host "ID 5504: title='$($i5504.title)' status='$($i5504.metadataStatus)'"

# Revert 5504 if it shows wrong title
if ($i5504.title -ne "Bhabiji Ghar Par Hain!") {
    Write-Host "Reverting ID 5504 (wrong title: '$($i5504.title)')..." -ForegroundColor Yellow
    $revert = @{
        title              = "Bhabiji Ghar Par Hain"
        type               = $i5504.type
        status             = $i5504.status
        genre              = $i5504.genre
        year               = $i5504.year
        language           = $i5504.language
        category           = $i5504.category
        collection         = $i5504.collection
        tags               = [string[]]@()
        description        = $i5504.description
        poster             = $i5504.poster
        backdrop           = $i5504.backdrop
        videoUrl           = $i5504.videoUrl
        featured           = $i5504.featured
        featuredOrder      = $i5504.featuredOrder
        rating             = $i5504.rating
        duration           = $i5504.duration
        adminNotes         = $i5504.adminNotes
        tmdbId             = $null
        imdbId             = $null
        originalTitle      = $null
        originalLanguage   = $null
        metadataStatus     = "not_found"
        metadataConfidence = 0
        metadataProvider   = $null
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($revert | ConvertTo-Json -Depth 10 -Compress))
    Invoke-RestMethod -Uri "$BASE/admin/content/5504" -Method PUT -Headers $h -Body $bytes | Out-Null
    Write-Host "  Reverted to 'Bhabiji Ghar Par Hain' (not_found)" -ForegroundColor Green
}

# Always revert 2967 back to not_found (got wrong title)
Write-Host "Reverting ID 2967 (title='$($i2967.title)')..." -ForegroundColor Yellow
$r2 = @{
    title="Man vs Bee"; type=$i2967.type; status=$i2967.status; genre=$i2967.genre
    year=$i2967.year; language=$i2967.language; category=$i2967.category
    collection=$i2967.collection; tags=[string[]]@(); description=$i2967.description
    poster=$i2967.poster; backdrop=$i2967.backdrop; videoUrl=$i2967.videoUrl
    featured=$i2967.featured; featuredOrder=$i2967.featuredOrder; rating=$i2967.rating
    duration=$i2967.duration; adminNotes=$i2967.adminNotes; tmdbId=$null; imdbId=$null
    originalTitle=$null; originalLanguage=$null; metadataStatus="not_found"
    metadataConfidence=0; metadataProvider=$null
}
$b2 = [System.Text.Encoding]::UTF8.GetBytes(($r2 | ConvertTo-Json -Depth 5 -Compress))
Invoke-RestMethod -Uri "$BASE/admin/content/2967" -Method PUT -Headers $h -Body $b2 | Out-Null
Write-Host "  Reverted ID 2967 to not_found" -ForegroundColor Green

# Final count
$ums = 0; $pg = 1
do {
    $list = Invoke-RestMethod -Uri "$BASE/admin/content?status=published&page=$pg&limit=100" -Headers $h
    if ($pg -eq 1) { $tot = $list.total }
    $ums += ($list.items | Where-Object { $_.metadataStatus -ne 'matched' }).Count
    $pg++
} while (($pg-1)*100 -lt $tot -and $pg -le 100)
Write-Host ""
Write-Host "Final: $($tot - $ums) matched / $tot total ($([math]::Round(($tot-$ums)/$tot*100,1))%)" -ForegroundColor Cyan
Write-Host "Still unmatched: $ums" -ForegroundColor Yellow

