import { useEffect, useMemo, useRef, useState } from 'react';
import tvService from '../services/tvService';
import { useBreakpoint } from '../hooks';

const TV_API_BASE = (import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '');

function withApiBase(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TV_API_BASE}${path}`;
}

const CATEGORY_COLORS = {
  Bangla: '#ffd166',
  Bengali: '#ffd166',
  Sports: '#75e39a',
  News: '#79e4ff',
  Kids: '#ff93c6',
  Hindi: '#ffb266',
  English: '#9ae7ff',
  Movies: '#ffc493',
  Music: '#d7a4ff',
};

function getCategoryColor(category) {
  if (!category) return 'rgba(255,255,255,0.18)';
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return 'rgba(255,255,255,0.18)';
}

function LiveDot() {
  return <span style={styles.liveDot} aria-label="Live" />;
}

function ChannelLogo({ src, name, size = 44 }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ ...styles.logoBox, width: size, height: size }}>
      {!err && src ? (
        <img src={src} alt={name} style={styles.logoImg} loading="lazy" onError={() => setErr(true)} />
      ) : (
        <span style={{ ...styles.logoInitials, fontSize: size * 0.3 }}>{initials}</span>
      )}
    </div>
  );
}

export default function TVPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const [payload, setPayload] = useState({ categories: [], channels: [], defaultStreamId: '' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerLoading, setPlayerLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const channelListRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await tvService.getChannels();
        if (!cancelled) {
          setPayload(result);
          setSelectedStreamId(result.defaultStreamId || result.channels?.[0]?.streamId || '');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'TV channels unavailable right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => ['All', ...(payload.categories || [])], [payload.categories]);

  const filteredChannels = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return (payload.channels || []).filter((channel) => {
      const categoryMatch = selectedCategory === 'All'
        || channel.category === selectedCategory
        || channel.categories?.includes(selectedCategory);
      if (!categoryMatch) return false;
      if (!query) return true;
      return `${channel.name} ${channel.category}`.toLowerCase().includes(query);
    });
  }, [payload.channels, searchText, selectedCategory]);

  const selectedChannel = useMemo(() => (
    (payload.channels || []).find((channel) => channel.streamId === selectedStreamId) || filteredChannels[0] || null
  ), [filteredChannels, payload.channels, selectedStreamId]);

  useEffect(() => {
    if (!selectedChannel && filteredChannels[0]) setSelectedStreamId(filteredChannels[0].streamId);
  }, [filteredChannels, selectedChannel]);

  useEffect(() => {
    setPlayerLoading(true);
  }, [selectedStreamId]);

  const playerUrl = selectedChannel
    ? withApiBase(`/api/tv/player/${selectedChannel.streamId}?${new URLSearchParams({
      name: selectedChannel.name || '',
      category: selectedChannel.category || '',
    })}`)
    : '';

  const isNarrow = isMobile || isTablet;
  const categoryColor = getCategoryColor(selectedChannel?.category);

  return (
    <div style={styles.page}>
      <section style={{ ...styles.hero, ...(isNarrow ? styles.heroNarrow : {}) }}>
        <div style={styles.heroCopy}>
          <span style={styles.heroEyebrow}>Live control room</span>
          <h1 style={styles.heroTitle}>Live TV without the old clutter.</h1>
          <p style={styles.heroText}>
            The TV route now separates the player, current channel, and navigation flow so visitors can switch faster and lose less context.
          </p>
          <div style={styles.heroStats}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Channels</span>
              <strong style={styles.statValue}>{payload.channels?.length || 0}</strong>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Categories</span>
              <strong style={styles.statValue}>{payload.categories?.length || 0}</strong>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Status</span>
              <strong style={styles.statValue}>Live</strong>
            </div>
          </div>
        </div>

        <div style={styles.nowPanel}>
          <span style={styles.liveBadge}><LiveDot /> Broadcasting</span>
          {selectedChannel ? (
            <>
              <div style={styles.nowChannelRow}>
                <ChannelLogo src={withApiBase(selectedChannel.logoPath)} name={selectedChannel.name} size={54} />
                <div style={styles.nowChannelText}>
                  <strong style={styles.nowChannelName}>{selectedChannel.name}</strong>
                  <span style={{ ...styles.nowChannelCategory, color: categoryColor }}>{selectedChannel.category || 'Live TV'}</span>
                </div>
              </div>
              <p style={styles.nowChannelSummary}>Cleaner focus states, better hierarchy, and a calmer side rail make channel switching feel deliberate.</p>
            </>
          ) : (
            <p style={styles.nowChannelSummary}>Select a channel to begin streaming.</p>
          )}
        </div>
      </section>

      <div style={{ ...styles.layout, ...(isNarrow ? styles.layoutNarrow : {}) }}>
        <section style={styles.playerColumn}>
          <div style={styles.playerWrap}>
            {loading ? (
              <div style={styles.placeholder}>
                <div style={styles.spinner} />
                <p style={styles.placeholderText}>Loading channel grid...</p>
              </div>
            ) : error ? (
              <div style={styles.placeholder}>
                <p style={styles.placeholderText}>{error}</p>
              </div>
            ) : playerUrl ? (
              <>
                {playerLoading ? <div style={styles.playerOverlay}><div style={styles.spinner} /></div> : null}
                <iframe
                  key={selectedChannel?.streamId}
                  src={playerUrl}
                  title={selectedChannel?.name || 'TV Player'}
                  style={styles.playerFrame}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  onLoad={() => setPlayerLoading(false)}
                />
              </>
            ) : (
              <div style={styles.placeholder}>
                <p style={styles.placeholderText}>No channel selected</p>
              </div>
            )}
          </div>

          {selectedChannel ? (
            <div style={{ ...styles.channelInfoCard, borderColor: `${categoryColor}55` }}>
              <ChannelLogo src={withApiBase(selectedChannel.logoPath)} name={selectedChannel.name} size={48} />
              <div style={styles.channelInfoCopy}>
                <strong style={styles.channelInfoName}>{selectedChannel.name}</strong>
                <span style={{ ...styles.channelInfoCategory, color: categoryColor }}>{selectedChannel.category || 'Live TV'}</span>
              </div>
              <span style={styles.liveMini}><LiveDot /> Live</span>
            </div>
          ) : null}
        </section>

        <aside
          ref={channelListRef}
          style={{
            ...styles.sidebar,
            ...(isNarrow ? styles.sidebarNarrow : {}),
            ...(isMobile && !sidebarOpen ? styles.sidebarHidden : {}),
          }}
        >
          <div style={styles.sidebarHeader}>
            {isMobile ? (
              <button type="button" style={styles.mobileSidebarToggle} onClick={() => setSidebarOpen((value) => !value)}>
                <span>Channels</span>
                <span>{sidebarOpen ? 'Hide' : 'Show'}</span>
              </button>
            ) : null}

            <div style={styles.searchBar}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search channels..." style={styles.searchInput} />
            </div>

            <div style={styles.categoryRow}>
              {categories.map((category) => {
                const active = selectedCategory === category;
                const color = getCategoryColor(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    style={{ ...styles.categoryChip, ...(active ? { background: color, color: '#08111d', borderColor: 'transparent' } : {}) }}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div style={styles.sidebarMeta}>
              <span>{filteredChannels.length} channels</span>
              {searchText ? <span>Matching "{searchText}"</span> : null}
            </div>
          </div>

          <div style={styles.channelList}>
            {loading ? (
              <div style={styles.placeholderList}>Preparing channels...</div>
            ) : filteredChannels.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.placeholderText}>No channels found</p>
                <button type="button" onClick={() => { setSearchText(''); setSelectedCategory('All'); }} style={styles.clearButton}>Clear filters</button>
              </div>
            ) : (
              filteredChannels.map((channel) => {
                const active = channel.streamId === selectedChannel?.streamId;
                const color = getCategoryColor(channel.category);
                return (
                  <button
                    key={channel.id || channel.streamId}
                    type="button"
                    onClick={() => {
                      setSelectedStreamId(channel.streamId);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    style={{
                      ...styles.channelCard,
                      ...(active ? { ...styles.channelCardActive, borderColor: `${color}55` } : {}),
                    }}
                  >
                    <div style={{ ...styles.channelAccent, background: color }} />
                    <ChannelLogo src={withApiBase(channel.logoPath)} name={channel.name} size={42} />
                    <div style={styles.channelText}>
                      <strong style={styles.channelName}>{channel.name}</strong>
                      <span style={{ ...styles.channelCategory, color }}>{channel.category}</span>
                    </div>
                    {active ? <LiveDot /> : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '112px 24px var(--spacing-3xl)',
  },
  hero: {
    width: 'min(1440px, calc(100vw - 48px))',
    margin: '0 auto 18px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: '18px',
  },
  heroNarrow: {
    width: 'min(1440px, calc(100vw - 24px))',
    gridTemplateColumns: '1fr',
  },
  heroCopy: {
    padding: '26px',
    borderRadius: '32px',
    background: 'rgba(8, 18, 33, 0.78)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'var(--shadow-soft)',
  },
  heroEyebrow: {
    display: 'inline-block',
    marginBottom: '10px',
    color: 'var(--accent-secondary)',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginBottom: '12px',
    color: 'var(--text-primary)',
    maxWidth: '11ch',
  },
  heroText: {
    maxWidth: '56ch',
    lineHeight: '1.72',
    marginBottom: '20px',
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  },
  statCard: {
    padding: '16px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    display: 'block',
    marginBottom: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  statValue: {
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
  },
  nowPanel: {
    padding: '24px',
    borderRadius: '32px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'var(--shadow-soft)',
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'rgba(255, 143, 83, 0.12)',
    border: '1px solid rgba(255, 143, 83, 0.22)',
    color: '#ffd8bd',
    fontSize: '0.74rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    boxShadow: '0 0 0 6px rgba(255, 143, 83, 0.18)',
    animation: 'livePulse 1.8s ease-in-out infinite',
  },
  nowChannelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '18px',
  },
  nowChannelText: {
    display: 'grid',
    gap: '4px',
  },
  nowChannelName: {
    color: 'var(--text-primary)',
    fontSize: '1.1rem',
  },
  nowChannelCategory: {
    fontSize: '0.76rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  nowChannelSummary: {
    marginTop: '16px',
    fontSize: '0.94rem',
    lineHeight: '1.68',
  },
  layout: {
    width: 'min(1440px, calc(100vw - 48px))',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gap: '18px',
  },
  layoutNarrow: {
    width: 'min(1440px, calc(100vw - 24px))',
    gridTemplateColumns: '1fr',
  },
  playerColumn: {
    display: 'grid',
    gap: '16px',
  },
  playerWrap: {
    position: 'relative',
    aspectRatio: '16 / 9',
    overflow: 'hidden',
    borderRadius: '30px',
    background: '#02070e',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'var(--shadow-card)',
  },
  playerFrame: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    background: '#000',
  },
  playerOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(2, 7, 14, 0.72)',
    zIndex: 2,
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: '24px',
  },
  placeholderText: {
    color: 'var(--text-muted)',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.12)',
    borderTopColor: 'var(--accent-secondary)',
    animation: 'spin 0.8s linear infinite',
  },
  channelInfoCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 18px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  channelInfoCopy: {
    flex: 1,
    display: 'grid',
    gap: '4px',
  },
  channelInfoName: {
    color: 'var(--text-primary)',
    fontSize: '1rem',
  },
  channelInfoCategory: {
    fontSize: '0.76rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  liveMini: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffd8bd',
    fontSize: '0.76rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  sidebar: {
    borderRadius: '30px',
    background: 'rgba(8, 18, 33, 0.78)',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    maxHeight: 'calc(100vh - 130px)',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarNarrow: {
    maxHeight: 'none',
  },
  sidebarHidden: {
    display: 'none',
  },
  sidebarHeader: {
    padding: '16px',
    display: 'grid',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  mobileSidebarToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontWeight: '800',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '48px',
    padding: '0 14px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
  },
  categoryRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryChip: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-secondary)',
    fontSize: '0.76rem',
    fontWeight: '800',
  },
  sidebarMeta: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    color: 'var(--text-muted)',
    fontSize: '0.76rem',
  },
  channelList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
    display: 'grid',
    gap: '8px',
  },
  placeholderList: {
    padding: '18px',
    color: 'var(--text-muted)',
  },
  channelCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '68px',
    padding: '12px 14px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'left',
  },
  channelCardActive: {
    background: 'rgba(255,255,255,0.06)',
  },
  channelAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    borderRadius: '4px 0 0 4px',
  },
  channelText: {
    flex: 1,
    minWidth: 0,
    display: 'grid',
    gap: '4px',
  },
  channelName: {
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  channelCategory: {
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  logoBox: {
    borderRadius: '12px',
    background: '#fff',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    padding: '5px',
    flexShrink: 0,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  logoInitials: {
    color: '#08111d',
    fontWeight: '900',
  },
  emptyState: {
    padding: '28px 18px',
    textAlign: 'center',
  },
  clearButton: {
    marginTop: '12px',
    minHeight: '42px',
    padding: '0 14px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #fff0df 0%, var(--accent-primary) 100%)',
    color: '#08111d',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: '0.74rem',
  },
};
