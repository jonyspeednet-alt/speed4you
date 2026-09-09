import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const partnerSites = [
  { url: "https://bokasoka.net", label: "Bokasoka" },
  { url: "https://cinemabazar.net", label: "Cinemabazar" },
];

export default function TopNav() {
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const logoSrc = `${import.meta.env.BASE_URL || "/"}logo.png`.replace(/\/{2,}/g, "/");
  const apkUrl = `${import.meta.env.BASE_URL || "/"}speed4you.apk`.replace(/\/{2,}/g, "/");

  // Close menus on route change
  useEffect(() => {
    setPartnerOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPartnerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="simple-header">
      <div className="simple-header-inner">
        <Link to="/" className="simple-brand-logo" aria-label="Speed4You home">
          <img src={logoSrc} alt="Speed4You" className="simple-logo-img" />
        </Link>

        {/* Mobile toggle button */}
        <button
          type="button"
          className="simple-mobile-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <nav aria-label="Primary" className={`simple-nav ${mobileMenuOpen ? "simple-nav-mobile-open" : ""}`}>
          <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/movies" onClick={() => setMobileMenuOpen(false)}>
            Movies
          </NavLink>
          <NavLink to="/series" onClick={() => setMobileMenuOpen(false)}>
            Series
          </NavLink>
          <a href="http://10.45.45.254/" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
            Live TV
          </a>
          <button
            type="button"
            className="simple-search-trigger"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-global-search"));
              setMobileMenuOpen(false);
            }}
            aria-label="Quick search (Ctrl+K)"
            title="Quick search (Ctrl+K)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>Search</span>
            <kbd className="simple-search-kbd">Ctrl K</kbd>
          </button>

          {/* Partner FTP Dropdown */}
          <div className="simple-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="simple-dropdown-btn"
              onClick={() => setPartnerOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={partnerOpen}
            >
              Partner FTP
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "4px" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {partnerOpen && (
              <div className="simple-dropdown-menu">
                {partnerSites.map((site) => (
                  <a
                    key={site.url}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setPartnerOpen(false);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {site.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a href="https://data.speed4you.net/Software/" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
            Software
          </a>
          <a href={apkUrl} download onClick={() => setMobileMenuOpen(false)}>
            Android App
          </a>
          <NavLink to="/watchlist" onClick={() => setMobileMenuOpen(false)}>
            Watchlist
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
