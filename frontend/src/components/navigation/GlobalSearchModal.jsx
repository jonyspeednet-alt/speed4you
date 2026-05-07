import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import searchService from '../../services/searchService';
import { useBreakpoint } from '../../hooks';

function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenEvent);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Delay focus on mobile so the modal mounts/positions stably
      // before the soft keyboard pushes the visual viewport around.
      // This prevents the iOS/Android "shake" when opening from the
      // mobile menu.
      if (isMobile) {
        const id = window.setTimeout(() => {
          inputRef.current?.focus({ preventScroll: true });
        }, 220);
        return () => window.clearTimeout(id);
      }
      inputRef.current.focus({ preventScroll: true });
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, isMobile]);

  // Lock body scroll while the modal is open and preserve the scroll
  // position. Using position:fixed + top:-scrollY is the iOS-safe
  // pattern that prevents the page from jumping/shaking when the
  // modal opens (especially when handed off from MobileNav, which
  // also toggles body.overflow).
  useEffect(() => {
    if (!isOpen) return undefined;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      // Restore the user's previous scroll position without animation.
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchService.search(query.trim());
        setResults(res.results?.slice(0, 5) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={() => setIsOpen(false)}>
      <div style={{ ...styles.modal, ...(isMobile ? styles.modalMobile : {}) }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.icon}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, series..."
            style={styles.input}
          />
          <button style={styles.escBtn} onClick={() => setIsOpen(false)}>ESC</button>
        </div>
        
        {loading && <div style={styles.message}>Searching...</div>}
        {!loading && query && results.length === 0 && <div style={styles.message}>No results found</div>}
        
        {!loading && results.length > 0 && (
          <ul style={styles.list}>
            {results.map((item) => (
              <li key={item.id} style={styles.listItem}>
                <button
                  style={styles.resultBtn}
                  onClick={() => {
                    setIsOpen(false);
                    navigate(item.type === 'series' ? `/series/${item.id}` : `/movies/${item.id}`);
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <img src={item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=50'} alt="" style={styles.thumb} />
                  <div style={styles.info}>
                    <span style={styles.title}>{item.title}</span>
                    <span style={styles.meta}>{item.type === 'series' ? 'Series' : 'Movie'} • {item.year || 'N/A'}</span>
                  </div>
                </button>
              </li>
            ))}
            <li style={styles.viewAll}>
              <button
                style={styles.viewAllBtn}
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/browse?q=${encodeURIComponent(query)}`);
                }}
              >
                View all results
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5, 12, 22, 0.78)',
    backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh',
    // Promote the overlay to its own compositor layer so the heavy
    // blur does not repaint the page underneath every frame.
    willChange: 'opacity',
    contain: 'layout paint',
    overscrollBehavior: 'contain'
  },
  modal: {
    width: '100%', maxWidth: '600px', background: 'rgba(13, 26, 45, 0.92)', borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
  },
  modalMobile: {
    width: 'calc(100% - 20px)',
    maxWidth: 'none',
    // Anchor close to the top on mobile so the soft keyboard does
    // not visibly push the modal around when it opens.
    marginTop: '-6vh'
  },
  header: { display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  icon: { color: 'var(--text-muted)', marginRight: '16px' },
  input: { flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', outline: 'none' },
  escBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' },
  message: { padding: '24px', textAlign: 'center', color: '#aaa' },
  list: { listStyle: 'none', margin: 0, padding: '8px' },
  listItem: { marginBottom: '4px' },
  resultBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '12px',
    background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.2s'
  },
  thumb: { width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' },
  info: { display: 'flex', flexDirection: 'column' },
  title: { color: '#fff', fontSize: '1rem', fontWeight: '600' },
  meta: { color: 'var(--text-muted)', fontSize: '0.8rem' },
  viewAll: { marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' },
  viewAllBtn: { width: '100%', padding: '16px', background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }
};

export default GlobalSearchModal;
