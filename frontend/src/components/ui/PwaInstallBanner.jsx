import { useState, useEffect } from 'react';
import { useBreakpoint } from '../../hooks';

function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <img src="/favicon.svg" alt="App Icon" style={styles.icon} />
        <div style={styles.textWrap}>
          <strong style={styles.title}>Install ISP Portal</strong>
          <span style={styles.subtitle}>Add to home screen for quick access</span>
        </div>
      </div>
      <div style={styles.actions}>
        <button style={styles.cancelBtn} onClick={handleDismiss}>Not Now</button>
        <button style={styles.installBtn} onClick={handleInstall}>Install</button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: '80px',
    left: '16px',
    right: '16px',
    background: 'rgba(20, 25, 35, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeUp 0.4s ease',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
  },
  textWrap: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  installBtn: {
    padding: '8px 16px',
    background: 'var(--accent-amber)',
    border: 'none',
    color: '#000',
    fontWeight: 'bold',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(255,200,87,0.3)',
    cursor: 'pointer',
  }
};

export default PwaInstallBanner;
