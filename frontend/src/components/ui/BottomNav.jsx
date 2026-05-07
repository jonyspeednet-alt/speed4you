import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    path: '/movies',
    label: 'Movies',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" fill={active ? 'currentColor' : 'none'} opacity={active ? '0.18' : '1'} />
        <path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5" />
      </svg>
    ),
  },
  {
    path: '/series',
    label: 'Series',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? '0.18' : '1'} />
        <path d="M9 21h6M12 17v4" />
      </svg>
    ),
  },
  {
    path: '/tv',
    label: 'Live',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" opacity={active ? '1' : '0.9'} />
      </svg>
    ),
  },
  {
    path: '/browse',
    label: 'Browse',
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill={active ? 'currentColor' : 'none'} opacity={active ? '0.18' : '1'} />
        <path d="M20 20l-4-4" />
      </svg>
    ),
  },
];

function BottomNav() {
  const location = useLocation();
  const [pressedItem, setPressedItem] = useState(null);

  if (location.pathname.startsWith('/watch/')) return null;

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            style={{
              ...styles.item,
              ...(isActive ? styles.itemActive : {}),
              transform: pressedItem === item.path ? 'scale(0.96)' : 'scale(1)',
            }}
            onMouseDown={() => setPressedItem(item.path)}
            onMouseUp={() => setPressedItem(null)}
            onTouchStart={() => setPressedItem(item.path)}
            onTouchEnd={() => setPressedItem(null)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={`bottom-nav-icon${isActive ? ' active' : ''}`} style={{ ...styles.iconWrap, ...(isActive ? styles.iconWrapActive : {}) }}>
              {item.icon(isActive)}
            </span>
            <span className={`bottom-nav-label${isActive ? ' active' : ''}`} style={{ ...styles.label, ...(isActive ? styles.labelActive : {}) }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px calc(var(--safe-bottom) + 8px)',
    borderRadius: '24px 24px 0 0',
    background: 'rgba(7, 17, 31, 0.94)',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(26px)',
    boxShadow: '0 -10px 24px rgba(0, 0, 0, 0.24)',
  },
  item: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    minHeight: '48px',
    padding: '6px 4px',
    borderRadius: '16px',
    color: 'var(--text-muted)',
  },
  itemActive: {
    color: 'var(--text-primary)',
    background: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrap: {
    display: 'grid',
    placeItems: 'center',
    width: '38px',
    height: '30px',
    borderRadius: '12px',
  },
  iconWrapActive: {
    background: 'linear-gradient(135deg, #fff1df 0%, var(--accent-primary) 50%, var(--accent-secondary) 100%)',
    color: '#08111d',
    boxShadow: '0 10px 24px rgba(121, 228, 255, 0.2)',
  },
  label: {
    fontSize: '0.64rem',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  labelActive: {
    color: 'var(--text-primary)',
  },
};

export default BottomNav;
