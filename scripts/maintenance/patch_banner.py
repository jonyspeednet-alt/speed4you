import sys

with open("frontend/src/features/home/components/HeroBanner.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("function HeroBanner({ content }) {", "function HeroBanner({ content: contentItems }) {")

content = content.replace("  const bgRef = useRef(null);", """  const bgRef = useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  
  React.useEffect(() => {
    if (!Array.isArray(contentItems) || contentItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % contentItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [contentItems]);

  const content = Array.isArray(contentItems) ? contentItems[activeIndex] : contentItems;
  if (!content) return null;""")

content = content.replace("import { useEffect, useRef } from 'react';", "import React, { useEffect, useRef } from 'react';")

# Add pagination dots before the background closing tag
content = content.replace("        <div style={styles.overlay} />\n      </div>", """        <div style={styles.overlay} />
        {Array.isArray(contentItems) && contentItems.length > 1 && (
          <div style={styles.carouselDots}>
            {contentItems.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setActiveIndex(i)}
                style={i === activeIndex ? styles.dotActive : styles.dot}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>""")

# Add dot styles
content = content.replace("  heroMobile: { minHeight: '85vh', maxHeight: 'none' },", """  heroMobile: { minHeight: '85vh', maxHeight: 'none' },
  carouselDots: { position: 'absolute', bottom: '32px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' },
  dotActive: { width: '24px', height: '8px', borderRadius: '4px', background: 'var(--accent-amber)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' },""")

with open("frontend/src/features/home/components/HeroBanner.jsx", "w", encoding="utf-8") as f:
    f.write(content)
