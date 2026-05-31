import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import MobileNav from "./MobileNav";
import ProfileMenu from "./ProfileMenu";
import { useBreakpoint, useTVMode } from "../../hooks";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/movies", label: "Movies" },
  { path: "/series", label: "Series" },
  { path: "/tv", label: "Live TV" },
  { path: "/browse", label: "Browse" },
];

const partnerSites = [
  { url: "http://bokasoka.net", label: "Bokasoka", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" },
  { url: "http://cinemabazar.net", label: "Cinemabazar", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" },
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
  const isVeryTightDesktop = isDesktop && width < 1280;
  const showSubtitle = isDesktop && width >= 1560;
  const showFullSearchText = isDesktop && width >= 1480;
  const showLiveChip = isDesktop && width >= 1600;
  const visibleNavItems = navItems;

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
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <nav aria-label="Primary" className={navClasses}>
      <div className={containerClasses}>
        <Link to="/" className={logoClasses}>
          <span className="top-nav-logo-mark">S4U</span>
          <div className={logoCopyClasses}>
            <span className="top-nav-logo-title">Entertainment Portal</span>
            {!isSmallMobile && showSubtitle && (
              <span className="top-nav-logo-subtitle">
                Movies & series in one place
              </span>
            )}
          </div>
        </Link>

        {!isMobile && (
          <ul className={linksClasses}>
            {visibleNavItems.map((item) => {
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
            <li className="top-nav-partner-divider" role="separator" />
            {partnerSites.map((site) => (
              <li key={site.url}>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="top-nav-link top-nav-partner-link"
                  onMouseEnter={() => setHoveredLink(site.url)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  {site.label}
                </a>
              </li>
            ))}
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

            {showLiveChip && (
              <Link to="/tv" className="top-nav-live-chip">
                <span className="top-nav-live-dot" />
                <span>Live now</span>
              </Link>
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new Event("open-global-search"))
                }
                aria-label="Search"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--text-primary)",
                  flexShrink: 0,
                }}
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
              <MobileNav />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default TopNav;
