import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import tvService from "../services/tvService";
import { useBreakpoint } from "../hooks";

const API = (import.meta.env.VITE_API_URL || "/portal-api").replace(/\/$/, "");
const api = (p) => (p?.startsWith("http") ? p : `${API}${p}`);

const CAT_META = {
  All:     { color: "#ffffff", icon: "⊞" },
  Bangla:  { color: "#ffd166", icon: "🅱" },
  Bengali: { color: "#ffd166", icon: "🅱" },
  Sports:  { color: "#75e39a", icon: "⚽" },
  News:    { color: "#79e4ff", icon: "📡" },
  Kids:    { color: "#ff93c6", icon: "🎠" },
  Hindi:   { color: "#ffb266", icon: "🎬" },
  English: { color: "#9ae7ff", icon: "🌐" },
  Movies:  { color: "#ffc493", icon: "🎥" },
  Music:   { color: "#d7a4ff", icon: "🎵" },
};

const getCatColor = (c) => {
  if (!c) return "rgba(255,255,255,0.18)";
  for (const [k, v] of Object.entries(CAT_META)) {
    if (c.toLowerCase().includes(k.toLowerCase())) return v.color;
  }
  return "rgba(255,255,255,0.18)";
};

const getCatIcon = (c) => {
  if (!c) return "📺";
  for (const [k, v] of Object.entries(CAT_META)) {
    if (c.toLowerCase().includes(k.toLowerCase())) return v.icon;
  }
  return "📺";
};

function ChannelLogo({ src, name, size = 40 }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="tv-logo" style={{ "--logo-size": `${size}px` }}>
      {!err && src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <span className="tv-logo-fallback">{initials}</span>
      )}
    </div>
  );
}

function LiveBadge({ pulse = true }) {
  return (
    <span className={`tv-live-badge ${pulse ? "tv-live-badge--pulse" : ""}`}>
      <span className="tv-live-dot" />
      LIVE
    </span>
  );
}

function ChannelCard({ ch, active, onClick, compact = false }) {
  const color = getCatColor(ch.category);
  return (
    <button
      type="button"
      className={`tv-channel-card ${active ? "tv-channel-card--active" : ""} ${compact ? "tv-channel-card--compact" : ""}`}
      onClick={onClick}
      style={{ "--cat-color": color }}
      aria-pressed={active}
    >
      {active && <span className="tv-channel-card-glow" />}
      <ChannelLogo src={api(ch.logoPath)} name={ch.name} size={compact ? 36 : 44} />
      <div className="tv-channel-card-info">
        <span className="tv-channel-name">{ch.name}</span>
        {ch.category && (
          <span className="tv-channel-category">
            {getCatIcon(ch.category)} {ch.category}
          </span>
        )}
      </div>
      {active && <LiveBadge pulse />}
    </button>
  );
}

function CategoryTabs({ cats, counts, active, onChange }) {
  const scrollRef = useRef(null);

  const scrollActive = useCallback((el) => {
    if (!el || !scrollRef.current) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  return (
    <div className="tv-cats-wrap">
      <div className="tv-cats" ref={scrollRef}>
        {["All", ...cats].map((c) => {
          const meta = CAT_META[c] || {};
          const isActive = active === c;
          return (
            <button
              key={c}
              type="button"
              className={`tv-cat-pill ${isActive ? "tv-cat-pill--active" : ""}`}
              style={{ "--pill-color": meta.color || "rgba(255,255,255,0.18)" }}
              onClick={() => onChange(c)}
              ref={isActive ? scrollActive : null}
            >
              <span className="tv-cat-icon">{meta.icon || "📺"}</span>
              <span>{c}</span>
              {counts[c] != null && (
                <span className="tv-cat-count">{counts[c]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div className="tv-search">
      <svg className="tv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="search"
        className="tv-search-input"
        placeholder="Search channels…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="tv-search-clear" onClick={() => onChange("")} aria-label="Clear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function PlayerOverlay({ ch, onHide }) {
  if (!ch) return null;
  const color = getCatColor(ch.category);
  return (
    <div className="tv-player-overlay">
      <ChannelLogo src={api(ch.logoPath)} name={ch.name} size={32} />
      <div className="tv-player-overlay-info">
        <span className="tv-player-overlay-name">{ch.name}</span>
        {ch.category && (
          <span className="tv-player-overlay-cat" style={{ color }}>
            {ch.category}
          </span>
        )}
      </div>
      <LiveBadge pulse />
      <button type="button" className="tv-player-overlay-hide" onClick={onHide} title="Minimise player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}

export default function TVPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const [chs, setChs] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("All");
  const [sid, setSid] = useState("");
  const [load, setLoad] = useState(true);
  const [pLoad, setPLoad] = useState(true);
  const [err, setErr] = useState("");
  const [pMin, setPMin] = useState(false);
  const [query, setQuery] = useState("");
  const iframeRef = useRef(null);
  const isNarrow = isMobile || isTablet;

  const fetchChannels = useCallback(() => {
    setLoad(true);
    setErr("");
    tvService
      .getChannels()
      .then((r) => {
        setChs(r.channels || []);
        setCats(r.categories || []);
        const defId = r.defaultStreamId || r.channels?.[0]?.streamId || "";
        setSid(defId);
        if (!defId && !r.channels?.length) setErr("No channels available");
      })
      .catch((e) => setErr(e?.message || "TV service unavailable"))
      .finally(() => setLoad(false));
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);
  useEffect(() => { setPLoad(true); }, [sid]);

  const catCounts = useMemo(() => {
    const m = { All: chs.length };
    for (const ch of chs) {
      if (ch.category) m[ch.category] = (m[ch.category] || 0) + 1;
    }
    return m;
  }, [chs]);

  const list = useMemo(() => {
    let base = cat === "All" ? chs : chs.filter((c) => c.category === cat || c.categories?.includes(cat));
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((c) => c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
    }
    return base;
  }, [chs, cat, query]);

  const cur = useMemo(() => chs.find((c) => c.streamId === sid) || null, [chs, sid]);

  const streamUrl =
    cur && !err
      ? `${API}/api/tv/player/${cur.streamId}?${new URLSearchParams({
          name: cur.name || "",
          category: cur.category || "",
        })}`
      : "";

  const showSplit = !isNarrow && !pMin && chs.length > 0;

  return (
    <div className="tv-page">
      {/* ── PAGE HEADER ── */}
      <div className="tv-header">
        <div className="tv-header-left">
          <span className="tv-header-dot" />
          <h1 className="tv-header-title">Live TV</h1>
          {!load && chs.length > 0 && (
            <span className="tv-header-count">{chs.length} channels</span>
          )}
        </div>
        {chs.length > 0 && (
          <button
            type="button"
            className="tv-toggle-btn"
            onClick={() => setPMin((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {pMin
                ? <><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></>
                : <><polyline points="18 15 12 9 6 15"/><rect x="2" y="3" width="20" height="13" rx="2" strokeOpacity=".4"/></>
              }
            </svg>
            {pMin ? "Show Player" : "Hide Player"}
          </button>
        )}
      </div>

      {/* ── SPLIT LAYOUT (desktop with player) ── */}
      {showSplit ? (
        <div className="tv-split">
          {/* LEFT: Player */}
          <div className="tv-split-player">
            <div className="tv-player-wrap">
              {pLoad && (
                <div className="tv-player-spinner">
                  <div className="tv-spinner" />
                </div>
              )}
              {streamUrl && (
                <iframe
                  ref={iframeRef}
                  key={cur?.streamId}
                  src={streamUrl}
                  title={cur?.name}
                  className="tv-iframe"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  onLoad={() => setPLoad(false)}
                />
              )}
              {!streamUrl && !pLoad && (
                <div className="tv-player-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Select a channel to watch</span>
                </div>
              )}
            </div>
            {cur && <PlayerOverlay ch={cur} onHide={() => setPMin(true)} />}
          </div>

          {/* RIGHT: Channel Sidebar */}
          <div className="tv-sidebar">
            <SearchBar value={query} onChange={setQuery} />
            <CategoryTabs cats={cats} counts={catCounts} active={cat} onChange={(c) => { setCat(c); setQuery(""); }} />
            <div className="tv-sidebar-list">
              {list.length === 0 ? (
                <div className="tv-empty">
                  <span>No channels found</span>
                </div>
              ) : (
                list.map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    ch={ch}
                    active={ch.streamId === sid}
                    onClick={() => setSid(ch.streamId)}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── STACKED LAYOUT (mobile / player hidden) ── */
        <div className="tv-stack">
          {/* Player (mobile full-width or desktop without split) */}
          {!pMin && chs.length > 0 && !err && (
            <>
              <div className="tv-player-wrap tv-player-wrap--stack">
                {pLoad && (
                  <div className="tv-player-spinner">
                    <div className="tv-spinner" />
                  </div>
                )}
                {streamUrl && (
                  <iframe
                    ref={iframeRef}
                    key={cur?.streamId}
                    src={streamUrl}
                    title={cur?.name}
                    className="tv-iframe"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    onLoad={() => setPLoad(false)}
                  />
                )}
                {!streamUrl && (
                  <div className="tv-player-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Select a channel</span>
                  </div>
                )}
              </div>
              {cur && <PlayerOverlay ch={cur} onHide={() => setPMin(true)} />}
            </>
          )}

          {/* Loading skeletons */}
          {load && (
            <div className="tv-skeleton-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="tv-skeleton-card" />
              ))}
            </div>
          )}

          {/* Error */}
          {!load && err && !chs.length && (
            <div className="tv-error">
              <div className="tv-error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p>{err}</p>
              <button type="button" className="tv-retry-btn" onClick={fetchChannels}>
                Try Again
              </button>
            </div>
          )}

          {/* Channels */}
          {!load && chs.length > 0 && (
            <>
              <SearchBar value={query} onChange={setQuery} />
              <CategoryTabs cats={cats} counts={catCounts} active={cat} onChange={(c) => { setCat(c); setQuery(""); }} />
              {list.length === 0 ? (
                <div className="tv-empty">
                  <span>No channels found</span>
                </div>
              ) : (
                <div className="tv-grid">
                  {list.map((ch) => (
                    <ChannelCard
                      key={ch.id}
                      ch={ch}
                      active={ch.streamId === sid}
                      onClick={() => setSid(ch.streamId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{TV_CSS}</style>
    </div>
  );
}

const TV_CSS = `
/* ── PAGE ── */
.tv-page {
  min-height: 100vh;
  padding: var(--nav-occupied-desktop, 104px) 20px 40px;
  max-width: 1440px;
  margin: 0 auto;
  box-sizing: border-box;
}
@media (max-width: 768px) {
  .tv-page { padding: var(--nav-occupied-mobile, 82px) 12px 100px; }
}

/* ── HEADER ── */
.tv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.tv-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tv-header-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #ff4040;
  box-shadow: 0 0 10px rgba(255,64,64,0.7), 0 0 20px rgba(255,64,64,0.35);
  animation: tv-dot-pulse 2s ease-in-out infinite;
}
@keyframes tv-dot-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(255,64,64,0.7), 0 0 16px rgba(255,64,64,0.3); }
  50%      { box-shadow: 0 0 14px rgba(255,64,64,0.9), 0 0 28px rgba(255,64,64,0.5); }
}
.tv-header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.tv-header-count {
  font-size: .72rem;
  color: var(--text-muted);
  font-weight: 500;
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 999px;
}
.tv-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.08);
  transition: background 200ms, color 200ms;
}
.tv-toggle-btn svg { width: 15px; height: 15px; }
.tv-toggle-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

/* ── SPLIT LAYOUT ── */
.tv-split {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1100px) {
  .tv-split { grid-template-columns: 1fr 290px; }
}

/* ── PLAYER ── */
.tv-split-player { display: flex; flex-direction: column; gap: 0; }
.tv-player-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  background: #000;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
}
.tv-player-wrap--stack { margin-bottom: 0; border-radius: 14px; }
.tv-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.tv-player-spinner {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0,0,0,0.5);
  z-index: 2;
  border-radius: inherit;
}
.tv-spinner {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #4facfe;
  animation: tv-spin .8s linear infinite;
}
@keyframes tv-spin { to { transform: rotate(360deg); } }
.tv-player-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,255,255,0.2);
  font-size: .85rem;
}
.tv-player-placeholder svg { width: 48px; height: 48px; }

/* ── NOW PLAYING OVERLAY ── */
.tv-player-overlay {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-top: none;
  border-radius: 0 0 16px 16px;
  backdrop-filter: blur(12px);
}
.tv-player-overlay-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.tv-player-overlay-name {
  font-size: .82rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tv-player-overlay-cat {
  font-size: .62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  opacity: .85;
}
.tv-player-overlay-hide {
  display: grid;
  place-items: center;
  width: 28px; height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.07);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 160ms;
  flex-shrink: 0;
}
.tv-player-overlay-hide svg { width: 14px; height: 14px; }
.tv-player-overlay-hide:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }

/* ── LIVE BADGE ── */
.tv-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255,64,64,0.18);
  border: 1px solid rgba(255,64,64,0.3);
  color: #ff8080;
  font-size: .58rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
.tv-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ff4040;
}
.tv-live-badge--pulse .tv-live-dot {
  animation: tv-live-pulse 1.6s ease-in-out infinite;
}
@keyframes tv-live-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .4; transform: scale(0.85); }
}

/* ── SIDEBAR ── */
.tv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100vh - var(--nav-occupied-desktop, 104px) - 60px);
  position: sticky;
  top: calc(var(--nav-occupied-desktop, 104px) + 20px);
}
.tv-sidebar-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}
.tv-sidebar-list::-webkit-scrollbar { width: 4px; }
.tv-sidebar-list::-webkit-scrollbar-track { background: transparent; }
.tv-sidebar-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* ── SEARCH ── */
.tv-search {
  position: relative;
  display: flex;
  align-items: center;
}
.tv-search-icon {
  position: absolute;
  left: 12px;
  width: 16px; height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}
.tv-search-input {
  width: 100%;
  padding: 10px 36px 10px 38px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-primary);
  font-size: .82rem;
  font-family: inherit;
  outline: none;
  transition: border-color 200ms, background 200ms;
  box-sizing: border-box;
}
.tv-search-input::placeholder { color: var(--text-muted); }
.tv-search-input:focus {
  border-color: rgba(79,172,254,0.4);
  background: rgba(255,255,255,0.07);
}
.tv-search-input::-webkit-search-cancel-button { display: none; }
.tv-search-clear {
  position: absolute;
  right: 10px;
  display: grid;
  place-items: center;
  width: 22px; height: 22px;
  border-radius: 6px;
  background: rgba(255,255,255,0.07);
  color: var(--text-muted);
  cursor: pointer;
  border: none;
}
.tv-search-clear svg { width: 11px; height: 11px; }
.tv-search-clear:hover { background: rgba(255,255,255,0.14); color: var(--text-primary); }

/* ── CATEGORY TABS ── */
.tv-cats-wrap {
  overflow: hidden;
}
.tv-cats {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.tv-cats::-webkit-scrollbar { display: none; }
.tv-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 180ms, color 180ms, border-color 180ms;
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.tv-cat-pill:hover {
  background: rgba(255,255,255,0.09);
  color: var(--text-secondary);
  border-color: rgba(255,255,255,0.14);
}
.tv-cat-pill--active {
  background: color-mix(in srgb, var(--pill-color) 18%, transparent);
  color: var(--pill-color);
  border-color: color-mix(in srgb, var(--pill-color) 35%, transparent);
}
.tv-cat-icon { font-size: .8em; line-height: 1; }
.tv-cat-count {
  background: rgba(255,255,255,0.08);
  color: var(--text-muted);
  font-size: .62rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}
.tv-cat-pill--active .tv-cat-count {
  background: color-mix(in srgb, var(--pill-color) 22%, transparent);
  color: var(--pill-color);
}

/* ── CHANNEL LOGO ── */
.tv-logo {
  width: var(--logo-size, 44px);
  height: var(--logo-size, 44px);
  border-radius: 12px;
  background: rgba(255,255,255,0.95);
  display: grid;
  place-items: center;
  overflow: hidden;
  flex-shrink: 0;
}
.tv-logo img { width: 100%; height: 100%; object-fit: contain; }
.tv-logo-fallback {
  font-weight: 900;
  font-size: calc(var(--logo-size, 44px) * 0.32);
  color: #08111d;
  letter-spacing: -0.02em;
}

/* ── CHANNEL CARD ── */
.tv-channel-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  transition: background 180ms, border-color 180ms, transform 180ms;
  overflow: hidden;
}
.tv-channel-card:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.1);
  transform: translateY(-1px);
}
.tv-channel-card--active {
  background: color-mix(in srgb, var(--cat-color) 10%, rgba(255,255,255,0.04));
  border-color: color-mix(in srgb, var(--cat-color) 30%, transparent);
}
.tv-channel-card--active:hover { transform: none; }
.tv-channel-card--compact { padding: 8px 10px; gap: 10px; border-radius: 10px; }
.tv-channel-card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at left center, color-mix(in srgb, var(--cat-color) 10%, transparent) 0%, transparent 70%);
  pointer-events: none;
}
.tv-channel-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tv-channel-name {
  font-size: .82rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}
.tv-channel-card--compact .tv-channel-name { font-size: .76rem; }
.tv-channel-category {
  font-size: .62rem;
  font-weight: 600;
  color: var(--cat-color);
  text-transform: uppercase;
  letter-spacing: .06em;
  opacity: .85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── CHANNEL GRID (mobile/stacked) ── */
.tv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
@media (max-width: 600px) {
  .tv-grid { grid-template-columns: 1fr 1fr; }
  .tv-channel-card { padding: 8px 10px; gap: 8px; border-radius: 10px; }
  .tv-channel-name { font-size: .74rem; }
}

/* ── STACK LAYOUT ── */
.tv-stack { display: flex; flex-direction: column; gap: 14px; }
@media (max-width: 768px) { .tv-stack { gap: 12px; } }

/* ── SKELETON ── */
.tv-skeleton-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
@media (max-width: 600px) { .tv-skeleton-grid { grid-template-columns: 1fr 1fr; } }
.tv-skeleton-card {
  height: 66px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: tv-shimmer 1.6s infinite;
}
@keyframes tv-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── ERROR ── */
.tv-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 20px;
  text-align: center;
}
.tv-error-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(255,107,107,0.1);
  display: grid;
  place-items: center;
  color: #ff6b6b;
}
.tv-error-icon svg { width: 28px; height: 28px; }
.tv-error p {
  margin: 0;
  color: var(--text-muted);
  font-size: .85rem;
  max-width: 320px;
  line-height: 1.6;
}
.tv-retry-btn {
  padding: 9px 22px;
  border-radius: 10px;
  font-size: .8rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(255,255,255,0.07);
  color: var(--text-primary);
  border: 1px solid rgba(255,255,255,0.1);
  transition: background 180ms;
}
.tv-retry-btn:hover { background: rgba(255,255,255,0.12); }

/* ── EMPTY ── */
.tv-empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: .85rem;
}
`;
