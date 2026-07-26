import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";
import LiveUserBadge from "../ui/LiveUserBadge";
import { useBreakpoint, useTVMode } from "../../hooks";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/movies", label: "Movies" },
  { path: "/series", label: "Series" },
  { path: "/tv", label: "Live TV" },
  { path: "/browse", label: "Browse" },
];

const partnerSites = [
  { url: "https://bokasoka.net", label: "Bokasoka", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" },
  { url: "https://cinemabazar.net", label: "Cinemabazar", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" },
];

function TopNav() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPartnerOpen, setIsPartnerOpen] = useState(false);
  const [isOthersOpen, setIsOthersOpen] = useState(false);
  const navRef = useRef(null);
  const { isMobile, isTablet, isSmallMobile, width } = useBreakpoint();
  const isTVMode = useTVMode();
  const isDesktop = !isMobile && !isTablet;
  const isCompactDesktop = isDesktop && width < 1520;
  const isWideDesktop = isDesktop && width >= 1520;
  const isVeryTightDesktop = isDesktop && width < 1280;
  const showSubtitle = isDesktop && width >= 1560;
  const showFullSearchText = isDesktop && width >= 1480;
  const showLiveChip = isDesktop && width >= 1600;
  const isTabletOrCompact = isTablet || isCompactDesktop;
  const primaryNavItems = isTabletOrCompact ? navItems.slice(0, 3) : navItems;
  const overflowNavItems = isTabletOrCompact ? navItems.slice(3) : [];

  const [user] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [workingUrls, setWorkingUrls] = useState(() =>
    Object.fromEntries(partnerSites.map(s => [s.label, s.url.replace("https://", "http://")]))
  );

  useEffect(() => {
    const check = async (site) => {
      const httpUrl = site.url.replace("https://", "http://");
      const httpsUrl = site.url;
      try {
        await fetch(httpUrl, { method: "HEAD", mode: "no-cors" });
        try {
          await fetch(httpsUrl, { method: "HEAD", mode: "no-cors" });
          return [site.label, httpsUrl];
        } catch {
          return [site.label, httpUrl];
        }
      } catch {
        return [site.label, httpUrl];
      }
    };
    Promise.all(partnerSites.map(check)).then((results) => {
      setWorkingUrls(Object.fromEntries(results));
    });
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
    setIsMobileMenuOpen(false);
    setIsPartnerOpen(false);
    setIsOthersOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen && !isMobileMenuOpen && !isPartnerOpen && !isOthersOpen) return;

    const handleClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setIsMoreOpen(false);
        setIsMobileMenuOpen(false);
        setIsPartnerOpen(false);
        setIsOthersOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMoreOpen(false);
        setIsMobileMenuOpen(false);
        setIsPartnerOpen(false);
        setIsOthersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen, isMobileMenuOpen, isPartnerOpen, isOthersOpen]);

  const navClasses = [
    "top-nav-container",
    isMobile && "top-nav-mobile",
    isTablet && "top-nav-tablet",
    isScrolled && "top-nav-scrolled",
    isTVMode && "tv-mode",
  ]
    .filter(Boolean)
    .join(" ");

  const containerClasses = [
    "top-nav-main",
    isCompactDesktop && "top-nav-compact",
    isMobile && "top-nav-mobile-container",
  ]
    .filter(Boolean)
    .join(" ");

  const logoClasses = ["top-nav-logo", isSmallMobile && "top-nav-logo-compact"]
    .filter(Boolean)
    .join(" ");

  const logoCopyClasses = [
    "top-nav-logo-copy",
    isSmallMobile && "top-nav-logo-copy-compact",
  ]
    .filter(Boolean)
    .join(" ");

  const linksClasses = [
    "top-nav-links",
    isTablet && "top-nav-links-tablet",
    isCompactDesktop && "top-nav-links-compact",
  ]
    .filter(Boolean)
    .join(" ");

  const actionsClasses = [
    "top-nav-actions",
    isTablet && "top-nav-actions-tablet",
    isCompactDesktop && "top-nav-actions-compact",
  ]
    .filter(Boolean)
    .join(" ");

  const searchClasses = [
    "top-nav-search",
    isCompactDesktop && "top-nav-search-compact",
    isWideDesktop && "top-nav-search-wide",
    isVeryTightDesktop && "top-nav-search-tight",
  ]
    .filter(Boolean)
    .join(" ");

  const rightSideClasses = [
    "top-nav-right",
    isCompactDesktop && "top-nav-right-compact",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav ref={navRef} aria-label="Primary" className={navClasses}>
      <div className={containerClasses}>
        <Link to="/" className={logoClasses}>
          <img src="/logo.png" alt="Speed4You" className="top-nav-logo-mark" />
          <span className="sr-only">Entertainment Portal</span>
        </Link>

        {!isMobile && (
          <ul className={linksClasses}>
            {primaryNavItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              const linkClasses = [
                "top-nav-link",
                isTablet || isCompactDesktop ? "top-nav-link-tablet" : "",
                isActive && "top-nav-link-active",
                hoveredLink === item.path && !isActive && "top-nav-link-hover",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li key={item.path}>
                  {item.path === "/tv" ? (
                    <a
                      href="http://10.45.45.254/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClasses}
                      onMouseEnter={() => setHoveredLink(item.path)}
                      onMouseLeave={() => setHoveredLink(null)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className={linkClasses}
                      onMouseEnter={() => setHoveredLink(item.path)}
                      onMouseLeave={() => setHoveredLink(null)}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
            {overflowNavItems.length > 0 && (
              <li className="top-nav-more-dropdown">
                <button
                  type="button"
                  className={`top-nav-link ${isTablet || isCompactDesktop ? "top-nav-link-tablet" : ""} ${isMoreOpen ? "top-nav-link-hover" : ""}`}
                  onClick={() => setIsMoreOpen((v) => !v)}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="true"
                >
                  More
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "4px" }} aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isMoreOpen && (
                  <div className="top-nav-more-panel">
                    {overflowNavItems.map((item) => {
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        item.path === "/tv" ? (
                          <a
                            key={item.path}
                            href="http://10.45.45.254/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="top-nav-more-item"
                            onClick={() => setIsMoreOpen(false)}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMoreOpen(false)}
                            className={`top-nav-more-item ${isActive ? "active" : ""}`}
                          >
                            {item.label}
                          </Link>
                        )
                      );
                    })}
                  </div>
                )}
              </li>
            )}
            <li className="top-nav-partner-dropdown">
              <button
                type="button"
                className={`top-nav-link top-nav-partner-btn ${isPartnerOpen ? "top-nav-link-hover" : ""}`}
                onClick={() => setIsPartnerOpen((v) => !v)}
                aria-expanded={isPartnerOpen}
                aria-haspopup="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Partner FTP
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "4px" }} aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isPartnerOpen && (
                <div className="top-nav-partner-panel">
                  {partnerSites.map((site) => (
                    <a
                      key={site.url}
                      href={workingUrls[site.label] || site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="top-nav-more-item"
                      onClick={() => setIsPartnerOpen(false)}
                    >
                      {site.label}
                    </a>
                  ))}
                </div>
              )}
            </li>
            <li className="top-nav-partner-dropdown">
              <button
                type="button"
                className={`top-nav-link top-nav-partner-btn ${isOthersOpen ? "top-nav-link-hover" : ""}`}
                onClick={() => setIsOthersOpen((v) => !v)}
                aria-expanded={isOthersOpen}
                aria-haspopup="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
                Others
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "4px" }} aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isOthersOpen && (
                <div className="top-nav-partner-panel">
                  <a
                    href="https://data.speed4you.net/Software/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="top-nav-more-item"
                    onClick={() => setIsOthersOpen(false)}
                  >
                    Software
                  </a>
                </div>
              )}
            </li>
            <li>
              <a
                href={`${import.meta.env.BASE_URL}speed4you.apk`.replace(/\/\//g, '/')}
                download
                className="top-nav-link top-nav-partner-link"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Android App
              </a>
            </li>
          </ul>
        )}

        {!isMobile && (
          <div className={actionsClasses}>
            <button
              type="button"
              className={searchClasses}
              onClick={() =>
                window.dispatchEvent(new Event("open-global-search"))
              }
            >
              <span className="top-nav-search-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <span className="top-nav-search-text">
                {isVeryTightDesktop
                  ? ""
                  : isTablet || !showFullSearchText
                    ? "Search"
                    : "Search movies, actors, genres"}
              </span>
              {showFullSearchText && !isVeryTightDesktop && (
                <span className="top-nav-search-hint">CTRL+K</span>
              )}
            </button>

            {isDesktop && <LiveUserBadge />}

            {showLiveChip && (
              <a href="http://10.45.45.254/" target="_blank" rel="noopener noreferrer" className="top-nav-live-chip">
                <span className="top-nav-live-dot" />
                <span>Live now</span>
              </a>
            )}
          </div>
        )}

        <div className={rightSideClasses}>
          {!isMobile && (
            <ProfileMenu
              user={user}
              compact={isCompactDesktop || !showLiveChip}
            />
          )}
          {isMobile && (
            <>
              <button
                type="button"
                className="top-nav-mobile-toggle"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <button
                type="button"
                className="top-nav-mobile-search"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.dispatchEvent(new Event("open-global-search"));
                }}
                aria-label="Search"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {isMobile && isMobileMenuOpen && (
        <div className="top-nav-mobile-menu" role="menu" aria-label="Mobile navigation">
          <div className="top-nav-mobile-menu-inner">
            <div className="top-nav-mobile-menu-header">
              <span>Navigation</span>
              <button
                type="button"
                className="top-nav-mobile-menu-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <ul className="top-nav-mobile-menu-list">
              {navItems.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <li key={item.path}>
                    {item.path === "/tv" ? (
                      <a
                        href="http://10.45.45.254/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`top-nav-mobile-menu-item ${isActive ? "active" : ""}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.path}
                        className={`top-nav-mobile-menu-item ${isActive ? "active" : ""}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="top-nav-mobile-menu-partners">
              <span>Account</span>
              {user ? (
                <Link
                  to="/profile"
                  className="top-nav-mobile-menu-item"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {user.name || user.email || 'My Profile'}
                </Link>
              ) : null}
              <Link
                to="/watchlist"
                className="top-nav-mobile-menu-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Watchlist
              </Link>
            </div>
            <div className="top-nav-mobile-menu-partners">
              <span>Others</span>
              <a
                href="https://data.speed4you.net/Software/"
                target="_blank"
                rel="noopener noreferrer"
                className="top-nav-mobile-menu-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Software
              </a>
            </div>
            <div className="top-nav-mobile-menu-partners">
              <span>Partner FTP</span>
              {partnerSites.map((site) => (
                <a
                  key={site.url}
                  href={workingUrls[site.label] || site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="top-nav-mobile-menu-item"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {site.label}
                </a>
              ))}
              <a
                href={`${import.meta.env.BASE_URL}speed4you.apk`.replace(/\/\//g, '/')}
                download
                className="top-nav-mobile-menu-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Android App
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default TopNav;
