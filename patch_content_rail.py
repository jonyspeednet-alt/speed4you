import sys

with open("frontend/src/features/home/components/ContentRail.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update ContentCard eager=... block
bad_block1 = """            eager={index < priorityCount}
            compact={isMobile}
            tablet={isTablet}
          />
        ))}"""

good_block1 = """            eager={index < priorityCount}
            compact={isMobile}
            tablet={isTablet}
            onQuickView={() => onQuickView && onQuickView(item)}
          />
        ))}"""
content = content.replace(bad_block1, good_block1)

# 2. Update ContentCard <Link> to <div>
bad_block2 = """    >
      <Link
        to={linkPath}
        style={{ ...styles.card, animationDelay: `${index * 60}ms` }}
      >
        <div"""

good_block2 = """    >
      <div
        style={{ ...styles.card, animationDelay: `${index * 60}ms`, cursor: 'pointer' }}
        onClick={(e) => {
          if (onQuickView) {
            e.preventDefault();
            onQuickView();
          }
        }}
      >
        <div"""
content = content.replace(bad_block2, good_block2)

# 3. Update closing </Link> to </div>
bad_block3 = """        </div>
      </Link>
    </div>
  );"""

good_block3 = """        </div>
      </div>
    </div>
  );"""
content = content.replace(bad_block3, good_block3)

with open("frontend/src/features/home/components/ContentRail.jsx", "w", encoding="utf-8") as f:
    f.write(content)
