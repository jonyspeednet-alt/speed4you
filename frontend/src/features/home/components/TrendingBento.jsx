import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBreakpoint, useTVMode } from '../../../hooks';
import WatchlistButton from '../../../components/ui/WatchlistButton';

export default function TrendingBento({ items, onQuickView }) {
  const { isMobile, isTablet } = useBreakpoint();
  const isTVMode = useTVMode();
  const displayItems = items.slice(0, 5);

  if (displayItems.length < 5 && !isMobile) return null;

  return (
    <section style={{
      ...styles.section,
      ...(isTVMode ? styles.sectionTV : {})
    }}>
      <div style={styles.header}>
        <span style={styles.eyebrow}>Viral Hits</span>
        <h2 style={styles.title}>Trending Right Now</h2>
      </div>

      <div style={{
        ...styles.grid,
        ...(isMobile ? styles.gridMobile : isTablet ? styles.gridTablet : {}),
        ...(isTVMode ? styles.gridTV : {})
      }}>
        {displayItems.map((item, index) => (
          <BentoItem 
            key={item.id} 
            item={item} 
            index={index} 
            onQuickView={onQuickView}
            isLarge={index === 0 && !isMobile && !isTVMode}
            tv={isTVMode}
          />
        ))}
      </div>
    </section>
  );
}

function BentoItem({ item, index, onQuickView, isLarge, tv }) {
  const [hovered, setHovered] = useState(false);
  const isSeries = item.type === 'series';

  return (
    <div 
      style={{
        ...styles.item,
        ...(isLarge ? styles.itemLarge : {}),
        ...(hovered ? styles.itemHovered : {}),
        ...(tv ? styles.itemTV : {})
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      onFocus={() => tv && setHovered(true)}
      onBlur={() => tv && setHovered(false)}
    >
      <img 
        src={isLarge ? (item.backdrop || item.poster) : item.poster} 
        alt={item.title} 
        style={{
          ...styles.image,
          ...(hovered ? styles.imageHovered : {})
        }}
      />
      <div style={{
        ...styles.overlay,
        ...(hovered ? styles.overlayHovered : {})
      }} />
      
      <div style={styles.content}>
        <div style={styles.topRow}>
          <span style={styles.rank}>#{index + 1}</span>
          <span style={styles.type}>{isSeries ? 'Series' : 'Movie'}</span>
        </div>
        
        <div style={styles.bottomRow}>
          <h3 style={{
            ...styles.itemTitle,
            ...(isLarge ? styles.itemTitleLarge : {})
          }}>{item.title}</h3>
          
          {hovered && (
            <div style={styles.actions}>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onQuickView(item);
                }}
                style={styles.quickViewBtn}
              >
                Quick View
              </button>
              <WatchlistButton 
                contentType={item.type} 
                contentId={item.id} 
                title={item.title}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {isLarge && <div style={styles.glow} />}
    </div>
  );
}

const styles = {
  sectionTV: {
    width: 'min(1720px, calc(100vw - 120px))',
    margin: '60px auto',
  },
  gridTV: {
    display: 'flex',
    overflowX: 'auto',
    padding: '20px 0',
    gap: '24px',
    scrollbarWidth: 'none',
  },
  itemTV: {
    minWidth: '320px',
    height: '480px',
    flexShrink: 0,
  },
  header: {
    marginBottom: '24px',
  },
  eyebrow: {
    color: 'var(--accent-pink)',
    fontSize: '0.75rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    color: '#fff',
    fontSize: '2rem',
    fontWeight: '900',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, 220px)',
    gap: '16px',
  },
  gridTablet: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(3, 240px)',
  },
  gridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    background: '#0d1a2d',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  itemLarge: {
    gridColumn: 'span 2',
    gridRow: 'span 2',
  },
  itemHovered: {
    transform: 'scale(1.02)',
    borderColor: 'rgba(0, 255, 255, 0.4)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 255, 0.1)',
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 600ms ease',
  },
  imageHovered: {
    transform: 'scale(1.1)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(5, 12, 22, 0.95) 0%, rgba(5, 12, 22, 0.2) 50%, transparent 100%)',
    transition: 'opacity 300ms ease',
  },
  overlayHovered: {
    background: 'linear-gradient(to top, rgba(5, 12, 22, 0.98) 0%, rgba(5, 12, 22, 0.4) 60%, rgba(0, 255, 255, 0.1) 100%)',
  },
  content: {
    position: 'absolute',
    inset: 0,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rank: {
    fontSize: '1.5rem',
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'var(--font-family-display)',
    WebkitTextStroke: '1px rgba(255, 255, 255, 0.5)',
    textStroke: '1px rgba(255, 255, 255, 0.5)',
  },
  type: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    fontSize: '0.65rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#fff',
    letterSpacing: '0.05em',
  },
  bottomRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#fff',
    lineHeight: '1.2',
  },
  itemTitleLarge: {
    fontSize: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    animation: 'fadeUp 300ms ease-out',
  },
  quickViewBtn: {
    padding: '8px 16px',
    borderRadius: '999px',
    background: 'var(--accent-cyan)',
    color: '#050c16',
    fontSize: '0.8rem',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  glow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(0, 255, 255, 0.05), transparent 70%)',
    pointerEvents: 'none',
    zIndex: 1,
  }
};
