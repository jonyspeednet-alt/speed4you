import {
  useEffect, useMemo, useRef, useState, useCallback, memo, forwardRef,
} from "react";
import tvService from "../services/tvService";
import { useBreakpoint } from "../hooks";

const API = (import.meta.env.VITE_API_URL || "/portal-api").replace(/\/$/, "");
const api  = (p) => (p?.startsWith("http") ? p : `${API}${p}`);

// ── Constants ────────────────────────────────────────────────────────────────
const CAT_META = {
  All:     { color: "#e0e0e0", icon: "⊞" },
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
const RECENT_KEY = "tv-recently-watched";
const RECENT_MAX = 8;
const PLOAD_TIMEOUT = 20_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getCatMeta(c) {
  if (!c) return { color: "#e0e0e0", icon: "📺" };
  for (const [k, v] of Object.entries(CAT_META)) {
    if (c.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return { color: "#e0e0e0", icon: "📺" };
}

// ── Custom hooks ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 220) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useRecentlyWatched() {
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });
  const add = useCallback((ch) => {
    setRecent((prev) => {
      const slim = { streamId: ch.streamId, name: ch.name, logoPath: ch.logoPath, category: ch.category };
      const next = [slim, ...prev.filter((r) => r.streamId !== ch.streamId)].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);
  return [recent, add];
}

function useFullscreen(ref) {
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  const toggle = useCallback(() => {
    if (!ref.current) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current.requestFullscreen?.().catch(() => {});
  }, [ref]);
  return [isFull, toggle];
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ChannelLogo({ src, name, size = 40 }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="tv-logo" style={{ "--sz": `${size}px` }}>
      {!err && src
        ? <img src={src} alt={name} loading="lazy" onError={() => setErr(true)} />
        : <span className="tv-logo-fb">{initials}</span>}
    </div>
  );
}

function LiveBadge({ connecting = false }) {
  if (connecting) {
    return (
      <span className="tv-badge tv-badge--connecting" aria-label="Connecting">
        <span className="tv-badge-ring" />
        Buffering
      </span>
    );
  }
  return (
    <span className="tv-badge tv-badge--live" aria-label="Live">
      <span className="tv-badge-dot" />
      LIVE
    </span>
  );
}

const ChannelCard = memo(forwardRef(function ChannelCard(
  { ch, active, isConnecting, onClick, compact },
  ref,
) {
  const { color } = getCatMeta(ch.category);
  return (
    <button
      ref={ref}
      type="button"
      className={[
        "tv-ch",
        active     && "tv-ch--active",
        compact    && "tv-ch--compact",
      ].filter(Boolean).join(" ")}
      style={{
        "--cc":   color,
        "--cc10": hexToRgba(color, 0.10),
        "--cc20": hexToRgba(color, 0.20),
        "--cc32": hexToRgba(color, 0.32),
        "--cc08": hexToRgba(color, 0.08),
      }}
      onClick={onClick}
      aria-pressed={active}
    >
      {active && <span className="tv-ch-glow" aria-hidden="true" />}
      <ChannelLogo src={api(ch.logoPath)} name={ch.name} size={compact ? 34 : 42} />
      <div className="tv-ch-info">
        <span className="tv-ch-name">{ch.name}</span>
        {ch.category && (
          <span className="tv-ch-cat">
            <span aria-hidden="true">{getCatMeta(ch.category).icon}</span>
            {ch.category}
          </span>
        )}
      </div>
      {active && <LiveBadge connecting={isConnecting} />}
    </button>
  );
}));
ChannelCard.displayName = "ChannelCard";

function CategoryTabs({ cats, counts, active, onChange }) {
  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div className="tv-cats-wrap" role="tablist" aria-label="Filter by category">
      <div className="tv-cats">
        {["All", ...cats].map((c) => {
          const { color, icon } = CAT_META[c] || getCatMeta(c);
          const isActive = active === c;
          return (
            <button
              key={c}
              ref={isActive ? activeRef : null}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tv-pill ${isActive ? "tv-pill--active" : ""}`}
              style={{
                "--pc":    color,
                "--pc-bg": hexToRgba(color, 0.16),
                "--pc-bd": hexToRgba(color, 0.36),
                "--pc-cn": hexToRgba(color, 0.22),
              }}
              onClick={() => onChange(c)}
            >
              <span aria-hidden="true">{icon || "📺"}</span>
              <span>{c}</span>
              {counts[c] != null && (
                <span className="tv-pill-count">{counts[c]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, inputRef, resultCount, baseCount, isSearching }) {
  return (
    <div className="tv-search">
      <svg className="tv-search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="tv-search-input"
        placeholder="Search channels… (press /)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search channels"
      />
      {isSearching && (
        <span className="tv-search-count" aria-live="polite" aria-atomic="true">
          {resultCount}<span aria-hidden="true">/{baseCount}</span>
        </span>
      )}
      {value && (
        <button type="button" className="tv-search-clear" onClick={() => onChange("")} aria-label="Clear search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function RecentlyWatched({ recent, currentSid, onSelect }) {
  if (!recent.length) return null;
  return (
    <section className="tv-recent" aria-label="Recently watched">
      <span className="tv-recent-label">Recently Watched</span>
      <div className="tv-recent-row" role="list">
        {recent.map((ch) => {
          const active = ch.streamId === currentSid;
          const { color } = getCatMeta(ch.category);
          return (
            <button
              key={ch.streamId}
              type="button"
              role="listitem"
              className={`tv-recent-chip ${active ? "tv-recent-chip--active" : ""}`}
              style={{ "--rc": color, "--rc-bd": hexToRgba(color, active ? 0.40 : 0.14) }}
              onClick={() => onSelect(ch)}
              title={ch.name}
              aria-pressed={active}
            >
              <ChannelLogo src={api(ch.logoPath)} name={ch.name} size={22} />
              <span className="tv-recent-chip-name">{ch.name}</span>
              {active && <span className="tv-badge-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlayerControls({ onFullscreen, isFull }) {
  return (
    <div className="tv-player-ctrls" aria-label="Player controls">
      <button
        type="button"
        className="tv-player-ctrl"
        onClick={onFullscreen}
        aria-label={isFull ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFull ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFull ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="8 3 3 3 3 8" /><polyline points="21 8 21 3 16 3" />
            <polyline points="3 16 3 21 8 21" /><polyline points="16 21 21 21 21 16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )}
      </button>
    </div>
  );
}

function PlayerBar({ ch, onMinimise }) {
  if (!ch) return null;
  const { color } = getCatMeta(ch.category);
  return (
    <div className="tv-player-bar" role="region" aria-label="Now playing">
      <ChannelLogo src={api(ch.logoPath)} name={ch.name} size={30} />
      <div className="tv-player-bar-info">
        <span className="tv-player-bar-name">{ch.name}</span>
        {ch.category && (
          <span className="tv-player-bar-cat" style={{ color }}>{ch.category}</span>
        )}
      </div>
      <LiveBadge />
      <button
        type="button"
        className="tv-player-bar-min"
        onClick={onMinimise}
        aria-label="Minimise player"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        Minimise
      </button>
    </div>
  );
}

function EmptyState({ hasSearch }) {
  return (
    <div className="tv-empty" role="status">
      <svg className="tv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
      <span className="tv-empty-msg">No channels found</span>
      {hasSearch && <span className="tv-empty-sub">Try different keywords or select All</span>}
    </div>
  );
}

function PlayerPlaceholder() {
  return (
    <div className="tv-player-ph">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <span>Select a channel to watch</span>
    </div>
  );
}

function PlayerSpinner() {
  return (
    <div className="tv-player-spin-wrap" aria-label="Connecting to stream">
      <div className="tv-player-spin" />
      <span>Connecting…</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TVPage() {
  const { isMobile } = useBreakpoint(); // tablets get split layout now

  const [chs,    setChs]    = useState([]);
  const [cats,   setCats]   = useState([]);
  const [cat,    setCat]    = useState("All");
  const [sid,    setSid]    = useState("");
  const [load,   setLoad]   = useState(true);
  const [pLoad,  setPLoad]  = useState(false);
  const [err,    setErr]    = useState("");
  const [pMin,   setPMin]   = useState(false);
  const [query,  setQuery]  = useState("");

  const dQuery = useDebounce(query, 220);
  const [recent, addRecent] = useRecentlyWatched();

  const playerRef   = useRef(null);
  const searchRef   = useRef(null);
  const activeChRef = useRef(null);
  const pTimerRef   = useRef(null);

  const [isFull, toggleFull] = useFullscreen(playerRef);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchChannels = useCallback(() => {
    setLoad(true);
    setErr("");
    tvService.getChannels()
      .then((r) => {
        setChs(r.channels || []);
        setCats(r.categories || []);
        const def = r.defaultStreamId || r.channels?.[0]?.streamId || "";
        setSid(def);
        if (!def && !r.channels?.length) setErr("No channels available");
      })
      .catch((e) => setErr(e?.message || "TV service unavailable"))
      .finally(() => setLoad(false));
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // ── Player loading timeout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sid) return;
    setPLoad(true);
    clearTimeout(pTimerRef.current);
    pTimerRef.current = setTimeout(() => setPLoad(false), PLOAD_TIMEOUT);
    return () => clearTimeout(pTimerRef.current);
  }, [sid]);

  const handleIframeLoad = useCallback(() => {
    clearTimeout(pTimerRef.current);
    setPLoad(false);
  }, []);

  // ── Select channel ──────────────────────────────────────────────────────────
  const selectChannel = useCallback((ch) => {
    setSid(ch.streamId);
    addRecent(ch);
  }, [addRecent]);

  // ── Computed state (must come before effects that reference them) ───────────
  const catCounts = useMemo(() => {
    const m = { All: chs.length };
    for (const ch of chs) if (ch.category) m[ch.category] = (m[ch.category] || 0) + 1;
    return m;
  }, [chs]);

  const list = useMemo(() => {
    let base = cat === "All" ? chs : chs.filter((c) => c.category === cat || c.categories?.includes(cat));
    if (dQuery.trim()) {
      const q = dQuery.toLowerCase();
      base = base.filter((c) => c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q));
    }
    return base;
  }, [chs, cat, dQuery]);

  const cur = useMemo(() => chs.find((c) => c.streamId === sid) || null, [chs, sid]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && inInput) {
        searchRef.current?.blur();
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !inInput && list.length) {
        e.preventDefault();
        const idx  = list.findIndex((c) => c.streamId === sid);
        const next = e.key === "ArrowDown"
          ? Math.min(idx + 1, list.length - 1)
          : Math.max(idx - 1, 0);
        if (list[next] && list[next].streamId !== sid) selectChannel(list[next]);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [sid, list, selectChannel]);

  // ── Auto-scroll active card into view ──────────────────────────────────────
  useEffect(() => {
    activeChRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sid]);

  const streamUrl = cur && !err
    ? `${API}/api/tv/player/${cur.streamId}?${new URLSearchParams({ name: cur.name || "", category: cur.category || "" })}`
    : "";

  const isSearching  = dQuery.trim().length > 0;
  const isFiltered   = isSearching || cat !== "All";
  const showSplit    = !isMobile && !pMin && chs.length > 0;
  const baseCount    = catCounts[cat] ?? chs.length;

  // ── Channel list renderer (shared) ─────────────────────────────────────────
  const renderChannels = (compact) =>
    list.length === 0
      ? <EmptyState hasSearch={isFiltered} />
      : list.map((ch) => {
          const active = ch.streamId === sid;
          return (
            <ChannelCard
              key={ch.streamId}
              ref={active ? activeChRef : null}
              ch={ch}
              active={active}
              isConnecting={active && pLoad}
              onClick={() => selectChannel(ch)}
              compact={compact}
            />
          );
        });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="tv-page">
      {/* Screen-reader live region */}
      <div aria-live="polite" aria-atomic="true" className="tv-sr-only">
        {cur ? `Now playing: ${cur.name}` : ""}
      </div>

      {/* ── Header ── */}
      <header className="tv-header">
        <div className="tv-header-l">
          <span className="tv-header-dot" aria-hidden="true" />
          <h1 className="tv-header-title">Live TV</h1>
          {!load && chs.length > 0 && (
            <span className="tv-header-count">
              {isFiltered ? `${list.length} / ${chs.length}` : chs.length} channels
            </span>
          )}
        </div>
        <div className="tv-header-r">
          {!isMobile && (
            <span className="tv-kbd-hint" aria-hidden="true">
              <kbd>/</kbd> search &nbsp;<kbd>↑↓</kbd> channels
            </span>
          )}
          {chs.length > 0 && (
            <button type="button" className="tv-toggle-btn" onClick={() => setPMin((v) => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {pMin
                  ? <><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></>
                  : <><polyline points="18 15 12 9 6 15" /><rect x="2" y="3" width="20" height="13" rx="2" strokeOpacity=".4" /></>
                }
              </svg>
              {pMin ? "Show Player" : "Hide Player"}
            </button>
          )}
        </div>
      </header>

      {showSplit ? (
        /* ── SPLIT LAYOUT (desktop + tablet) ── */
        <div className="tv-split">

          {/* Player column */}
          <div className="tv-split-left">
            <div className="tv-player-wrap" ref={playerRef}>
              {pLoad    && <PlayerSpinner />}
              {streamUrl && (
                <iframe
                  key={cur.streamId}
                  src={streamUrl}
                  title={cur.name}
                  className="tv-iframe"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  onLoad={handleIframeLoad}
                />
              )}
              {!streamUrl && !pLoad && <PlayerPlaceholder />}
              <PlayerControls onFullscreen={toggleFull} isFull={isFull} />
            </div>
            {cur && <PlayerBar ch={cur} onMinimise={() => setPMin(true)} />}
          </div>

          {/* Sidebar */}
          <aside className="tv-sidebar" aria-label="Channel list">
            <SearchBar
              value={query}
              onChange={setQuery}
              inputRef={searchRef}
              resultCount={list.length}
              baseCount={baseCount}
              isSearching={isSearching}
            />
            <CategoryTabs cats={cats} counts={catCounts} active={cat} onChange={setCat} />
            <RecentlyWatched recent={recent} currentSid={sid} onSelect={selectChannel} />
            <div className="tv-sidebar-list" role="list">
              {load
                ? Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="tv-skel tv-skel--compact" />
                  ))
                : renderChannels(true)
              }
            </div>
          </aside>
        </div>

      ) : (
        /* ── STACKED LAYOUT (mobile / player hidden) ── */
        <div className="tv-stack">

          {/* Player */}
          {!pMin && chs.length > 0 && !err && (
            <>
              <div className="tv-player-wrap tv-player-wrap--stack" ref={playerRef}>
                {pLoad    && <PlayerSpinner />}
                {streamUrl && (
                  <iframe
                    key={cur.streamId}
                    src={streamUrl}
                    title={cur.name}
                    className="tv-iframe"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  />
                )}
                {!streamUrl && !pLoad && <PlayerPlaceholder />}
                <PlayerControls onFullscreen={toggleFull} isFull={isFull} />
              </div>
              {cur && <PlayerBar ch={cur} onMinimise={() => setPMin(true)} />}
            </>
          )}

          {/* Loading */}
          {load && (
            <div className="tv-skel-grid" aria-label="Loading channels">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="tv-skel" />)}
            </div>
          )}

          {/* Error */}
          {!load && err && !chs.length && (
            <div className="tv-error" role="alert">
              <div className="tv-error-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p>{err}</p>
              <button type="button" className="tv-retry-btn" onClick={fetchChannels}>Try Again</button>
            </div>
          )}

          {/* Channels */}
          {!load && chs.length > 0 && (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                inputRef={searchRef}
                resultCount={list.length}
                baseCount={baseCount}
                isSearching={isSearching}
              />
              <CategoryTabs cats={cats} counts={catCounts} active={cat} onChange={setCat} />
              <RecentlyWatched recent={recent} currentSid={sid} onSelect={selectChannel} />
              <div className="tv-grid" role="list">{renderChannels(false)}</div>
            </>
          )}
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
/* Screen-reader only */
.tv-sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* Page */
.tv-page {
  min-height: 100vh;
  padding: var(--nav-occupied-desktop, 104px) 20px 48px;
  max-width: 1520px;
  margin: 0 auto;
  box-sizing: border-box;
}
@media (max-width: 768px) {
  .tv-page { padding: var(--nav-occupied-mobile, 82px) 12px 100px; }
}

/* Header */
.tv-header {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 20px; gap: 12px;
}
.tv-header-l, .tv-header-r {
  display: flex; align-items: center; gap: 10px;
}
.tv-header-dot {
  width: 9px; height: 9px; border-radius: 50%; background: #ff4040;
  box-shadow: 0 0 10px rgba(255,64,64,.7), 0 0 22px rgba(255,64,64,.3);
  animation: dot-pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes dot-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(255,64,64,.7), 0 0 16px rgba(255,64,64,.28); }
  50%      { box-shadow: 0 0 16px rgba(255,64,64,.9), 0 0 30px rgba(255,64,64,.5); }
}
.tv-header-title {
  margin: 0; font-size: 1.25rem; font-weight: 800;
  color: var(--text-primary); letter-spacing: -.02em;
}
.tv-header-count {
  font-size: .72rem; color: var(--text-muted); font-weight: 600;
  background: rgba(255,255,255,.06); padding: 2px 9px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,.07);
}
.tv-kbd-hint {
  font-size: .68rem; color: rgba(255,255,255,.3); display: flex; align-items: center; gap: 4px;
}
.tv-kbd-hint kbd {
  display: inline-block; padding: 1px 5px; border-radius: 5px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
  font-family: inherit; font-size: .65rem; color: rgba(255,255,255,.5);
}
.tv-toggle-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 10px;
  font-size: .74rem; font-weight: 700; cursor: pointer;
  background: rgba(255,255,255,.05); color: var(--text-muted);
  border: 1px solid rgba(255,255,255,.08);
  transition: background 180ms, color 180ms;
}
.tv-toggle-btn svg { width: 14px; height: 14px; }
.tv-toggle-btn:hover { background: rgba(255,255,255,.10); color: var(--text-primary); }
.tv-toggle-btn:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Split layout */
.tv-split {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px; align-items: start;
}
@media (max-width: 1200px) { .tv-split { grid-template-columns: 1fr 300px; } }
@media (max-width: 900px)  { .tv-split { grid-template-columns: 1fr 260px; gap: 12px; } }

/* Player */
.tv-split-left { display: flex; flex-direction: column; }
.tv-player-wrap {
  position: relative; width: 100%; aspect-ratio: 16/9;
  border-radius: 16px; background: #000; overflow: hidden;
  border: 1px solid rgba(255,255,255,.07);
  box-shadow: 0 28px 64px rgba(0,0,0,.65);
}
.tv-player-wrap--stack { border-radius: 12px; }
.tv-iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }

.tv-player-spin-wrap {
  position: absolute; inset: 0; z-index: 3;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(0,0,0,.55); color: rgba(255,255,255,.5);
  font-size: .75rem; font-weight: 600; letter-spacing: .04em;
}
.tv-player-spin {
  width: 34px; height: 34px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.08);
  border-top-color: #4facfe;
  animation: tv-spin .75s linear infinite;
}
@keyframes tv-spin { to { transform: rotate(360deg); } }

.tv-player-ph {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  color: rgba(255,255,255,.22); font-size: .85rem;
}
.tv-player-ph svg { width: 52px; height: 52px; }

/* Fullscreen button */
.tv-player-ctrls {
  position: absolute; top: 10px; right: 10px; z-index: 4;
  display: flex; gap: 6px;
  opacity: 0; transition: opacity 200ms;
}
.tv-player-wrap:hover .tv-player-ctrls,
.tv-player-wrap:focus-within .tv-player-ctrls { opacity: 1; }
.tv-player-ctrl {
  display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 8px;
  background: rgba(0,0,0,.6); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.14); color: #fff; cursor: pointer;
  transition: background 160ms;
}
.tv-player-ctrl svg { width: 16px; height: 16px; }
.tv-player-ctrl:hover { background: rgba(0,0,0,.85); }
.tv-player-ctrl:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Player bar (now playing) */
.tv-player-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07); border-top: none;
  border-radius: 0 0 16px 16px;
  backdrop-filter: blur(12px);
}
.tv-player-bar-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.tv-player-bar-name {
  font-size: .82rem; font-weight: 700; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tv-player-bar-cat {
  font-size: .6rem; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;
}
.tv-player-bar-min {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 8px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  color: var(--text-muted); font-size: .68rem; font-weight: 700; cursor: pointer;
  transition: background 160ms, color 160ms; flex-shrink: 0;
}
.tv-player-bar-min svg { width: 13px; height: 13px; }
.tv-player-bar-min:hover { background: rgba(255,255,255,.12); color: var(--text-primary); }
.tv-player-bar-min:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Live / connecting badge */
.tv-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px; border-radius: 6px;
  font-size: .58rem; font-weight: 800; letter-spacing: .1em;
  text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
}
.tv-badge--live {
  background: rgba(255,64,64,.18); border: 1px solid rgba(255,64,64,.32); color: #ff8888;
}
.tv-badge--connecting {
  background: rgba(79,172,254,.14); border: 1px solid rgba(79,172,254,.3); color: #7ec8ff;
}
.tv-badge-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #ff4040;
  animation: badge-pulse 1.6s ease-in-out infinite;
}
.tv-badge-ring {
  width: 8px; height: 8px; border-radius: 50%;
  border: 2px solid #4facfe; border-top-color: transparent;
  animation: tv-spin .8s linear infinite;
}
@keyframes badge-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .35; transform: scale(.82); }
}

/* Sidebar */
.tv-sidebar {
  display: flex; flex-direction: column; gap: 8px;
  height: calc(100vh - var(--nav-occupied-desktop, 104px) - 56px);
  position: sticky; top: calc(var(--nav-occupied-desktop, 104px) + 16px);
}
.tv-sidebar-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 4px;
  padding-right: 3px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent;
}
.tv-sidebar-list::-webkit-scrollbar { width: 3px; }
.tv-sidebar-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

/* Search */
.tv-search { position: relative; display: flex; align-items: center; }
.tv-search-ic {
  position: absolute; left: 12px; width: 15px; height: 15px;
  color: var(--text-muted); pointer-events: none; flex-shrink: 0;
}
.tv-search-input {
  width: 100%; padding: 10px 72px 10px 36px;
  border-radius: 12px; background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  color: var(--text-primary); font-size: .82rem; font-family: inherit;
  outline: none; box-sizing: border-box;
  transition: border-color 180ms, background 180ms;
}
.tv-search-input::placeholder { color: var(--text-muted); }
.tv-search-input:focus {
  border-color: rgba(79,172,254,.42); background: rgba(255,255,255,.07);
  box-shadow: 0 0 0 3px rgba(79,172,254,.12);
}
.tv-search-input::-webkit-search-cancel-button { display: none; }
.tv-search-count {
  position: absolute; right: 34px;
  font-size: .62rem; font-weight: 700; color: rgba(255,255,255,.35);
  white-space: nowrap; pointer-events: none;
}
.tv-search-clear {
  position: absolute; right: 8px;
  display: grid; place-items: center;
  width: 22px; height: 22px; border-radius: 6px;
  background: rgba(255,255,255,.07); border: none;
  color: var(--text-muted); cursor: pointer; transition: background 160ms;
}
.tv-search-clear svg { width: 11px; height: 11px; }
.tv-search-clear:hover { background: rgba(255,255,255,.14); color: var(--text-primary); }
.tv-search-clear:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Category pills */
.tv-cats-wrap { overflow: hidden; }
.tv-cats {
  display: flex; gap: 5px;
  overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;
}
.tv-cats::-webkit-scrollbar { display: none; }
.tv-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 999px;
  font-size: .71rem; font-weight: 700; cursor: pointer; white-space: nowrap;
  background: rgba(255,255,255,.04); color: var(--text-muted);
  border: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
  transition: background 160ms, color 160ms, border-color 160ms;
}
.tv-pill:hover { background: rgba(255,255,255,.09); color: var(--text-secondary); }
.tv-pill--active {
  background: var(--pc-bg); color: var(--pc); border-color: var(--pc-bd);
}
.tv-pill--active .tv-pill-count { background: var(--pc-cn); color: var(--pc); }
.tv-pill-count {
  background: rgba(255,255,255,.08); color: var(--text-muted);
  font-size: .6rem; font-weight: 700;
  padding: 1px 6px; border-radius: 999px; min-width: 18px; text-align: center;
}
.tv-pill:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Channel logo */
.tv-logo {
  width: var(--sz, 42px); height: var(--sz, 42px);
  border-radius: var(--radius-sm, 14px);
  background: rgba(255,255,255,.95);
  display: grid; place-items: center; overflow: hidden; flex-shrink: 0;
}
.tv-logo img { width: 100%; height: 100%; object-fit: contain; }
.tv-logo-fb {
  font-weight: 900; color: #08111d; letter-spacing: -.02em;
  font-size: calc(var(--sz, 42px) * .32);
}

/* Channel card */
.tv-ch {
  position: relative; display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 12px;
  text-align: left; cursor: pointer; width: 100%; overflow: hidden;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
  transition: background 160ms, border-color 160ms, transform 150ms;
}
.tv-ch:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.10); transform: translateY(-1px); }
.tv-ch:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }
.tv-ch--active { background: var(--cc10); border-color: var(--cc32); }
.tv-ch--active:hover { transform: none; }
.tv-ch--compact { padding: 8px 10px; gap: 9px; border-radius: 10px; }
.tv-ch-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at left center, var(--cc08) 0%, transparent 68%);
}
.tv-ch-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tv-ch-name {
  font-size: .82rem; font-weight: 700; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;
}
.tv-ch--compact .tv-ch-name { font-size: .75rem; }
.tv-ch-cat {
  display: flex; align-items: center; gap: 4px;
  font-size: .6rem; font-weight: 600; color: var(--cc);
  text-transform: uppercase; letter-spacing: .06em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Recently watched */
.tv-recent { display: flex; flex-direction: column; gap: 6px; }
.tv-recent-label {
  font-size: .65rem; font-weight: 700; color: rgba(255,255,255,.3);
  text-transform: uppercase; letter-spacing: .08em; padding: 0 2px;
}
.tv-recent-row {
  display: flex; gap: 6px;
  overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;
}
.tv-recent-row::-webkit-scrollbar { display: none; }
.tv-recent-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px; flex-shrink: 0;
  background: rgba(255,255,255,.04); border: 1px solid var(--rc-bd, rgba(255,255,255,.10));
  color: var(--text-muted); font-size: .7rem; font-weight: 600; cursor: pointer;
  transition: background 160ms, border-color 160ms; white-space: nowrap;
}
.tv-recent-chip:hover { background: rgba(255,255,255,.09); color: var(--text-secondary); }
.tv-recent-chip--active { color: var(--rc); border-color: var(--rc-bd); background: rgba(255,255,255,.06); }
.tv-recent-chip:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }
.tv-recent-chip-name { max-width: 90px; overflow: hidden; text-overflow: ellipsis; }

/* Channel grid (stacked/mobile) */
.tv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}
@media (max-width: 600px) {
  .tv-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
  .tv-ch { padding: 8px 10px; gap: 8px; border-radius: 10px; }
  .tv-ch-name { font-size: .72rem; }
}

/* Stack layout */
.tv-stack { display: flex; flex-direction: column; gap: 14px; }
@media (max-width: 768px) { .tv-stack { gap: 11px; } }

/* Skeleton */
.tv-skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px;
}
@media (max-width: 600px) { .tv-skel-grid { grid-template-columns: 1fr 1fr; } }
.tv-skel {
  height: 66px; border-radius: 12px;
  background: linear-gradient(90deg,
    rgba(255,255,255,.03) 0%,
    rgba(255,255,255,.07) 50%,
    rgba(255,255,255,.03) 100%);
  background-size: 200% 100%;
  animation: tv-shimmer 1.6s infinite;
}
.tv-skel--compact { height: 54px; border-radius: 10px; }
@keyframes tv-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error */
.tv-error {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 64px 20px; text-align: center;
}
.tv-error-icon {
  width: 58px; height: 58px; border-radius: 50%;
  background: rgba(255,107,107,.10); display: grid; place-items: center; color: #ff6b6b;
}
.tv-error-icon svg { width: 28px; height: 28px; }
.tv-error p { margin: 0; color: var(--text-muted); font-size: .85rem; max-width: 300px; line-height: 1.65; }
.tv-retry-btn {
  padding: 9px 22px; border-radius: 10px;
  font-size: .8rem; font-weight: 700; cursor: pointer;
  background: rgba(255,255,255,.07); color: var(--text-primary);
  border: 1px solid rgba(255,255,255,.10); transition: background 160ms;
}
.tv-retry-btn:hover { background: rgba(255,255,255,.12); }
.tv-retry-btn:focus-visible { outline: 2px solid var(--focus-ring-color, #0ff); outline-offset: 2px; }

/* Empty state */
.tv-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 48px 20px; text-align: center; color: var(--text-muted);
}
.tv-empty-icon { width: 44px; height: 44px; opacity: .4; margin-bottom: 4px; }
.tv-empty-msg  { font-size: .88rem; font-weight: 600; }
.tv-empty-sub  { font-size: .75rem; opacity: .6; }
`;
