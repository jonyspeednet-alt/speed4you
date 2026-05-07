import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';
import { useBreakpoint } from '../../hooks';

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{ ...s.statCard, ...(accent ? s.statCardAccent : {}) }}>
      <span style={s.statLabel}>{label}</span>
      <span style={s.statValue}>{value}</span>
      {sub && <span style={s.statSub}>{sub}</span>}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={s.sectionHeader}>
      <h2 style={s.sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}

function StatusBadge({ status }) {
  const isPublished = status === 'published';
  return (
    <span style={{ ...s.badge, ...(isPublished ? s.badgeGreen : s.badgeYellow) }}>
      {status}
    </span>
  );
}

function formatSeconds(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export default function AdminDashboard() {
  const { isMobile } = useBreakpoint();
  const queryClient = useQueryClient();

  const { data: dashboard = { stats: {}, recentContent: [], scannerDrafts: [] }, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.getDashboard(),
  });

  const { data: normalizer = { running: false, state: null, recentLogLines: [] }, error: normalizerError } = useQuery({
    queryKey: ['admin', 'normalizer', 'status'],
    queryFn: () => adminService.getMediaNormalizerStatus(),
    refetchInterval: 2000,
  });

  const normalizerMutation = useMutation({
    mutationFn: (action) => action === 'start'
      ? adminService.startMediaNormalizer()
      : adminService.stopMediaNormalizer(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'normalizer', 'status'] }),
  });

  const stats = [
    { label: 'Movies', value: isLoading ? '—' : (dashboard.stats.totalMovies || 0), sub: 'in catalog' },
    { label: 'Series', value: isLoading ? '—' : (dashboard.stats.totalSeries || 0), sub: 'season-aware' },
    { label: 'Published', value: isLoading ? '—' : (dashboard.stats.publishedContent || 0), sub: 'live on portal', accent: true },
    { label: 'Drafts', value: isLoading ? '—' : (dashboard.stats.draftContent || 0), sub: 'pending review' },
  ];

  const currentProgress = normalizer.state?.currentFileProgress || null;
  const pct = Math.max(0, Math.min(100, Number(currentProgress?.percent || 0)));

  return (
    <div style={s.page}>
      {/* Error */}
      {error && (
        <div style={s.errorBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error.message || 'Failed to load dashboard data.'}
        </div>
      )}

      {/* Stats row */}
      <div style={{ ...s.statsGrid, ...(isMobile ? s.statsGridMobile : {}) }}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Main grid */}
      <div style={{ ...s.grid, ...(isMobile ? s.gridMobile : {}) }}>

        {/* Recent content table */}
        <div style={s.card}>
          <SectionHeader
            title="Recent Content"
            action={
              <Link to="/admin/content" style={s.linkBtn}>View all →</Link>
            }
          />
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Title</th>
                  <th style={{ ...s.th, ...s.thNarrow }}>Type</th>
                  <th style={{ ...s.th, ...s.thNarrow }}>Status</th>
                  <th style={{ ...s.th, ...s.thNarrow }}>Source</th>
                  <th style={{ ...s.th, ...s.thAction }} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} style={s.td}>
                          <div style={{ ...s.skeleton, width: j === 0 ? '140px' : '60px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (dashboard.recentContent || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...s.td, textAlign: 'center', color: TEXT3, padding: '32px' }}>
                      No content yet
                    </td>
                  </tr>
                ) : (
                  (dashboard.recentContent || []).map((item) => (
                    <tr key={item.id} style={s.tr}>
                      <td style={s.td}>
                        <span style={s.itemTitle}>{item.title}</span>
                        <span style={s.itemMeta}>{item.category || 'Uncategorized'}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.typeChip}>{item.type}</span>
                      </td>
                      <td style={s.td}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ ...s.td, color: TEXT3, fontSize: '0.8rem' }}>
                        {item.sourceType === 'scanner' ? 'Scanner' : 'Manual'}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <Link to={`/admin/content/${item.id}/edit`} style={s.rowAction}>
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={s.rightCol}>

          {/* Quick actions */}
          <div style={s.card}>
            <SectionHeader title="Quick Actions" />
            <div style={s.quickActions}>
              <Link to="/admin/content/new" style={s.quickActionPrimary}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Content
              </Link>
              <Link to="/admin/content" style={s.quickAction}>Scanner Drafts</Link>
              <Link to="/admin/movies" style={s.quickAction}>Movies Queue</Link>
              <Link to="/admin/series" style={s.quickAction}>Series Queue</Link>
            </div>

            {/* Scanner drafts count */}
            {(dashboard.scannerDrafts || []).length > 0 && (
              <div style={s.infoRow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ color: TEXT2, fontSize: '0.82rem' }}>
                  <strong style={{ color: '#f59e0b' }}>{dashboard.scannerDrafts.length}</strong> scanner drafts waiting for review
                </span>
              </div>
            )}
          </div>

          {/* Media Normalizer */}
          <div style={s.card}>
            <div style={s.normalizerHeader}>
              <h2 style={s.sectionTitle}>Media Normalizer</h2>
              <span style={{ ...s.statusDot, ...(normalizer.running ? s.statusDotGreen : s.statusDotGray) }}>
                {normalizer.running ? 'Running' : 'Idle'}
              </span>
            </div>

            <p style={s.normalizerDesc}>
              Converts media to MP4 / H.264 / AAC with faststart for smooth playback.
            </p>

            {/* Stats */}
            <div style={s.normalizerStats}>
              {[
                { label: 'Converted', value: normalizer.state?.stats?.converted || 0 },
                { label: 'Already OK', value: normalizer.state?.stats?.skippedAlreadyOk || 0 },
                { label: 'Failed', value: normalizer.state?.stats?.failed || 0 },
              ].map(({ label, value }) => (
                <div key={label} style={s.normalizerStat}>
                  <span style={s.normalizerStatVal}>{value}</span>
                  <span style={s.normalizerStatLabel}>{label}</span>
                </div>
              ))}
            </div>

            {/* Progress */}
            {currentProgress && (
              <div style={s.progressBlock}>
                <div style={s.progressTopRow}>
                  <span style={s.progressFile} title={currentProgress.filePath}>
                    {currentProgress.filePath?.split('/').pop() || 'Processing...'}
                  </span>
                  <span style={s.progressPct}>{pct.toFixed(0)}%</span>
                </div>
                <div style={s.progressTrack}>
                  <div style={{ ...s.progressFill, width: `${pct}%` }} />
                </div>
                <div style={s.progressMeta}>
                  <span>{formatSeconds(currentProgress.progressSeconds)} / {formatSeconds(currentProgress.durationSeconds)}</span>
                  <span>Speed: {currentProgress.speed || '—'}</span>
                  <span>{currentProgress.phase || ''}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={s.normalizerControls}>
              <button
                type="button"
                style={{ ...s.normBtn, ...(normalizer.running || normalizerMutation.isPending ? s.normBtnDisabled : s.normBtnStart) }}
                onClick={() => normalizerMutation.mutate('start')}
                disabled={normalizerMutation.isPending || normalizer.running}
              >
                Start
              </button>
              <button
                type="button"
                style={{ ...s.normBtn, ...(!normalizer.running || normalizerMutation.isPending ? s.normBtnDisabled : s.normBtnStop) }}
                onClick={() => normalizerMutation.mutate('stop')}
                disabled={normalizerMutation.isPending || !normalizer.running}
              >
                Stop
              </button>
            </div>

            {normalizerError && (
              <div style={s.errorInline}>{normalizerError.message || 'Status check failed'}</div>
            )}

            {/* Log */}
            <div style={s.logBox}>
              {(normalizer.recentLogLines || []).length > 0
                ? normalizer.recentLogLines.slice(-8).map((line, i) => (
                  <div key={i} style={s.logLine}>{line}</div>
                ))
                : <div style={{ color: TEXT3 }}>No logs yet.</div>
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const ACCENT = 'var(--accent-primary, #6366f1)';
const ACCENT_LIGHT = 'var(--accent-light, rgba(99,102,241,0.12))';
const ACCENT_BORDER = 'var(--accent-border, rgba(99,102,241,0.3))';
const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const BG = 'var(--bg, #0a0c10)';
const GLOW_RED = 'var(--glow-red, rgba(239,68,68,0.3))';
const GLOW_AMBER = 'var(--glow-amber, rgba(245,158,11,0.3))';

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '32px' },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    color: '#f87171',
    fontSize: '0.9rem',
    fontWeight: '500',
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statsGridMobile: { gridTemplateColumns: '1fr' },
  statCard: {
    padding: '24px',
    borderRadius: '16px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    },
  },
  statCardAccent: {
    background: ACCENT_LIGHT,
    border: `1px solid ${ACCENT_BORDER}`,
    boxShadow: `0 4px 20px ${GLOW_RED}`,
  },
  statLabel: { fontSize: '0.8rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' },
  statValue: { fontSize: '2rem', fontWeight: '800', color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' },
  statSub: { fontSize: '0.8rem', color: TEXT2, fontWeight: '500' },

  // Layout
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '24px', alignItems: 'start' },
  gridMobile: { gridTemplateColumns: '1fr' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '20px' },

  // Card
  card: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  // Section header
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: TEXT, margin: 0, letterSpacing: '-0.02em' },
  linkBtn: { fontSize: '0.85rem', color: ACCENT, fontWeight: '600', textDecoration: 'none', transition: 'color 180ms ease' },

  // Table
  tableWrap: { overflowX: 'auto', margin: 0, padding: 0, borderRadius: '12px', background: SURFACE2 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '100%' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: TEXT3,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: 'nowrap',
  },
  thNarrow: { width: '90px' },
  thAction: { width: '70px' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 180ms ease' },
  td: { padding: '16px', verticalAlign: 'middle' },
  itemTitle: { display: 'block', color: TEXT, fontWeight: '600', fontSize: '0.9rem', lineHeight: 1.4 },
  itemMeta: { display: 'block', color: TEXT3, fontSize: '0.78rem', marginTop: '4px', fontWeight: '500' },
  typeChip: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '8px',
    background: SURFACE,
    color: TEXT2,
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'capitalize',
    border: `1px solid ${BORDER}`,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  badgeGreen: { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' },
  badgeYellow: { background: 'rgba(245,158,11,0.1)', color: '#facc15', border: '1px solid rgba(245,158,11,0.2)' },
  rowAction: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '8px',
    background: SURFACE2,
    color: TEXT2,
    fontSize: '0.8rem',
    fontWeight: '600',
    textDecoration: 'none',
    border: `1px solid ${BORDER}`,
    transition: 'background 180ms ease, border-color 180ms ease',
    ':hover': {
      background: SURFACE,
      borderColor: ACCENT_BORDER,
      color: TEXT,
    },
  },
  skeleton: {
    height: '14px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },

  // Quick actions
  quickActions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  quickActionPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: ACCENT,
    color: '#fff',
    fontSize: '0.88rem',
    fontWeight: '700',
    textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
    transition: 'transform 180ms ease, box-shadow 180ms ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
    },
  },
  quickAction: {
    display: 'block',
    padding: '11px 16px',
    borderRadius: '12px',
    background: SURFACE2,
    color: TEXT2,
    fontSize: '0.88rem',
    fontWeight: '600',
    textDecoration: 'none',
    border: `1px solid ${BORDER}`,
    transition: 'background 180ms ease, border-color 180ms ease',
    ':hover': {
      background: SURFACE,
      borderColor: ACCENT_BORDER,
      color: TEXT,
    },
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
  },

  // Normalizer
  normalizerHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  normalizerDesc: { fontSize: '0.85rem', color: TEXT3, lineHeight: 1.6, margin: 0, fontWeight: '500' },
  normalizerStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' },
  normalizerStat: {
    padding: '14px',
    borderRadius: '12px',
    background: SURFACE2,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    border: `1px solid ${BORDER}`,
  },
  normalizerStatVal: { fontSize: '1.3rem', fontWeight: '800', color: TEXT, letterSpacing: '-0.02em' },
  normalizerStatLabel: { fontSize: '0.72rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' },

  statusDot: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  statusDotGreen: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' },
  statusDotGray: { background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` },

  // Progress
  progressBlock: { display: 'flex', flexDirection: 'column', gap: '10px' },
  progressTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  progressFile: { fontSize: '0.82rem', color: TEXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: '500' },
  progressPct: { fontSize: '0.82rem', fontWeight: '800', color: '#4ade80', flexShrink: 0 },
  progressTrack: { height: '8px', borderRadius: '999px', background: SURFACE2, overflow: 'hidden', border: `1px solid ${BORDER}` },
  progressFill: { height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #22c55e, #84cc16)', transition: 'width 0.5s ease' },
  progressMeta: { display: 'flex', gap: '16px', fontSize: '0.75rem', color: TEXT3, flexWrap: 'wrap', fontWeight: '500' },

  // Normalizer controls
  normalizerControls: { display: 'flex', gap: '10px' },
  normBtn: {
    flex: 1,
    padding: '11px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 180ms ease, opacity 180ms ease',
    ':hover': {
      transform: 'translateY(-1px)',
    },
  },
  normBtnStart: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' },
  normBtnStop: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' },
  normBtnDisabled: { background: SURFACE2, color: TEXT3, cursor: 'not-allowed', border: `1px solid ${BORDER}`, opacity: 0.6 },

  errorInline: {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(239,68,68,0.08)',
    color: '#f87171',
    fontSize: '0.8rem',
    border: '1px solid rgba(239,68,68,0.15)',
    fontWeight: '500',
  },

  // Log
  logBox: {
    padding: '14px',
    borderRadius: '12px',
    background: '#0d1117',
    border: '1px solid #21262d',
    maxHeight: '180px',
    overflowY: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    lineHeight: 1.7,
    color: '#7ee787',
  },
  logLine: { wordBreak: 'break-all' },
};
