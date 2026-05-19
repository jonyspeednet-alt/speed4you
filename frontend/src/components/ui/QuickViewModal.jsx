import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import WatchlistButton from './WatchlistButton';

export default function QuickViewModal({ isOpen, onClose, item }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isSeries = item.type === 'series';
  const linkPath = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
  const playPath = `/watch/${item.id}`;

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div 
        style={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close preview">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div style={styles.header}>
          <img src={item.backdrop || item.poster} alt={item.title} style={styles.backdrop} />
          <div style={styles.headerGradient} />
          <div style={styles.titleContent}>
            <h2 style={styles.title}>{item.title}</h2>
            <div style={styles.metaRow}>
              <div style={styles.ratingBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-cyan)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                <span style={styles.ratingVal}>{item.rating || 'N/A'}</span>
              </div>
              <span style={styles.metaChip}>{item.year || 'Unknown'}</span>
              <span style={styles.typeBadge}>{isSeries ? 'Series' : 'Movie'}</span>
              {item.runtime && <span style={styles.metaChip}>{item.runtime} min</span>}
              {(item.language || item.originalLanguage) && <span style={styles.metaChip}>{item.language || item.originalLanguage}</span>}
            </div>
          </div>
        </div>

        <div style={styles.body}>
          <div style={styles.actions}>
            <Link to={playPath} style={styles.playBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Now
            </Link>
            <Link to={linkPath} style={styles.infoBtn}>
              More Info
            </Link>
            <WatchlistButton 
              contentType={isSeries ? 'series' : 'movie'} 
              contentId={item.id} 
              title={item.title} 
              compact={false}
            />
          </div>

          <p style={styles.overview}>
            {item.description || 'Get ready for an incredible streaming experience. This title is highly recommended by our curators.'}
          </p>

          <div style={styles.detailsGrid}>
            {Array.isArray(item.genres) && item.genres.length > 0 ? (
              <div style={styles.genreRow}>
                {item.genres.map((g) => (
                  <span key={g} style={styles.genreTag}>{g}</span>
                ))}
              </div>
            ) : item.genre ? (
              <div style={styles.genreRow}>
                {String(item.genre).split(',').map((g) => g.trim()).filter(Boolean).map((g) => (
                  <span key={g} style={styles.genreTag}>{g}</span>
                ))}
              </div>
            ) : null}
            <div style={styles.infoRow}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Language</span>
                <span style={styles.infoValue}>{item.language || item.originalLanguage || 'Unknown'}</span>
              </div>
              {item.runtime && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Runtime</span>
                  <span style={styles.infoValue}>{item.runtime} min</span>
                </div>
              )}
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Type</span>
                <span style={styles.infoValue}>{isSeries ? 'Series' : 'Movie'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(5, 12, 22, 0.5)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 300ms ease-out',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '900px',
    backgroundColor: '#050c16',
    borderRadius: '32px',
    overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
    animation: 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  closeBtn: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    zIndex: 10,
    background: 'rgba(5, 12, 22, 0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.2s',
  },
  header: {
    position: 'relative',
    height: '420px',
    width: '100%',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 20%',
  },
  headerGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(5,12,22,0.2) 0%, rgba(5,12,22,0.4) 50%, #050c16 100%), linear-gradient(105deg, rgba(5,12,22,0.8) 0%, transparent 60%)',
  },
  titleContent: {
    position: 'absolute',
    bottom: '24px',
    left: '40px',
    right: '40px',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: '900',
    color: '#fff',
    marginBottom: '16px',
    lineHeight: '1.05',
    letterSpacing: '-0.03em',
    textShadow: '0 10px 30px rgba(0,0,0,0.6)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  ratingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0, 255, 255, 0.1)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0, 255, 255, 0.3)',
  },
  ratingVal: {
    color: 'var(--accent-cyan)',
    fontWeight: '900',
    fontSize: '1rem',
  },
  metaChip: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    fontSize: '0.9rem',
    letterSpacing: '0.04em',
  },
  typeBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ffffff',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  body: {
    padding: '0 40px 40px',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  playBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-secondary))',
    color: '#050c16',
    padding: '16px 36px',
    borderRadius: '14px',
    fontWeight: '900',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
    textDecoration: 'none',
    transition: 'transform 0.2s',
    whiteSpace: 'nowrap',
  },
  infoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '14px',
    fontWeight: '800',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  overview: {
    fontSize: '1.15rem',
    lineHeight: '1.7',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '32px',
    maxWidth: '60ch',
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '24px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  genreRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  genreTag: {
    padding: '6px 14px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '0.78rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  infoRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  infoValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.95rem',
  },
};
