import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MobileNav from './MobileNav';
import ProfileMenu from './ProfileMenu';
import { useBreakpoint, useTVMode } from '../../hooks';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/movies', label: 'Movies' },
  { path: '/series', label: 'Series' },
  { path: '/tv', label: 'Live TV' },
  { path: '/browse', label: 'Browse' },
  { path: '/watchlist', label: 'Watchlist' },
];

function TopNav() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  const { isMobile, isTablet, isSmallMobile, width } = useBreakpoint();
  const isTVMode = useTVMode();
  const isDesktop = !isMobile && !isTablet;
  const isCompactDesktop = isDesktop && width < 1520;
  const isWideDesktop = isDesktop && width >= 1520;
  const isTightDesktop = isDesktop && width < 1380;
  const isVeryTightDesktop = isDesktop && width < 1280;
  const showSubtitle = isDesktop && width >= 1560;
  const showFullSearchText = isDesktop && width >= 1480;
  const showLiveChip = isDesktop && width >= 1600;
  const visibleNavItems = isTightDesktop ? navItems.filter((item) => item.path !== '/watchlist') : navItems;

  const [user] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navClasses = [
    'top-nav-container',
    isMobile && 'top-nav-mobile',
    isTablet && 'top-nav-tablet',
    isScrolled && 'top-nav-scrolled',
    isTVMode && 'tv-mode'
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'top-nav-main',
    isCompactDesktop && 'top-nav-compact',
    isMobile && 'top-nav-mobile-container'
  ].filter(Boolean).join(' ');

  const logoClasses = [
    'top-nav-logo',
    isSmallMobile && 'top-nav-logo-compact'
  ].filter(Boolean).join(' ');

  const logoCopyClasses = [
    'top-nav-logo-copy',
    isSmallMobile && 'top-nav-logo-copy-compact'
  ].filter(Boolean).join(' ');

  const linksClasses = [
    'top-nav-links',
    isTablet && 'top-nav-links-tablet',
    isCompactDesktop && 'top-nav-links-compact'
  ].filter(Boolean).join(' ');

  const actionsClasses = [
    'top-nav-actions',
    isTablet && 'top-nav-actions-tablet',
    isCompactDesktop && 'top-nav-actions-compact'
  ].filter(Boolean).join(' ');

  const searchClasses = [
    'top-nav-search',
    isCompactDesktop && 'top-nav-search-compact',
    isWideDesktop && 'top-nav-search-wide',
    isVeryTightDesktop && 'top-nav-search-tight'
  ].filter(Boolean).join(' ');

  const rightSideClasses = [
    'top-nav-right',
    isCompactDesktop && 'top-nav-right-compact'
  ].filter(Boolean).join(' ');

  return (
    <nav
      aria-label="Primary"
      className={navClasses}
    >
      <div className={containerClasses}>
        <Link to="/" className={logoClasses}>
          <span className="top-nav-logo-mark">S4U</span>
          <div className={logoCopyClasses}>
            <span className="top-nav-logo-title">Entertainment Portal</span>
            {!isSmallMobile && showSubtitle && (
              <span className="top-nav-logo-subtitle">Movies, series and live TV in one place</span>
            )}
          </div>
        </Link>

        {!isMobile && (
          <ul className={linksClasses}>
            {visibleNavItems.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              const linkClasses = [
                'top-nav-link',
                isTablet || isCompactDesktop ? 'top-nav-link-tablet' : '',
                isActive && 'top-nav-link-active',
                hoveredLink === item.path && !isActive && 'top-nav-link-hover'
              ].filter(Boolean).join(' ');

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={linkClasses}
                    onMouseEnter={() => setHoveredLink(item.path)}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!isMobile && (
          <div className={actionsClasses}>
            <button
              type="button"
              className={searchClasses}
              onClick={() => window.dispatchEvent(new Event('open-global-search'))}
            >
              <span className="top-nav-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <span className="top-nav-search-text">
                {isVeryTightDesktop ? '' : isTablet || !showFullSearchText ? 'Search' : 'Search movies, actors, genres'}
              </span>
              {showFullSearchText && !isVeryTightDesktop && (
                <span className="top-nav-search-hint">CTRL+K</span>
              )}
            </button>

            {showLiveChip && (
              <Link to="/tv" className="top-nav-live-chip">
                <span className="top-nav-live-dot" />
                <span>Live now</span>
              </Link>
            )}
          </div>
        )}

        <div className={rightSideClasses}>
          {!isMobile && <ProfileMenu user={user} compact={isCompactDesktop || !showLiveChip} />}
          {isMobile && <MobileNav />}
        </div>
      </div>
    </nav>
  );
}

export default TopNav;