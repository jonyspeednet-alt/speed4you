import sys

with open("frontend/src/pages/HomePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_statement = "import ContentRail from '../features/home/components/ContentRail';\nimport QuickViewModal from '../components/ui/QuickViewModal';"
content = content.replace("import ContentRail from '../features/home/components/ContentRail';", import_statement)

# Add state
state_statement = "  const [hoveredCard, setHoveredCard] = useState(null);\n  const [quickViewItem, setQuickViewItem] = useState(null);"
content = content.replace("  const [hoveredCard, setHoveredCard] = useState(null);", state_statement)

# Add onQuickView={setQuickViewItem} to all ContentRails
content = content.replace("<ContentRail", "<ContentRail\n            onQuickView={setQuickViewItem}")

# Add QuickViewModal at the end
end_statement = """        {showBengaliRail && (
          <ContentRail
            onQuickView={setQuickViewItem}
            title="Bengali Picks"
            subtitle="Local language highlights"
            items={content.bengali}
            viewAllLink="/browse?language=Bengali"
          />
        )}
      </div>
      <QuickViewModal isOpen={!!quickViewItem} item={quickViewItem} onClose={() => setQuickViewItem(null)} />
    </div>
  );"""

content = content.replace("""        {showBengaliRail && (
          <ContentRail
            onQuickView={setQuickViewItem}
            title="Bengali Picks"
            subtitle="Local language highlights"
            items={content.bengali}
            viewAllLink="/browse?language=Bengali"
          />
        )}
      </div>
    </div>
  );""", end_statement)

with open("frontend/src/pages/HomePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
