# Draft Content Analysis Report
**Generated:** 2026-08-06  
**Total Draft Items:** 212

## Executive Summary

- **Movies:** 202 items (95%)
- **Series:** 10 items (5%)
- **Metadata Status:**
  - `not_found`: 198 items (93%) - TMDB/OMDB could not find matches
  - `matched`: 13 items (6%) - Successfully matched with good confidence  
  - `pending`: 1 item (0.5%) - Still processing

## Critical Issues Identified

### 1. Unicode/Character Encoding Problems (MAJOR)
**Impact:** ~150+ items (70% of drafts)

**Problem:** Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam movie titles have severe character encoding corruption in the database.

**Examples:**
- Database: `एक व ल न र टर न स` → File system: `एक विलेन रिटर्न्स (2022).mkv`
- Database: `ड क टर ज` → File system: `डॉक्टर जी (2022).mkv`  
- Database: `जय शभ ई ज रद र` → File system: `जयेशभाई जोरदार (2022).mkv`
- Database: `बध ई द` → File system: `बधाई दो (2022).mkv`

**Root Cause:** Unicode characters (especially Devanagari matras/vowel signs) are being stripped during database insertion or title normalization.

**Fix Required:**
1. **IMMEDIATE:** Fix the title normalization/cleaning function in `metadata-enricher.js` to preserve Unicode characters
2. **DATA RECOVERY:** Re-scan all affected items to pull correct titles from file system
3. **DATABASE CLEANUP:** Update corrupted titles in database

### 2. Generic/Non-descriptive Titles (HIGH)
**Impact:** ~20 items

**Problem:** Files with completely generic or corrupted titles that cannot be matched to any metadata.

**Examples:**
- `Media Item (2022).mkv` - No identifiable title
- `Topgunneroutput.mp4` - Appears to be a corruption/transcoding artifact
- `Mere 20desh 20ki 20dharti 20` - Numbers replacing spaces, corrupted title
- `33950: വ യ ൽ` - Severely corrupted Malayalam title

**Fix Required:**
1. **MANUAL INTERVENTION:** These files need manual research to identify correct titles
2. **FILE RENAME:** Rename files to proper movie names before re-scanning
3. **MANUAL ENTRY:** Consider manual content entry for truly unidentifiable files

### 3. Collection/Folder Structure Issues (MEDIUM)
**Impact:** ~5-10 series items

**Problem:** Series formatted as "Complete Collection" instead of individual seasons.

**Examples:**
- `Ben 10 Complete Collection` - Should be individual Ben 10 series
- `Dragon Ball Z Movies Collection` - Should be separate movies or series
- `The Sopranos Complete Series` - Should be individual seasons

**Fix Required:**
1. **SCANNER CONFIG:** Update scanner to properly handle collection folders
2. **MANUAL SPLIT:** Manually split these into proper series/season structure
3. **RE-SCAN:** Re-scan with proper folder structure

### 4. Low Confidence Matches (MEDIUM)
**Impact:** ~5 items

**Problem:** Items matched but with very low confidence scores (0-15).

**Examples:**
- `Dirilis Ertugrul` - Confidence: 1 (but has good metadata)
- `The Bombardment` - Confidence: 15
- `Two Buddies And A Badger The Great Big Beast` - Confidence: 6

**Fix Required:**
1. **CONFIDENCE THRESHOLD:** Consider adjusting auto-publish threshold
2. **MANUAL REVIEW:** Review low-confidence matches manually
3. **IMPROVED MATCHING:** Enhance matching algorithm for better scores

## Fix Recommendations by Category

### Category A: Unicode Encoding Issues (Priority 1)
**Items:** ~150+ Hindi/Bengali/Tamil/Telugu/Kannada/Malayalam movies

**Recommended Actions:**
1. **Code Fix:** Update `cleanSearchTitle()` in `metadata-enricher.js` to preserve Unicode
2. **Bulk Re-scan:** Trigger re-scan for all items with corrupted Unicode titles
3. **Validation:** Add Unicode validation before database insertion

**Code Change Required:**
```javascript
// In metadata-enricher.js, ensure NOISE_PATTERNS don't strip Unicode
// Add Unicode-safe regex patterns
function cleanSearchTitle(value) {
  let normalized = String(value || '');
  // Preserve Unicode characters during normalization
  normalized = normalized.replace(/\.[a-z0-9]{2,4}$/i, '');
  normalized = normalized.replace(/[._]/g, ' ');
  // Add more careful Unicode handling...
}
```

### Category B: Generic/Corrupted Titles (Priority 2)
**Items:** ~20 files with unidentifiable titles

**Recommended Actions:**
1. **Manual Research:** Look up file hashes/sizes on movie databases
2. **File Rename:** Rename files to proper movie names
3. **Manual Entry:** Use admin panel to manually create content entries

**Specific Items to Rename:**
- `Media Item (2022).mkv` → [Research actual title]
- `Topgunneroutput.mp4` → `Top Gunner (2022).mp4` (if matches)
- `Mere 20desh 20ki 20dharti 20` → `Mere Desh Ki Dharti (2022).mkv`

### Category C: Collection Structure Issues (Priority 3)
**Items:** ~5-10 series collections

**Recommended Actions:**
1. **Folder Restructure:** Split collections into proper series/season folders
2. **Scanner Update:** Improve collection detection logic
3. **Manual Configuration:** Create proper series entries manually

**Example Restructure:**
```
Before: Ben 10 - Complete Collection/
After:  Ben 10 (2005)/
        Ben 10 Alien Force/
        Ben 10 Ultimate Alien/
```

### Category D: Low Confidence Matches (Priority 4)
**Items:** ~5 matched items with low confidence

**Recommended Actions:**
1. **Manual Review:** Verify metadata accuracy in admin panel
2. **Publish Decision:** Manually publish if metadata is correct
3. **Improve Scoring:** Adjust confidence scoring algorithm

## Immediate Action Plan

### Phase 1: Unicode Fix (Critical - Do Today)
1. Fix `metadata-enricher.js` Unicode handling
2. Test with sample Hindi/Bengali titles
3. Deploy fix to production
4. Re-scan affected items

### Phase 2: Generic Title Cleanup (High - This Week)
1. Create list of all generic titles
2. Research actual movie titles manually
3. Rename files on server
4. Re-scan renamed files

### Phase 3: Collection Restructure (Medium - Next Week)
1. Identify all collection folders
2. Plan proper folder structure
3. Restructure folders on server
4. Re-scan with new structure

### Phase 4: Manual Review (Ongoing)
1. Review low-confidence matches
2. Manually publish valid items
3. Delete truly unidentifiable content

## Specific Fix Commands

### Unicode Fix Implementation
```bash
# 1. Update metadata-enricher.js with Unicode-safe patterns
# 2. Test locally with sample titles
# 3. Deploy via git push to main
# 4. Re-scan affected items via admin panel
```

### File Rename Examples
```bash
# On server:
cd /var/www/html/Hindi_Movies/2022/
mv "Mere 20desh 20ki 20dharti 20 (2022).mkv" "Mere Desh Ki Dharti (2022).mkv"
mv "Topgunneroutput.mp4" "Top Gunner (2022).mp4"
```

### Bulk Re-scan
```bash
# Via admin API or webhook:
curl -X POST https://speed4you.net/portal-api/api/admin/scanner/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## Monitoring Success

**Metrics to Track:**
- Unicode corruption rate (should drop to 0%)
- Generic title count (should drop to <5)
- Collection detection accuracy (should improve)
- Overall draft count (should decrease significantly)

**Success Criteria:**
- <20 draft items remaining
- 0% Unicode corruption
- All identifiable content published
- Proper series/season structure

## Notes

- The main issue is **Unicode character handling** in the title normalization process
- File system has correct names, but database insertion corrupts them
- Fixing the Unicode issue will automatically resolve ~70% of draft items
- Generic titles require manual intervention and file renaming
- Collection issues need structural changes and re-scanning