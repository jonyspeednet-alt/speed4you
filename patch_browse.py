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
insight_regex = re.compile(r"<div style=\{\{\s*\.\.\.styles\.insightRow[\s\S]*?</div>\s*</div>\s*</div>", re.MULTILINE)
content = insight_regex.sub("</div>", content)

# 5. Make search bar larger
content = content.replace(
    "maxWidth: '640px',\n    minHeight: '54px',",
    "maxWidth: '800px',\n    minHeight: '64px',\n    margin: '0 auto',"
)
content = content.replace(
    "fontSize: '1rem',",
    "fontSize: '1.2rem',"
)

# 6. Restructure layout for Sidebar
# Find the start of commandPanel and move it
content = content.replace("        <div style={{ ...styles.commandPanel, ...(isMobile ? styles.commandPanelMobile : {}) }}>", 
"""
      <div style={{ ...styles.layoutWrapper, ...(isMobile ? styles.layoutWrapperMobile : isTablet ? styles.layoutWrapperTablet : {}) }}>
        <aside style={{ ...styles.sidebar, ...(isMobile ? styles.sidebarMobile : {}) }}>
          <div style={{ ...styles.commandPanel, ...(isMobile ? styles.commandPanelMobile : {}) }}>""")

# Find the end of commandPanel section
content = content.replace("          </div>{/* end filterPanelInner */}\n        </div>\n      </section>",
"""          </div>{/* end filterPanelInner */}
        </div>
        </aside>
        
        <div style={{ ...styles.mainContent, transition: 'opacity 0.3s ease', opacity: isFetching ? 0.6 : 1 }}>
      </section>""")

# Close the layout wrapper at the end before </div> (the root div)
content = content.replace("      )}", "      )}\n        </div>\n      </div>")

# Add layout styles
content = content.replace("  page: {", """  layoutWrapper: {
    maxWidth: '1440px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '32px',
    alignItems: 'start',
  },
  layoutWrapperTablet: {
    gridTemplateColumns: '220px 1fr',
    gap: '20px',
  },
  layoutWrapperMobile: {
    gridTemplateColumns: '1fr',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebar: {
    position: 'sticky',
    top: '100px',
  },
  sidebarMobile: {
    position: 'relative',
    top: 0,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
  },
  page: {""")

with open("frontend/src/pages/BrowsePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
