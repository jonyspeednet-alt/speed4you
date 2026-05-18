import sys

with open("frontend/src/pages/BrowsePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_statement = "import WatchlistButton from '../components/ui/WatchlistButton';\nimport QuickViewModal from '../components/ui/QuickViewModal';"
content = content.replace("import WatchlistButton from '../components/ui/WatchlistButton';", import_statement)

# Add onQuickView to BrowseCard
bad_card_decl = "function BrowseCard({ item, index, isMobile }) {"
good_card_decl = "function BrowseCard({ item, index, isMobile, onQuickView }) {"
content = content.replace(bad_card_decl, good_card_decl)

# Change <Link to={linkPath}> to <div onClick>
bad_card_link = """      <Link
        to={item.type === 'series' ? `/series/${item.id}` : `/movies/${item.id}`}
        style={styles.card}
      >
        <div style={{"""
good_card_link = """      <div
        style={{ ...styles.card, cursor: 'pointer' }}
        onClick={(e) => {
          if (onQuickView) {
            e.preventDefault();
            onQuickView(item);
          }
        }}
      >
        <div style={{"""
content = content.replace(bad_card_link, good_card_link)

# Close </div> instead of </Link>
bad_card_end = """        </div>
      </Link>
    </div>
  );
}"""
good_card_end = """        </div>
      </div>
    </div>
  );
}"""
content = content.replace(bad_card_end, good_card_end)

# Add state to BrowsePage
bad_page_state = "  const [filtersOpen, setFiltersOpen] = useState(false);"
good_page_state = "  const [filtersOpen, setFiltersOpen] = useState(false);\n  const [quickViewItem, setQuickViewItem] = useState(null);"
content = content.replace(bad_page_state, good_page_state)

# Pass onQuickView to BrowseCard
bad_render_card = "<BrowseCard key={item.id} item={item} index={index} isMobile={isMobile} />"
good_render_card = "<BrowseCard key={item.id} item={item} index={index} isMobile={isMobile} onQuickView={setQuickViewItem} />"
content = content.replace(bad_render_card, good_render_card)

# Add QuickViewModal at the end of BrowsePage
bad_page_end = """      )}
        </div>
      </div>
    </div>
  );
}"""
good_page_end = """      )}
        </div>
      </div>
      <QuickViewModal isOpen={!!quickViewItem} item={quickViewItem} onClose={() => setQuickViewItem(null)} />
    </div>
  );
}"""
content = content.replace(bad_page_end, good_page_end)

with open("frontend/src/pages/BrowsePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
