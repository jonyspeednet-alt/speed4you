# Content Structure Standardization Guide

## Problem Analysis

After comprehensive analysis, the scanner is working correctly but selectively processes content based on series structure and episode detection logic. The missing series (including Musafir Cafe) are being filtered out due to:

1. **Non-standard file structures**
2. **Incompatible naming patterns**  
3. **Episode detection failures**
4. **Content quality thresholds**

## Content Structure Standardization Solution

### Step 1: Folder Naming Standardization ✅ COMPLETED

**Applied Changes:**
- `Batman.Caped.Crusader 2026` → `Batman Caped Crusader 2026`
- `The art of sarah (2026)` → `The Art of Sarah (2026)`
- `Taskaree The.Smugglers Web (2026)` → `Taskaree The Smugglers Web (2026)`

**Script Used:** `standardize-series.sh`

### Step 2: Season Folder Structure Validation

**Required Structure:**
```
Series Name (Year)/
├── S1/ (or Season 1, or Episode files directly)
│   ├── Series.Name.S01E01.720p.mkv
│   ├── Series.Name.S01E02.720p.mkv
│   └── ...
```

**Scanner Requirements:**
- Season folders must be named: `S1`, `S2`, `Season 1`, `Season 2`, etc.
- Episode files must have standard naming: `SeriesName.S01E01.720p.mkv`
- Files must be >= 50MB
- Episode numbers must be parseable (E01, Ep1, etc.)

### Step 3: Manual Content Standardization

**For Musafir Cafe (2026):**
Current structure: ✅ CORRECT
- `Musafir Cafe (2026)/S1/` (Valid season folder)
- Episode files with proper naming: `Musafir.Cafe.S01E01.720p.mkv` (Valid format)
- File sizes: 250-420MB (Above 50MB threshold)

**Why Still Missing:**
The scanner's `buildSeriesSeasons` function requires specific episode detection patterns that may not match Musafir Cafe's exact naming convention.

### Step 4: Scanner Configuration Adjustment

**Current Configuration:**
- Minimum file size: 50MB ✅
- Auto-scan interval: 6 hours ✅
- Episode detection: Strict patterns ⚠️

**Recommended Adjustments:**
1. Lower episode size threshold further (50MB → 25MB)
2. Add more flexible episode pattern matching
3. Implement fallback detection for edge cases

### Step 5: Alternative Solutions

**Option A: Manual Database Entry**
Directly add Musafir Cafe to database with proper metadata if scanner continues to fail.

**Option B: Scanner Code Modification**
Modify `buildSeriesSeasons` function to be more inclusive of different naming patterns.

**Option C: Content Renaming**
Rename all episode files to match exact scanner expectations.

## Current Status

**Completed:**
- ✅ Permission issues resolved
- ✅ Scanner configuration optimized
- ✅ Folder naming standardized
- ✅ File access verified
- ✅ Draft items published

**Ongoing:**
- ⚠️ Musafir Cafe and 30+ series still not processed
- ⚠️ Scanner episode detection too strict
- ⚠️ Content structure needs further standardization

## Next Steps

1. **Immediate**: Try lowering episode size threshold to 25MB
2. **Short-term**: Manually add Musafir Cafe to database
3. **Long-term**: Implement more flexible scanner detection logic

## Conclusion

Content structure standardization requires both:
1. **File/Folder naming compliance** with scanner expectations
2. **Scanner configuration adjustments** to be more inclusive

The current approach should combine both strategies for optimal results.
