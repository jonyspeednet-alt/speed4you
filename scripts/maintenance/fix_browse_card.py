import sys

with open("frontend/src/pages/BrowsePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

bad_block = """          {hovered && !isMobile && (
            <div style={styles.hoverPlay}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>
          <div style={styles.cardWatchlistBtn}>"""

good_block = """          {hovered && !isMobile && (
            <div style={styles.hoverPlay}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <div style={styles.cardWatchlistBtn}>"""

content = content.replace(bad_block, good_block)

with open("frontend/src/pages/BrowsePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
