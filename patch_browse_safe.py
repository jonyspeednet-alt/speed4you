import sys
import re

with open("frontend/src/pages/BrowsePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Card Hover Animation
content = content.replace(
    "transform: hovered && !isMobile ? 'scale(1.02)' : 'scale(1)',",
    "transform: hovered && !isMobile ? 'scale(1.04)' : 'scale(1)',"
)
content = content.replace(
    "boxShadow: hovered && !isMobile\n            ? '0 24px 48px rgba(0,0,0,0.5), 0 0 28px rgba(255,90,95,0.18)'",
    "boxShadow: hovered && !isMobile\n            ? '0 24px 48px rgba(0,0,0,0.6), 0 0 32px var(--glow-cyan)'"
)

# 2. Update Font size and Contrast
content = content.replace(
    "fontSize: '0.84rem',\n    color: 'var(--text-muted)',",
    "fontSize: '0.9rem',\n    color: 'var(--text-secondary)',"
)
content = content.replace(
    "fontSize: '0.8rem',\n    color: 'var(--accent-cyan)',",
    "fontSize: '0.85rem',\n    color: 'var(--accent-cyan)',"
)

# 3. Add icons to filter labels
content = content.replace("<span style={styles.filterLabel}>Genre</span>", "<span style={styles.filterLabel}>🎭 Genre</span>")
content = content.replace("<span style={styles.filterLabel}>Language</span>", "<span style={styles.filterLabel}>🗣️ Language</span>")
content = content.replace("<span style={styles.filterLabel}>Sort</span>", "<span style={styles.filterLabel}>🔄 Sort</span>")
content = content.replace("<span style={styles.filterLabel}>Collection</span>", "<span style={styles.filterLabel}>📦 Collection</span>")

# 4. Remove insightRow (Admin Stats)
insight_block = """          <div style={{ ...styles.insightRow, ...(isMobile ? styles.insightRowMobile : isTablet ? styles.insightRowTablet : {}) }}>
            <div style={styles.insightCard}>
              <span style={styles.insightLabel}>Visible Now</span>
              <strong style={styles.insightValue}>{isLoading ? '...' : filteredContent.length}</strong>
            </div>
            <div style={styles.insightCard}>
              <span style={styles.insightLabel}>Top Rated</span>
              <strong style={styles.insightValue}>{isLoading ? '...' : highRatedCount}</strong>
            </div>
            <div style={styles.insightCard}>
              <span style={styles.insightLabel}>Latest Year</span>
              <strong style={styles.insightValue}>{isLoading ? '...' : newestYear || 'N/A'}</strong>
            </div>
            <div style={styles.insightCard}>
              <span style={styles.insightLabel}>Needs Review</span>
              <strong style={styles.insightValue}>{isLoading ? '...' : reviewNeededCount}</strong>
            </div>
          </div>"""
content = content.replace(insight_block, "")

# 5. Make search bar larger
content = content.replace(
    "maxWidth: '640px',\n    minHeight: '54px',",
    "maxWidth: '800px',\n    minHeight: '64px',\n    margin: '0 auto',"
)
content = content.replace(
    "fontSize: '1rem',",
    "fontSize: '1.2rem',"
)

with open("frontend/src/pages/BrowsePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
