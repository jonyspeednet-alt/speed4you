param(
    [switch]$DryRun
)

$BASE = "https://speed4you.net/portal-api/api"
$TMDB_KEY = "***REMOVED***"

$body = [System.Text.Encoding]::UTF8.GetBytes('{"username":"admin","***REMOVED***":"***REMOVED***"}')
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $body
$TOKEN = $login.token
$headers = @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
Write-Host "Logged in." -ForegroundColor Green
if ($DryRun) { Write-Host ">>> DRY RUN MODE <<<" -ForegroundColor Yellow }

# ----- Noise cleaning (same as metadata-enricher) -----
$NOISE_PATTERNS = @(
    '(?i)\b(480p|720p|1080p|2160p|4k|uhd)\b',
    '(?i)\b(web[- ]?dl|webrip|bluray|blu[- ]ray|brrip|hdrip|dvdrip|x264|x265|h\.?264|h\.?265|hevc|ds4k|remux|hc)\b',
    '(?i)\b(dual[. -]?audio|multi[. -]?audio|org|original|line|english|hindi|bangla|bengali|japanese|korean|french|spanish|tamil|telugu|dub(?:bed)?|subbed|esub[s]?|msubs?|engsub|sub[s]?|eng|hin|mar|marathi|kan|mal|tel|tam)\b',
    '(?i)\b(amzn|amazon|zee5?|4khdhub|nf|netflix|hulu|hotstar|hdtv|hdtvrip|hdtc|bdrip|10bit|10-bit|8bit|hdr10\+?|hdr|sdr|dv|ott)\b',
    '(?i)\b(ddp?[0-9.]*|dolby|atmos|ac3|dts|aac|mp3|truehd|he[.-]?aac|aac2\.0|5\.1|7\.1|2\.0)\b',
    '(?i)\b(v[23456](?=[\s.-]|$))\b',
    '(?i)\b(hq|hd|cam|cleaned|hdcam|vcd|dvdscr|hdts|scr)\b',
    '(?i)\b(katmoviehd|moviezflix|movieflix|moviflix|cinevood|lokihd|1xbet|mkvcinemas|hon3y|telly|psa|yts|yify|rarbg|fgt|pahe|galaxyrg|tgx|qxr|hdhub4u|hdhub|tomboc|etrg|juggs|axxo|shaanig|evo|mkvcage|cmrg|ntb|flux|ion10|sparks|cinefile|d3g|ethd|fewat|playwd|jyk|ag\b)\b',
    '(?i)\b(new|latest|official|free|foreign|language|with|subtitle[s]?)\b',
    '(?i)\b(telefilm|short|ova|special|movie)\b',
    '(?i)\b(ms)(?=[\s.-]|$)',
    '(?i)\b(complete|full)\s+(series|season)\b',
    '(?i)\bseason\s*\d{1,2}\b',
    '(?i)\bs\d{1,2}\s*[-_. ]*e\d{1,3}\b',
    '(?i)\bs\d{1,2}[-–]\s*s?\d{1,2}\b',
    '(?i)\bs\d{1,2}\b',
    '(?i)\be\d{1,3}\b',
    '(?i)\b\d{1,2}x\d{2,3}\b',
    '(?i)\bepisode\s*\d{1,3}\b',
    '(?i)\bTV\s*(Mini\s*)?Series\b',
    '(?i)\(TV\s*(Mini\s*)?Series[^)]*\)',
    '(?i)\(TV\s*Movie[^)]*\)',
    '(?i)\[(?!Bangla|Hindi|Bengali)[^\]]+\]',
    '\{[^}]+\}',
    '(?i)\b(extended|directors?\s*cut|unrated|theatrical|remastered|criterion)\b',
    '(?i),.*$'    # strip actor names after a comma
)

# Manual title corrections for known typos/misspellings in stored titles
$TITLE_CORRECTIONS = @{
    'American Psyco'                             = 'American Psycho'
    'Maze Runner The Scorch Trails'              = 'Maze Runner The Scorch Trials'
    'On Bak 2'                                   = 'Ong-Bak 2'
    'On Bak'                                     = 'Ong-Bak'
    'London Confidental'                         = 'London Confidential'
    'Man vs Bee'                                 = 'Man vs. Bee'
    'Man vs. Bee'                                = 'Man vs Bee'
    'State of Siege 2611'                        = 'State of Siege 26 11'
    'Spiderman Complete Animated Series 2 3 4 5' = 'Spider-Man'
    'Spiderman Complete Animated Series 2 3 4'   = 'Spider-Man'
    'Ben 10 Complete Seasons'                    = 'Ben 10'
    'Sweet Home Complete'                        = 'Sweet Home'
    'Bakuman subtitle'                           = 'Bakuman'
    'Bakuman Foreign Language subtitle'          = 'Bakuman'
    'Another +'                                  = 'Another'
    'Crisis on Earth X'                          = 'Crisis on Earth-X'
    'Crisis on Earth'                            = 'Crisis on Earth-X'
    'Daud Fun on the Run'                        = 'Daud'
    'Daud: Fun on the Run'                       = 'Daud'
    'Irul A Horror Nightmare'                    = 'Irul'
    'Duranga 23'                                 = 'Duranga'
    'Bhabiji Ghar Par Hain'                      = 'Bhabiji Ghar Par Hain'
    'Pallichattambi Multi'                        = 'Pallichattambi'
    'The Wandering Earth 9'                      = 'The Wandering Earth 2'
    'The Wandering Earth'                        = 'The Wandering Earth 2'
    'Men In Black International'                 = 'Men in Black International'
    'Sonic The Hedgehog'                         = 'Sonic the Hedgehog'
    'Once Upon a Time In Hollywood'              = 'Once Upon a Time in Hollywood'
    'Nela Ticket Ravi Teja'                      = 'Nela Ticket'
    'Nela Ticket'                                = 'Nela Ticket'
    'Dangerous Ishq'                             = 'Dangerous Ishhq'
    'Rangbaaz Darr Ki Rajneeti'                  = 'Rangbaaz'
    'Baadshah'                                   = 'Baadshah'
    'Gaayapadda Simham'                          = 'Gaayapadda Simham'
    'Everybody Loves Sohrab Handa'               = 'Everybody Loves Sohrab Handa'
    'Drishyam 3 Malayalam'                       = 'Drishyam 3'
    'Drishyam 3'                                 = 'Drishyam 3'
    'Dhurandhar The Revenge'                     = 'Dhurandhar'
    'Dhumketu'                                   = 'Dhumketu'
    'Dacoit'                                     = 'Dacoit'
    'Chand Mera Dil'                             = 'Chand Mera Dil'
    'Bhooth Bangla'                              = 'Bhooth Bangla'
    'Bhooth'                                     = 'Bhooth Bangla'
    'Assi'                                       = 'Assi'
    'Don'                                        = 'Don'
    'Unhinged'                                   = 'Unhinged'
    'Pyaar Actually Real Is Rare'                = 'Pyaar Ka Punchnama'
    'Kartavya'                                   = 'Kartavya'
    'Happy Patel Khatarnak Jasoos'               = 'Happy Patel Khatarnak Jasoos'
    'Krishnavataram The Heart'                   = 'Krishnavataram'
    'Ladies First'                               = 'Ladies First'
    'Ginny Wedss Sunny'                          = 'Ginny Weds Sunny'
    'Ginny Weds Sunny 2'                         = 'Ginny Weds Sunny'
    'Projet Hail Mry'                            = 'Project Hail Mary'
    'Nee Forever (2)'                            = 'Nee Forever'
    'Pallichattambi Multi ORGs'                  = 'Pallichattambi'
    'Karuppu PreDVD Clean 2 7GB'                 = 'Karuppu'
    'Jana Nayagan LEAK'                          = 'Jana Nayagan'
    'Happy Raj World4ufree'                      = 'Happy Raj'
}

# Patterns applied AFTER dot->space conversion (catch space-separated residue)
$POST_NOISE_PATTERNS = @(
    '(?i)\b5 1\b',          # audio "5.1" became "5 1"
    '(?i)\b7 1\b',          # audio "7.1" became "7 1"
    '(?i)\b2 0\b',          # audio "2.0" became "2 0"
    '(?i)\bh 26[45]\b',     # codec "H.264"/"H.265" became "H 264"/"H 265"
    '(?i)\bddp?\s*[57]\b',  # dolby digital residue
    '(?i)\baac2\s*0?\b',    # aac2.0 residue
    '(?i)\bv[23456]\b',     # version tags V2 V3 etc
    '(?i)\bp[12]\b',        # part tags P1 P2
    '(?i)\b(predvd|pre[-]?dvd|leak|web[-]?leak|world4ufree|world4free|4ufree|bolly4u)\b',
    '(?i)\b(neonoir|neoir|cinevood|hdhub4u|4khdhub|hdtc|hdts|hdrip|archie|pahe|mkvcinemas)\b',
    '(?i)\b(line|malayalam|kannada|uncut|studio|web|clean|orgs?|multi)\b',
    '(?i)\bcom\b',          # trailing .Com residue
    '(?i)\b(ag|ms|hin|org)\b',  # release group / lang tags
    '(?i)\b\d+\s*7?gb\b',   # filesize like "2.7GB"
    '(?i)\b264\b',          # standalone "264" residue
    '(?i)\b265\b'           # standalone "265" residue
)

function Get-CleanTitle {

    param([string]$Raw)
    $t = [System.Uri]::UnescapeDataString($Raw)   # URL-decode
    $t = $t -replace '\.[a-zA-Z]{2,4}$', ''       # strip ALPHABETIC extension only (not .264 etc)
    # Apply noise patterns BEFORE dot/underscore conversion so "5.1", "H.264" etc. match
    foreach ($p in $NOISE_PATTERNS) { $t = $t -replace $p, ' ' }
    $t = $t -replace '[._]', ' '                   # now convert dots/underscores to spaces
    # Second pass: catch space-separated residue like "5 1", "H 264"
    foreach ($p in $POST_NOISE_PATTERNS) { $t = $t -replace $p, ' ' }
    $t = $t -replace '\((19|20)\d{2}[-–]\d{2,4}\)', ' '   # (2022-23)
    $t = $t -replace '\((19|20)\d{2}\)', ' '               # (year)
    $t = $t -replace '\b(19|20)\d{2}\b', ' '               # bare year
    $t = $t -replace '\(\s*\)', ' '                        # empty parens ()
    $t = $t -replace '\[\s*\]', ' '                        # empty brackets []
    $t = $t -replace '\s+\+\s*$', ''                       # trailing +
    $t = $t -replace '\s*[-:–—]+\s*$', ''                  # trailing dashes
    $t = $t -replace '\s*[-:–—]+\s*', ' '
    # Strip trailing isolated single digits (noise residue like "5" "0" "2")
    $t = $t -replace '\s+\d\s*$', ''
    # Strip trailing (N) copy/duplicate indicators like (2), (3)
    $t = $t -replace '\s*\(\d{1,2}\)\s*$', ''
    $t = $t -replace '\s+', ' '
    return $t.Trim()
}

function Get-Normalized {
    param([string]$s)
    return ($s.ToLower() -replace '[^a-z0-9]', '')
}

# TMDb search with retry on 429/401
function Search-TMDb {
    param([string]$Query, [string]$MediaType)
    $encoded = [Uri]::EscapeDataString($Query)
    $url = "https://api.themoviedb.org/3/search/$MediaType`?api_key=$TMDB_KEY&query=$encoded&language=en-US"
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $resp = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 15
            return $resp.results
        } catch {
            $code = $_.Exception.Response.StatusCode.value__
            if ($code -eq 429 -or $code -eq 401) {
                Write-Host "    Rate limit hit, waiting 10s..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            } else {
                Write-Host "    TMDb error ($code): $_" -ForegroundColor Red
                return @()
            }
        }
    }
    return @()
}

# ---- Collect all unmatched published items -----
Write-Host "Fetching unmatched items..." -ForegroundColor Cyan
$page = 1; $pageSize = 100; $total = 0
$unmatched = [System.Collections.Generic.List[object]]::new()
do {
    $url = "$BASE/admin/content?status=published&page=$page&limit=$pageSize"
    $list = Invoke-RestMethod -Uri $url -Headers $headers
    if ($page -eq 1) { $total = $list.total }
    foreach ($item in $list.items) {
        if ($item.metadataStatus -ne 'matched') { $unmatched.Add($item) }
    }
    $page++
} while (($page-1)*$pageSize -lt $total -and $page -le 100)

Write-Host "Found $($unmatched.Count) unmatched items to process." -ForegroundColor Yellow
Write-Host ""

$fixedCount = 0; $skipCount = 0

foreach ($item in $unmatched) {
    $id   = $item.id
    $rawTitle = $item.title
    $type = $item.type
    $mediaType = if ($type -eq 'series') { 'tv' } else { 'movie' }

    $clean = Get-CleanTitle -Raw $rawTitle
    if ([string]::IsNullOrWhiteSpace($clean)) {
        Write-Host "  [$id] SKIP (empty after clean): '$rawTitle'" -ForegroundColor DarkGray
        $skipCount++
        continue
    }

    # Apply manual corrections for known typos / noise residue
    if ($TITLE_CORRECTIONS.ContainsKey($clean)) {
        $corrected = $TITLE_CORRECTIONS[$clean]
        Write-Host "      Correction: '$clean' -> '$corrected'" -ForegroundColor DarkYellow
        $clean = $corrected
    }

    $normClean = Get-Normalized -s $clean
    Write-Host "[$id] '$rawTitle'" -ForegroundColor Gray
    Write-Host "      Clean: '$clean'" -ForegroundColor DarkCyan

    # Search TMDb - try primary media type, then fallback to the other
    $results = Search-TMDb -Query $clean -MediaType $mediaType
    if ($results.Count -eq 0) {
        $altType = if ($mediaType -eq 'tv') { 'movie' } else { 'tv' }
        $results = Search-TMDb -Query $clean -MediaType $altType
        if ($results.Count -gt 0) { $mediaType = $altType }
    }

    $best = $null
    foreach ($cand in $results) {
        $candTitle = if ($mediaType -eq 'tv') { $cand.name } else { $cand.title }
        $candOrig  = if ($mediaType -eq 'tv') { $cand.original_name } else { $cand.original_title }
        $normCand  = Get-Normalized -s $candTitle
        $normOrig  = Get-Normalized -s $candOrig
        if ($normClean -eq $normCand -or $normClean -eq $normOrig) {
            $best = $cand; break
        }
    }

    # If no exact match, try first result if confidence is high (top result and title substring match)
    if (-not $best -and $results.Count -gt 0) {
        $top = $results[0]
        $topTitle = if ($mediaType -eq 'tv') { $top.name } else { $top.title }
        $normTop = Get-Normalized -s $topTitle
        # Accept if clean title contains top result title or vice versa (at least 6 chars)
        if ($normTop.Length -ge 6 -and ($normClean.Contains($normTop) -or $normTop.Contains($normClean))) {
            $best = $top
            Write-Host "      (Fuzzy match accepted)" -ForegroundColor DarkYellow
        }
    }

    if ($best) {
        $tmdbId    = $best.id
        $tmdbTitle = if ($mediaType -eq 'tv') { $best.name } else { $best.title }
        Write-Host "      MATCH: '$tmdbTitle' (TMDb ID: $tmdbId)" -ForegroundColor Green

        if (-not $DryRun) {
            try {
                # Fetch full metadata from backend proxy
                $metaBody = [System.Text.Encoding]::UTF8.GetBytes("{`"tmdbId`":$tmdbId,`"type`":`"$type`"}")
                $meta = Invoke-RestMethod -Uri "$BASE/admin/metadata/tmdb" -Method POST -Headers $headers -Body $metaBody

                # Fetch existing item for non-metadata fields
                $fullItem = Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Headers $headers

                # Ensure tags is always an array
                $tagsValue = $meta.metadata.tags
                if ($tagsValue -is [array]) { $tagsArr = $tagsValue }
                elseif ($tagsValue) { $tagsArr = @($tagsValue) }
                else { $tagsArr = @() }

                $updateBody = @{
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
                if ($type -eq 'series' -and $fullItem.seasons) {
                    $updateBody["seasons"] = $fullItem.seasons
                }

                $updateJson  = $updateBody | ConvertTo-Json -Depth 10 -Compress
                $updateBytes = [System.Text.Encoding]::UTF8.GetBytes($updateJson)
                Invoke-RestMethod -Uri "$BASE/admin/content/$id" -Method PUT -Headers $headers -Body $updateBytes | Out-Null
                Write-Host "      ✅ Updated!" -ForegroundColor Green
                $fixedCount++
            } catch {
                Write-Host "      ❌ Update failed: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "      [DRY RUN] Would update to '$tmdbTitle'" -ForegroundColor Yellow
            $fixedCount++
        }
    } else {
        Write-Host "      ❌ No TMDb match for '$clean'" -ForegroundColor DarkGray
        $skipCount++
    }

    Start-Sleep -Milliseconds 800  # Respectful rate limiting
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixed  : $fixedCount"
Write-Host "Skipped: $skipCount (no TMDb match or empty title)"
Write-Host "========================================" -ForegroundColor Cyan
