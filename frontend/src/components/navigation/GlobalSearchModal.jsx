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
      inputRef.current.focus();
    } else {
      setQuery('');
      setResults([]);
    }
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
    position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5, 12, 22, 0.6)',
    backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh'
  },
  modal: {
    width: '100%', maxWidth: '600px', background: 'rgba(13, 26, 45, 0.85)', borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
  },
  modalMobile: { width: '90%', maxWidth: 'none' },
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
