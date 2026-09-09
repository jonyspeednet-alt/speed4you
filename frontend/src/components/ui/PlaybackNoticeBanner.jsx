import { useState, useEffect } from 'react';

const STORAGE_KEY = 'speed4you_dismissed_playback_notice';

export default function PlaybackNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div style={bannerStyles.wrap} role="region" aria-label="Playback Notice">
      <div style={bannerStyles.inner}>
        <div style={bannerStyles.content}>
          <span style={bannerStyles.badge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px', verticalAlign: '-2px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            প্লেব্যাক নোটিশ
          </span>
          <span style={bannerStyles.text}>
            অনেক ভিডিওর অডিও ফরম্যাট (AC3/5.1) ব্রাউজারে সরাসরি চলে না। সাউন্ড বা প্লেব্যাক সমস্যা হলে ফাইলটি <strong>Download</strong> করে <strong>VLC Player</strong> অথবা <strong>MX Player</strong> দিয়ে উপভোগ করুন।
          </span>
        </div>
        <button
          onClick={handleDismiss}
          style={bannerStyles.closeBtn}
          title="নোটিশ বন্ধ করুন"
          aria-label="Close notice"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const bannerStyles = {
  wrap: {
    background: 'linear-gradient(90deg, rgba(14, 28, 48, 0.95) 0%, rgba(20, 36, 60, 0.95) 50%, rgba(14, 28, 48, 0.95) 100%)',
    borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    position: 'relative',
    zIndex: 990,
  },
  inner: {
    maxWidth: '1360px',
    margin: '0 auto',
    padding: '9px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    fontSize: '0.86rem',
    color: '#d4e4f7',
    lineHeight: '1.45',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    borderRadius: '6px',
    background: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid rgba(0, 240, 255, 0.4)',
    color: '#00f0ff',
    fontWeight: '700',
    fontSize: '0.75rem',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    minWidth: '240px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 150ms ease, background 150ms ease',
  },
};
