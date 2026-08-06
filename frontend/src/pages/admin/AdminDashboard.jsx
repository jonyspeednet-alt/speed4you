import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services';
import { useBreakpoint } from '../../hooks';

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      padding: '20px', borderRadius: '14px', background: SURFACE,
      border: accent ? `1px solid ${ACCENT_BORDER}` : `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <span style={{ fontSize: '0.72rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>{label}</span>
      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: TEXT, lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</span>
      {sub && <span style={{ fontSize: '0.78rem', color: TEXT2, fontWeight: '500' }}>{sub}</span>}
    </div>
  );
}

const NAV_LINKS = [
  { path: '/admin/content/new', label: 'New Content', icon: '+' },
  { path: '/admin/content', label: 'Content Library', icon: '\u2630' },
  { path: '/admin/scanner', label: 'Scanner', icon: '\u25B6' },
  { path: '/admin/duplicates', label: 'Duplicates', icon: '\u29C9' },
  { path: '/admin/users', label: 'Users', icon: '\u263C' },
  { path: '/admin/analytics', label: 'Analytics', icon: '\u2261' },
];

export default function AdminDashboard() {
  const { isMobile } = useBreakpoint();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.getDashboard(),
    staleTime: 60000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const stats = dash?.stats || {};
  const health = dash?.scannerHealth || {};
  const scannerJob = health.currentJob;
  const isScanning = scannerJob?.status === 'running';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* System Health Bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, gap: '10px',
        background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '14px 18px',
      }}>
        {[
          { label: 'Backend', ok: true },
          { label: 'Database', ok: true },
          { label: 'Scanner', ok: !isScanning, running: isScanning, detail: isScanning ? 'Scanning...' : `${health.healthyRoots || 0}/${health.totalRoots || 0} roots` },
          { label: 'Disk', ok: true, warn: false, detail: '\u2014' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
              background: item.running ? '#4ade80' : item.paused ? '#facc15' : item.ok ? '#4ade80' : '#f87171',
              boxShadow: item.running ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
            }} />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '600', color: TEXT }}>{item.label}</div>
              {item.detail && <div style={{ fontSize: '0.68rem', color: TEXT3 }}>{item.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, gap: '12px' }}>
        <StatCard label="Movies" value={isLoading ? '\u2014' : stats.totalMovies || 0} sub="in catalog" />
        <StatCard label="Series" value={isLoading ? '\u2014' : stats.totalSeries || 0} sub="in catalog" />
        <StatCard label="Published" value={isLoading ? '\u2014' : stats.publishedContent || 0} sub="live on portal" accent />
        <StatCard label="Drafts" value={isLoading ? '\u2014' : stats.draftContent || 0} sub="pending review" />
        <StatCard label="Admin Users" value={stats.totalAdminUsers || 1} sub="with access" />
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 260px',
        gap: '20px', alignItems: 'start',
      }}>
        {/* Left: Recent Content */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: TEXT, margin: 0 }}>Recent Content</h2>
            <Link to="/admin/content" style={{ fontSize: '0.8rem', color: ACCENT, fontWeight: '600', textDecoration: 'none' }}>View all \u2192</Link>
          </div>
          <div style={{ padding: '12px 0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={th}>Title</th>
                  <th style={th}>Type</th>
                  <th style={th}>Status</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td style={td}><div style={{ height: '12px', width: '120px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} /></td>
                      <td style={td}><div style={{ height: '12px', width: '50px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} /></td>
                      <td style={td}><div style={{ height: '12px', width: '60px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} /></td>
                      <td style={td}><div style={{ height: '12px', width: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} /></td>
                    </tr>
                  ))
                ) : (dash?.recentContent || []).length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: TEXT3, padding: '32px' }}>No content yet</td></tr>
                ) : (
                  (dash?.recentContent || []).map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={td}>
                        <div style={{ fontWeight: '600', color: TEXT, fontSize: '0.85rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.72rem', color: TEXT3, marginTop: '2px' }}>{item.category || 'Uncategorized'}</div>
                      </td>
                      <td style={td}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}` }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                          background: item.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                          color: item.status === 'published' ? '#4ade80' : '#facc15',
                          border: item.status === 'published' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(245,158,11,0.2)',
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={td}>
                        <Link to={`/admin/content/${item.id}/edit`} style={{
                          padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600',
                          background: SURFACE2, color: TEXT2, textDecoration: 'none', border: `1px solid ${BORDER}`,
                        }}>Edit</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Nav + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quick Links */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: TEXT, margin: '0 0 12px 0' }}>Quick Access</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {NAV_LINKS.map(link => (
                <Link key={link.path} to={link.path} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: SURFACE2, color: TEXT2, textDecoration: 'none',
                  border: `1px solid ${BORDER}`, fontSize: '0.85rem', fontWeight: '600',
                  transition: 'all 150ms ease',
                }}>
                  <span style={{ width: '22px', textAlign: 'center', fontWeight: '800', fontSize: '1rem' }}>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Scanner Drafts Alert */}
          {(stats.scannerDrafts || 0) > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1rem' }}>\u26A0\uFE0F</span>
              <span style={{ fontSize: '0.82rem', color: TEXT2 }}>
                <strong style={{ color: '#f59e0b' }}>{stats.scannerDrafts}</strong> scanner draft{stats.scannerDrafts > 1 ? 's' : ''} pending
              </span>
            </div>
          )}

          {/* System Info */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: TEXT, margin: '0 0 12px 0' }}>System</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <InfoRow label="Scanner" value={isScanning ? 'Running' : 'Idle'} color={isScanning ? '#4ade80' : TEXT3} />
              <InfoRow label="Content" value={`${stats.publishedContent || 0} published`} />
              <InfoRow label="Drafts" value={`${stats.draftContent || 0} pending`} />
            </div>
          </div>

          {/* Maintenance Actions */}
          <MaintenancePanel />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
      <span style={{ color: TEXT3, fontWeight: '500' }}>{label}</span>
      <span style={{ color: color || TEXT2, fontWeight: '600' }}>{value}</span>
    </div>
  );
}

function MaintenancePanel() {
  const [posterState, setPosterState] = useState({ running: false, result: null, error: null });
  const [rematchState, setRematchState] = useState({ running: false, result: null, error: null });

  async function runFixPosters() {
    setPosterState({ running: true, result: null, error: null });
    try {
      const res = await adminService.fixMissingPosters({ batchSize: 10 });
      setPosterState({ running: false, result: res, error: null });
    } catch (e) {
      setPosterState({ running: false, result: null, error: e.message || 'Failed' });
    }
  }

  async function runRematch() {
    setRematchState({ running: true, result: null, error: null });
    try {
      const res = await adminService.rematchMetadata({ batchSize: 5 });
      setRematchState({ running: false, result: res, error: null });
    } catch (e) {
      setRematchState({ running: false, result: null, error: e.message || 'Failed' });
    }
  }

  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px' }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: TEXT, margin: '0 0 12px 0' }}>Maintenance</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Fix Missing Posters */}
        <div>
          <button
            onClick={runFixPosters}
            disabled={posterState.running}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: '9px', fontSize: '0.8rem',
              fontWeight: '600', cursor: posterState.running ? 'not-allowed' : 'pointer',
              background: posterState.running ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)',
              color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
              transition: 'all 150ms',
            }}
          >
            {posterState.running ? 'Fixing posters…' : 'Fix Missing Posters'}
          </button>
          {posterState.result && (
            <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#4ade80', padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: '7px', border: '1px solid rgba(34,197,94,0.15)' }}>
              Fixed {posterState.result.fixed} items, skipped {posterState.result.skipped}, failed {posterState.result.failed} (total: {posterState.result.total})
            </div>
          )}
          {posterState.error && (
            <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: '7px', border: '1px solid rgba(248,113,113,0.15)' }}>
              {posterState.error}
            </div>
          )}
        </div>

        {/* Rematch Metadata */}
        <div>
          <button
            onClick={runRematch}
            disabled={rematchState.running}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: '9px', fontSize: '0.8rem',
              fontWeight: '600', cursor: rematchState.running ? 'not-allowed' : 'pointer',
              background: rematchState.running ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)',
              color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)',
              transition: 'all 150ms',
            }}
          >
            {rematchState.running ? 'Rematching…' : 'Re-match Metadata'}
          </button>
          {rematchState.result && (
            <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#4ade80', padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: '7px', border: '1px solid rgba(34,197,94,0.15)' }}>
              Matched {rematchState.result.matched}/{rematchState.result.total}, failed {rematchState.result.failed}
            </div>
          )}
          {rematchState.error && (
            <div style={{ marginTop: '6px', fontSize: '0.73rem', color: '#f87171', padding: '6px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: '7px', border: '1px solid rgba(248,113,113,0.15)' }}>
              {rematchState.error}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const ACCENT = 'var(--accent-secondary)';
const ACCENT_BORDER = 'var(--border-accent)';
const SURFACE = 'var(--bg-secondary)';
const SURFACE2 = 'var(--bg-tertiary)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';

const th = {
  padding: '10px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700',
  color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${BORDER}`,
};

const td = { padding: '12px 20px', verticalAlign: 'middle', color: TEXT2 };
