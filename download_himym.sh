#!/bin/bash
set -e

BASE_URL="https://server4.ftpbd.net/FTP-4/English-Foreign-TV-Series/How-I-Met-Your-Mother-%28TV-Series-2005-%29-1080p"
TARGET_DIR="/var/www/html/TV_Series/TV_Web_Series-F-M/How I Met Your Mother (2005)"
LOG_FILE="/tmp/himym_download.log"

echo "[$(date)] Starting download of How I Met Your Mother" > "$LOG_FILE"

for season_num in 1 2 3 4 5 6 7 8 9; do
    SEASON_DIR="$TARGET_DIR/Season $season_num"
    mkdir -p "$SEASON_DIR"

    SEASON_URL="$BASE_URL/Season-$season_num/"
    echo "[$(date)] Processing Season $season_num from $SEASON_URL" | tee -a "$LOG_FILE"

    # Fetch the HTML listing, extract mp4 file links
    wget -q -O - "$SEASON_URL" 2>/dev/null | \
        grep -oP 'href="[^"]*\.mp4"' | \
        sed 's/href="//;s/"//' | \
        while read -r file_path; do
            # Build full URL
            if [[ "$file_path" == http* ]]; then
                FILE_URL="$file_path"
            else
                FILE_URL="https://server4.ftpbd.net$file_path"
            fi

            # Extract just the filename from the path
            FILENAME=$(basename "$file_path")
            # Decode URL encoding (%28 -> ( etc.)
            DECODED_NAME=$(printf '%b' "${FILENAME//%/\\x}")

            # Skip if already downloaded
            if [ -f "$SEASON_DIR/$DECODED_NAME" ]; then
                echo "[$(date)] Already exists: $DECODED_NAME" >> "$LOG_FILE"
                continue
            fi

            echo "[$(date)] Downloading: $DECODED_NAME" | tee -a "$LOG_FILE"
            wget -c -q --show-progress --timeout=60 --tries=5 -O "$SEASON_DIR/$DECODED_NAME" "$FILE_URL" 2>&1 | tee -a "$LOG_FILE"
            DOWNLOAD_EXIT=${PIPESTATUS[0]}
            if [ $DOWNLOAD_EXIT -ne 0 ]; then
                echo "[$(date)] ERROR downloading $DECODED_NAME (exit: $DOWNLOAD_EXIT)" | tee -a "$LOG_FILE"
                rm -f "$SEASON_DIR/$DECODED_NAME"
            else
                echo "[$(date)] Success: $DECODED_NAME" >> "$LOG_FILE"
            fi
        done

    echo "[$(date)] Completed Season $season_num" | tee -a "$LOG_FILE"
done

echo "[$(date)] ALL DONE! Summary:" | tee -a "$LOG_FILE"
for season_num in 1 2 3 4 5 6 7 8 9; do
    count=$(ls "$TARGET_DIR/Season $season_num/"*.mp4 2>/dev/null | wc -l)
    echo "  Season $season_num: $count files" | tee -a "$LOG_FILE"
done
total=$(find "$TARGET_DIR" -name '*.mp4' 2>/dev/null | wc -l)
echo "  TOTAL: $total files" | tee -a "$LOG_FILE"
echo "[$(date)] Log file: $LOG_FILE"
