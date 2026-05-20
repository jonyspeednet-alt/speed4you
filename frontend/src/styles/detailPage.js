const posterFallback = '/portal/assets/poster-placeholder.svg';

export const posterFallbackUrl = posterFallback;

export const DETAIL_SKELETON = {
  page: { minHeight: '100vh', paddingTop: 88, position: 'relative', overflow: 'hidden', background: '#050c16' },
  hero: { position: 'relative', minHeight: '75vh', display: 'flex', alignItems: 'center', padding: '40px 0' },
  skeletonBlock: { background: 'rgba(255,255,255,0.08)', borderRadius: '24px' },
  skeletonLine: { background: 'rgba(255,255,255,0.08)', borderRadius: '999px' },
  heroGradient: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050c16 0%, transparent 40%)' },
  heroInner: {
    position: 'relative', zIndex: 2, width: 'min(1720px, calc(100vw - 96px))',
    margin: '0 auto', display: 'grid',
    gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
    gap: '60px', alignItems: 'center',
  },
  heroInnerTablet: { gridTemplateColumns: '1fr', gap: '32px' },
  heroInnerMobile: { gridTemplateColumns: '1fr', gap: '24px', padding: '20px 16px', alignItems: 'start' },
  posterWrap: {
    position: 'relative', borderRadius: '24px', overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)',
    aspectRatio: '2/3', minWidth: '260px',
  },
  posterWrapMobile: { width: '100%', maxWidth: '340px', margin: '0 auto', aspectRatio: '2/3' },
  posterGlow: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 40%)',
    pointerEvents: 'none',
  },
  poster: { width: '100%', height: '100%', objectFit: 'cover' },
  infoPanel: { display: 'flex', flexDirection: 'column', gap: '20px' },
  infoPanelMobile: { gap: '16px' },
  eyebrowRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  eyebrow: {
    color: 'var(--accent-pink)', textTransform: 'uppercase',
    letterSpacing: '0.2em', fontSize: '0.75rem', fontWeight: '900',
  },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' },
  genreRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  infoPanelBlock: {
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
};

export const DETAIL_STYLES = {
  page: { minHeight: '100vh', paddingTop: 88, position: 'relative', overflow: 'hidden', background: '#050c16' },

  auroraOrb: {
    position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%',
    filter: 'blur(120px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none',
  },

  hero: { position: 'relative', minHeight: '75vh', display: 'flex', alignItems: 'center', padding: '40px 0' },
  backdropWrap: { position: 'absolute', inset: 0, zIndex: 0 },
  backdropImg: {
    width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%',
  },
  backdropOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(105deg, rgba(5,12,22,0.95) 10%, rgba(5,12,22,0.4) 40%, rgba(5,12,22,0.2) 60%, rgba(5,12,22,0.9) 100%)',
  },
  heroGradient: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050c16 0%, transparent 40%)' },

  heroInner: {
    position: 'relative', zIndex: 2, width: 'min(1720px, calc(100vw - 96px))',
    margin: '0 auto', display: 'grid',
    gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
    gap: '60px', alignItems: 'center',
  },
  heroInnerTablet: { gridTemplateColumns: '1fr', gap: '32px' },
  heroInnerMobile: { gridTemplateColumns: '1fr', gap: '24px', padding: '20px 16px', alignItems: 'start' },

  posterWrap: {
    position: 'relative', borderRadius: '24px', overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.12)',
    aspectRatio: '2/3', minWidth: '260px',
  },
  posterGlow: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 40%)',
    pointerEvents: 'none',
  },
  poster: { width: '100%', height: '100%', objectFit: 'cover' },
  posterWrapMobile: { width: '100%', maxWidth: '340px', margin: '0 auto', aspectRatio: '2/3' },

  originalTitle: { margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.98rem', lineHeight: 1.6 },

  infoPanel: { display: 'flex', flexDirection: 'column', gap: '20px' },
  infoPanelMobile: { gap: '16px' },
  eyebrowRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  eyebrow: {
    color: 'var(--accent-pink)', textTransform: 'uppercase',
    letterSpacing: '0.2em', fontSize: '0.75rem', fontWeight: '900',
  },

  title: {
    fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', fontWeight: '900', color: '#ffffff',
    lineHeight: '1.05', letterSpacing: '-0.03em', textShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  titleMobile: { fontSize: 'clamp(2rem, 8vw, 3rem)' },

  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' },
  ratingBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(0, 255, 255, 0.1)', padding: '6px 12px',
    borderRadius: '8px', border: '1px solid rgba(0, 255, 255, 0.3)',
  },
  ratingVal: { color: 'var(--accent-cyan)', fontWeight: '900', fontSize: '1rem' },
  metaChip: {
    color: 'rgba(255, 255, 255, 0.7)', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.04em',
  },

  genreRow: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  genreTag: {
    padding: '8px 16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '0.8rem',
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },

  btnFull: { width: '100%' },

  descWrap: { display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '720px' },
  description: { margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '1rem', lineHeight: 1.76 },
  descClamped: {
    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  readMore: {
    appearance: 'none', border: 'none', background: 'none', color: 'var(--accent-cyan)',
    cursor: 'pointer', fontWeight: '900', letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: 0,
  },

  actions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '18px', flexWrap: 'wrap',
  },
  actionsMobile: { flexDirection: 'column', alignItems: 'stretch' },
  playBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '12px', padding: '18px 40px', borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-secondary))',
    color: '#050c16', fontWeight: '900', fontSize: '1.05rem',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)', textDecoration: 'none',
  },

  body: {
    position: 'relative', zIndex: 2, width: 'min(1720px, calc(100vw - 96px))',
    margin: '0 auto', padding: '36px 24px 64px',
    display: 'flex', flexDirection: 'column', gap: '28px',
  },

  detailGrid: {
    display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.2fr)', gap: '24px',
  },
  detailGridMobile: { gridTemplateColumns: '1fr' },

  card: {
    padding: '32px', borderRadius: '24px', background: 'rgba(13, 26, 45, 0.42)',
    border: '1px solid rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(20px)',
  },
  cardTitle: { margin: '0 0 18px 0', color: '#ffffff', fontSize: '1.15rem', fontWeight: '900' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' },
  statItem: {
    display: 'flex', flexDirection: 'column', gap: '6px', padding: '18px',
    borderRadius: '18px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase',
    letterSpacing: '0.14em', fontWeight: '700',
  },
  statValue: { fontSize: '1.05rem', fontWeight: '900', color: '#ffffff' },

  synopsisText: { margin: 0, color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, fontSize: '0.98rem' },

  browseMore: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' },
  browseBtn: {
    padding: '12px 24px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', fontSize: '0.85rem',
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none',
  },

  errorState: {
    minHeight: '60vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '16px',
    color: '#ffffff', textAlign: 'center', padding: '40px 16px',
  },
  backLink: { marginTop: '12px', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: '900' },

  skeletonBlock: { background: 'rgba(255,255,255,0.08)', borderRadius: '24px' },
  skeletonLine: { background: 'rgba(255,255,255,0.08)', borderRadius: '999px' },
};
