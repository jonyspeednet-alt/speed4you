import { useRef, useState } from 'react';
import ContentCard from '../../../components/media/ContentCard';
import { useBreakpoint, useTVMode } from '../../../hooks';

function ContentRail({ title, items, type = 'default', subtitle = 'Curated now', viewAllLink, priorityCount = 0, onQuickView }) {
  const scrollRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();
  const isTVMode = useTVMode();
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);

  const accent = title.includes('Bengali')
    ? 'var(--accent-violet)'
    : title.includes('Trending')
      ? 'var(--accent-pink)'
      : 'var(--accent-cyan)';

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -380 : 380, behavior: 'smooth' });
  };

  return (
    <section className="content-rail-section" style={styles.section}>
      <div className={`content-rail-header${isMobile ? ' content-rail-header--mobile' : ''}`} style={{ ...styles.header, ...(isTVMode ? styles.headerTV : isMobile ? styles.headerMobile : {}) }}>
        <div>
          <span className="content-rail-eyebrow" style={{ ...styles.eyebrow, color: accent }}>{subtitle}</span>
          <h2 className="content-rail-title" style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>{title}</h2>
        </div>

        <div className="content-rail-actions" style={styles.headerActions}>
          {viewAllLink ? <a className="content-rail-view-all" href={viewAllLink} style={styles.viewAll}>Open shelf</a> : null}
          {!isMobile && (
            <div className="content-rail-controls" style={styles.controls}>
              <button type="button" aria-label={`Scroll ${title} left`} onClick={() => scroll('left')} onMouseEnter={() => setLeftHovered(true)} onMouseLeave={() => setLeftHovered(false)} style={{ ...styles.arrow, ...(leftHovered ? styles.arrowHover : {}) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <button type="button" aria-label={`Scroll ${title} right`} onClick={() => scroll('right')} onMouseEnter={() => setRightHovered(true)} onMouseLeave={() => setRightHovered(false)} style={{ ...styles.arrow, ...(rightHovered ? styles.arrowHover : {}) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="content-rail-list" style={{ ...styles.rail, ...(isTVMode ? styles.railTV : isMobile ? styles.railMobile : {}) }} ref={scrollRef}>
        {items.map((item, index) => (
          <ContentCard
            key={item.id}
            item={item}
            index={index}
            type={type}
            eager={index < priorityCount}
            compact={isMobile}
            tablet={isTablet}
            tv={isTVMode}
            onQuickView={() => onQuickView && onQuickView(item)}
          />
        ))}
      </div>
    </section>
  );
}



const styles = {
  section: {
    padding: 'var(--spacing-md) 0 var(--spacing-lg)',
  },
  header: {
    width: 'min(1440px, calc(100vw - 48px))',
    margin: '0 auto 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: '14px',
  },
  headerMobile: {
    width: 'min(1440px, calc(100vw - 24px))',
    alignItems: 'start',
  },
  headerTV: {
    width: 'min(1720px, calc(100vw - 96px))',
    marginBottom: '24px',
  },
  eyebrow: {
    display: 'inline-block',
    marginBottom: '6px',
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
  },
  titleMobile: {
    fontSize: '1.35rem',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  viewAll: {
    padding: '9px 14px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    color: 'var(--text-muted)',
    fontSize: '0.76rem',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
  controls: {
    display: 'flex',
    gap: '6px',
  },
  arrow: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    color: 'var(--text-muted)',
    display: 'grid',
    placeItems: 'center',
  },
  arrowHover: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--text-primary)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  rail: {
    display: 'flex',
    gap: '16px',
    padding: '6px max(24px, calc((100vw - 1440px) / 2)) 16px',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'none',
  },
  railMobile: {
    gap: '12px',
    padding: '4px 12px 8px',
  },
  railTV: {
    gap: '20px',
    padding: '6px max(48px, calc((100vw - 1720px) / 2)) 16px',
  },
};

export default ContentRail;
