// Standardized typography
export const TYPO = {
  heroTitle: 'clamp(2.4rem, 5vw, 4.2rem)',      // Hero carousel & detail pages
  heroTitleMobile: 'clamp(2rem, 8vw, 3rem)',
  sectionTitle: 'clamp(1.3rem, 2.5vw, 1.8rem)',  // ContentRail section titles
  cardTitle: '0.88rem',                            // Card poster titles
  body: '1rem',                                    // Body text
  bodySmall: '0.9rem',
  caption: '0.72rem',
  badge: '0.68rem',
};

// Standardized border-radius
export const RADIUS = {
  card: 14,
  badge: 8,
  chip: 999,      // pill shape
  modal: 32,
  button: 14,
};

// Standardized spacing
export const GAP = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
};

// Standardized meta chip style
export const META_CHIP = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontWeight: '700',
  fontSize: '0.88rem',
  letterSpacing: '0.04em',
};

// Standardized genre tag style
export const GENRE_TAG = {
  padding: '8px 16px',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#ffffff',
  fontSize: '0.8rem',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

// Standardized rating badge style (for detail pages)
export const RATING_BOX = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(0, 255, 255, 0.1)',
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(0, 255, 255, 0.3)',
};

// Standardized play button
export const PLAY_BTN = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  padding: '16px 36px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-secondary))',
  color: '#050c16',
  fontWeight: '900',
  fontSize: '1rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

// Standardized secondary button
export const SECONDARY_BTN = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 28px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff',
  fontWeight: '800',
  fontSize: '0.95rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textDecoration: 'none',
  cursor: 'pointer',
};

// Standardized type badge (Movie/Series)
export const TYPE_BADGE = {
  padding: '5px 10px',
  borderRadius: '8px',
  background: 'rgba(5, 12, 22, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  color: '#ffffff',
  fontSize: '0.72rem',
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

// Standardized quality badge
export const QUALITY_BADGE = {
  padding: '6px 12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff',
  fontSize: '0.78rem',
  fontWeight: '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
