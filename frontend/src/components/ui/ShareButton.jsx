import { useState } from 'react';
import { useToast } from './useToast';

function ShareButton({ title, text, url, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { show } = useToast();

  async function handleShare(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    setLoading(true);
    
    const shareUrl = url || window.location.href;
    const shareData = {
      title: title || 'ISP Entertainment Portal',
      text: text || `Check out ${title} on ISP Entertainment Portal!`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        // Successful share
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        show({ message: 'Link copied to clipboard!', type: 'success', icon: '✓' });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        show({ message: 'Could not share link', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  const icon = (
    <svg viewBox="0 0 24 24" width={compact ? "15" : "16"} height={compact ? "15" : "16"} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  if (compact) {
    return (
      <button
        onClick={handleShare}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.compact,
          ...(hovered ? styles.compactHover : {}),
        }}
        aria-label={`Share ${title}`}
        disabled={loading}
      >
        {loading ? <span style={styles.spinner} aria-hidden="true" /> : icon}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.btn,
        ...(hovered ? styles.btnHover : {}),
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.25)' : 'none',
      }}
      aria-label={`Share ${title}`}
      disabled={loading}
    >
      {loading ? <span style={styles.spinner} aria-hidden="true" /> : icon}
    </button>
  );
}

const styles = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'var(--text-primary)',
    transition: 'background 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease',
    cursor: 'pointer',
    flexShrink: 0,
  },
  btnHover: {
    background: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  compact: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'rgba(7,17,31,0.72)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
    cursor: 'pointer',
  },
  compactHover: {
    background: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: 'currentColor',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
};

export default ShareButton;
