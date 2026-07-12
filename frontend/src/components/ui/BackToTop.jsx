import { useEffect, useState } from 'react';

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      style={styles.button}
      aria-label="Back to top"
      type="button"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

const styles = {
  button: {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    zIndex: 999,
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(5, 12, 22, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    transition: 'transform 200ms ease, background 200ms ease',
    padding: 0,
  },
};

export default BackToTop;
