$TMDB_KEY = "***REMOVED***"

function Search-Tmdb {
    param(
        [string]$Query,
        [string]$Year = $null
    )
    $encoded = [Uri]::EscapeDataString($Query)
    $url = "https://api.themoviedb.org/3/search/movie?api_key=$TMDB_KEY&query=$encoded&language=en-US"
    if ($Year) {
        $url += "&year=$Year"
    }

    try {
        $resp = Invoke-RestMethod -Uri $url -Method GET
        Write-Host "Query: '$Query'"
        if ($Year) { Write-Host "Year: $Year" }
        Write-Host "Total Results: $($resp.total_results)"
        foreach ($r in $resp.results) {
            Write-Host "  - [$($r.id)] $($r.title) ($($r.release_date)) | Org: $($r.original_title) | Popularity: $($r.popularity)"
        }
    } catch {
        Write-Host "  Error searching TMDb: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test some of the unmatched titles
Search-Tmdb -Query "Toh Ti Ani Fuji"
Search-Tmdb -Query "Toh, Ti ani Fuji"
Search-Tmdb -Query "Toh Ti Ani"
Search-Tmdb -Query "The Ugly" -Year 2025
Search-Tmdb -Query "Project Y"
Search-Tmdb -Query "Love Insurance Kompany"
Search-Tmdb -Query "Apex"
