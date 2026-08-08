import { useState, useRef, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';
import { ToastContext } from '../../components/ui/ToastContext.jsx';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const SURFACE3 = 'var(--surface-3, #1f2330)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';

const C = {
  running: '#4ade80',
  completed: '#60a5fa',
  completed_with_errors: '#f59e0b',
  failed: '#f87171',
  stopped: '#facc15',
  interrupted: '#f59e0b',
  idle: TEXT3,
  pending: TEXT3,
  finalizing: '#a78bfa',
};

const keyframes = `
  @keyframes scn-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.4); } }
  @keyframes scn-spin { to { transform: rotate(360deg); } }
  @keyframes scn-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes scn-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scn-progress-flow { 0% { background-position: 0 0; } 100% { background-position: 30px 0; } }
  @keyframes scn-skeleton { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  .scn-anim-in { animation: scn-slide-in 0.3s ease-out; }
  .scn-pulse-dot { animation: scn-pulse 1.5s ease-in-out infinite; }
  .scn-spin { animation: scn-spin 2s linear infinite; }
  .scn-skeleton { animation: scn-skeleton 1.4s ease-in-out infinite; border-radius: 6px; background: rgba(255,255,255,0.06); }
  .scn-bar-flow { background-image: linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.15) 100%); background-size: 30px 100%; animation: scn-progress-flow 1.2s linear infinite; }
`;

const STATUS_GRADIENTS = {
  running: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.06) 100%)',
  completed: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(96,165,250,0.04) 100%)',
  completed_with_errors: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)',
  failed: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)',
  stopped: 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(250,204,21,0.04) 100%)',
  interrupted: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)',
  idle: 'linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.02) 100%)',
  pending: 'linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.02) 100%)',
  finalizing: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.04) 100%)',
};

const Stat = memo(function Stat({ label, value, accent, icon }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: '14px',
      background: SURFACE2, border: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', gap: '6px',
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.68rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>{label}</span>
        {icon && <span style={{ color: TEXT3, opacity: 0.7 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: TEXT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
});

const ProgressBar = memo(function ProgressBar({ percent, color, height = 6, animated = false, label }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: TEXT3, fontWeight: '600' }}>{label}</span>
          <span style={{ fontSize: '0.72rem', color: TEXT2, fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div style={{
        width: '100%', height: `${height}px`, borderRadius: `${height / 2}px`,
        background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: `${height / 2}px`,
          background: color || 'linear-gradient(90deg, #4ade80, #22c55e)',
          transition: 'width 0.4s ease',
        }} />
        {animated && pct < 100 && <div className="scn-bar-flow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: `${pct}%` }} />}
      </div>
    </div>
  );
});

const StatusPill = memo(function StatusPill({ status, size = 'md' }) {
  const color = C[status] || TEXT3;
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '0.68rem' : '0.74rem';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding, borderRadius: '6px', fontSize, fontWeight: '700',
      background: `${color}20`, color, textTransform: 'uppercase', letterSpacing: '0.05em',
      border: `1px solid ${color}30`,
    }}>
      {status === 'running' && <span className="scn-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />}
            {String(status).replace(/_/g, ' ')}
    </span>
  );
});

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2 }) {
  const paths = {
    play: <polygon points="6 4 20 12 6 20 6 4" />,
    stop: <rect x="5" y="5" width="14" height="14" rx="1" />,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>,
    folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
    history: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /><polyline points="12 7 12 12 16 14" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    film: <><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return '—';
  const ms = now - new Date(startedAt).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function ScannerPage() {
  const queryClient = useQueryClient();
  const logEndRef = useRef(null);
  const runsContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const toast = useContext(ToastContext);
  const prevJobStatusRef = useRef(null);
  const [selectedRoots, setSelectedRoots] = useState([]);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedRun, setSelectedRun] = useState(null);
  const [runFilter, setRunFilter] = useState('all');

  // The current-job query drives whether a scan is active. It self-schedules: poll fast while
  // running, stop when idle (avoids hammering 3 endpoints every 2-5s forever). Starting a scan
  // invalidates ['admin','scanner'], which refetches this and resumes polling.
  const { data: jobData, isError: jobError } = useQuery({
    queryKey: ['admin', 'scanner', 'currentJob'],
    queryFn: () => adminService.getCurrentScannerJob(),
    refetchInterval: (query) => (query.state.data?.job?.status === 'running' ? 2000 : false),
  });

  const scanActive = jobData?.job?.status === 'running';

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: ['admin', 'scanner', 'health'],
    queryFn: () => adminService.getScannerHealth(),
    // Health roots are server-cached for 30s, so polling faster than that is wasted. Only
    // poll while a scan is active; otherwise fetch once on mount / on manual refetch.
    refetchInterval: scanActive ? 10000 : false,
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin', 'scanner', 'logs'],
    queryFn: () => adminService.getScannerLogs(15),
    refetchInterval: scanActive ? 5000 : false,
  });

  const runMutation = useMutation({
    mutationFn: () => adminService.runScanner(selectedRoots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] });
      toast?.({ type: 'success', message: selectedRoots.length ? `Starting scan of ${selectedRoots.length} root(s)...` : 'Starting full scan...' });
    },
    onError: (err) => toast?.({ type: 'error', message: err?.message || 'Failed to start scan' }),
  });

  const stopMutation = useMutation({
    mutationFn: () => adminService.stopScanner(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] }); toast?.({ type: 'success', message: 'Scan stopped.' }); },
    onError: (err) => toast?.({ type: 'error', message: err?.message || 'Failed to stop scan' }),
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => adminService.clearScannerMetadataCache(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] }); toast?.({ type: 'success', message: 'Metadata cache cleared.' }); },
    onError: (err) => toast?.({ type: 'error', message: err?.message || 'Failed to clear cache' }),
  });

  const job = jobData?.job || null;
  const roots = health?.roots || [];
  const recentRuns = logsData?.items || health?.recentRuns || [];
  const rootResults = job?.summary?.rootResults || [];
  
  // Filter recent runs by status
  const filteredRuns = useMemo(() => {
    if (runFilter === 'all') return recentRuns;
    return recentRuns.filter(run => run.status === runFilter);
  }, [recentRuns, runFilter]);
  // Only the job's own status decides "running". Previously a root left in 'pending' after the
  // job ended pinned the UI to "running" forever (Run stayed disabled, Stop stayed enabled).
  const isRunning = job?.status === 'running';
  const displayStatus = job?.status || null;
  const elapsed = useElapsed(isRunning ? job?.startedAt : null);

  const activeRoot = useMemo(() => {
    if (!isRunning || !rootResults.length) return null;
    return rootResults.find((r) => r.status === 'running') || rootResults.find((r) => r.processed < r.totalCandidates);
  }, [rootResults, isRunning]);

  const overallProgress = useMemo(() => {
    if (!rootResults.length) return 0;
    const totalProc = rootResults.reduce((s, r) => s + (r.processed || 0), 0);
    const totalCand = rootResults.reduce((s, r) => s + (r.totalCandidates || 0), 0);
    return totalCand > 0 ? (totalProc / totalCand) * 100 : 0;
  }, [rootResults]);

  const isNearBottom = useCallback(() => {
    const el = runsContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [recentRuns]);

  useEffect(() => {
    const el = runsContainerRef.current;
    if (!el) return;
    const onScroll = () => { shouldAutoScrollRef.current = isNearBottom(); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom]);

  useEffect(() => {
    if (!job) return;
    if (prevJobStatusRef.current === 'running' && job.status !== 'running') {
      const summary = job.summary;
      const totalCount = summary?.totalErrors ?? summary?.errors?.length ?? 0;
      const msg = totalCount > 0
        ? `Scan finished with ${totalCount} error(s). ${summary?.created || 0} created, ${summary?.updated || 0} updated, ${summary?.unchanged || 0} unchanged.`
        : `Scan completed successfully. ${summary?.created || 0} created, ${summary?.updated || 0} updated, ${summary?.unchanged || 0} unchanged, ${summary?.duplicateDrafts || 0} duplicates.`;
      toast?.({ type: totalCount > 0 ? 'error' : 'success', message: msg, duration: 6000 });
      // Invalidate all admin queries so ContentLibrary and Dashboard reflect new items instantly
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    }
    prevJobStatusRef.current = job.status;
  }, [job?.status, job, toast, queryClient]);

  // ETA Calculation
  const estimatedRemainingLabel = useMemo(() => {
    if (!isRunning || !overallProgress || overallProgress <= 0 || overallProgress >= 100) return null;
    const startTime = job?.startedAt ? new Date(job.startedAt).getTime() : 0;
    if (!startTime) return null;
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs < 3000) return null; // wait 3s for stabilization
    const totalEstMs = (elapsedMs / overallProgress) * 100;
    const remainingMs = Math.max(0, totalEstMs - elapsedMs);
    const remSec = Math.round(remainingMs / 1000);
    if (remSec < 60) return `~${remSec}s remaining`;
    const remMin = Math.round(remSec / 60);
    return `~${remMin}m remaining`;
  }, [isRunning, overallProgress, job?.startedAt]);

  useEffect(() => {
    setConfirmStop(false);
    setConfirmClearCache(false);
  }, [isRunning]);

  const toggleRoot = (rootId) => {
    setSelectedRoots(prev =>
      prev.includes(rootId) ? prev.filter(id => id !== rootId) : [...prev, rootId]
    );
  };

  const filteredRoots = useMemo(() => {
    if (filter === 'all') return roots;
    if (filter === 'healthy') return roots.filter((r) => r.checkable !== false && r.exists && !r.error);
    if (filter === 'broken') return roots.filter((r) => r.checkable !== false && (!r.exists || r.error));
    if (filter === 'remote') return roots.filter((r) => r.checkable === false);
    if (filter === 'selected') return roots.filter((r) => selectedRoots.includes(r.id));
    return roots;
  }, [roots, filter, selectedRoots]);

  const totalVideos = roots.reduce((s, r) => s + (r.videoCount || 0), 0);
  const totalDiscovered = job?.summary?.rootResults?.reduce((s, r) => s + (r.discovered || 0), 0) || 0;

  return (
    <>
      <style>{keyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px' }}>

      {(healthError || jobError) && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <Icon name="x" size={16} color="#f87171" />
          <span style={{ fontSize: '0.82rem', color: TEXT2 }}>
            Could not reach the scanner backend. Showing last known data — retrying automatically.
          </span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] })}
            style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero Status Card */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: STATUS_GRADIENTS[displayStatus] || STATUS_GRADIENTS.idle,
        border: `1px solid ${isRunning ? 'rgba(34,197,94,0.25)' : BORDER}`,
        borderRadius: '20px', padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: isRunning ? 'rgba(34,197,94,0.15)' : SURFACE2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${isRunning ? 'rgba(34,197,94,0.3)' : BORDER}`,
              }}>
                <Icon name="activity" size={20} color={isRunning ? C.running : TEXT2} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: TEXT, margin: 0, letterSpacing: '-0.02em' }}>
                  {isRunning ? 'Scanner Running' : displayStatus ? `Scanner ${String(displayStatus).replace(/_/g, ' ')}` : 'Scanner'}
                </h2>
                <p aria-live="polite" style={{ fontSize: '0.82rem', color: TEXT2, margin: '2px 0 0 0' }}>
                  {isRunning
                    ? `Processing ${activeRoot?.label || 'next root'} • ${activeRoot ? `${activeRoot.processed || 0} / ${activeRoot.totalCandidates || 0} folders` : 'preparing...'}`
                    : 'Ready to scan media folders and detect new content'}
                </p>
              </div>
            </div>

            {isRunning && (
              <div style={{ marginTop: '16px' }}>
                <ProgressBar
                  percent={overallProgress}
                  color="linear-gradient(90deg, #4ade80 0%, #22c55e 100%)"
                  height={8}
                  animated
                  label={`${elapsed} elapsed${estimatedRemainingLabel ? ` (${estimatedRemainingLabel})` : ''}`}
                />
              </div>
            )}
            {!isRunning && job?.summary && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '0.78rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#4ade80', fontWeight: '700' }}>+{job.summary.created || 0} created</span>
                <span style={{ color: TEXT2 }}>{job.summary.updated || 0} updated</span>
                <span style={{ color: TEXT3 }}>{job.summary.unchanged || 0} unchanged</span>
                {(job.summary.duplicateDrafts || 0) > 0 && <span style={{ color: '#a78bfa' }}>{job.summary.duplicateDrafts} duplicates</span>}
                {(job.summary.totalErrors || 0) > 0 && <span style={{ color: '#f87171', fontWeight: '700' }}>{job.summary.totalErrors} errors</span>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {displayStatus && <StatusPill status={displayStatus} />}

            <button type="button" onClick={() => runMutation.mutate()}
              disabled={isRunning || runMutation.isPending}
              style={{
                padding: '11px 22px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: '700',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                background: isRunning ? SURFACE2 : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: isRunning ? TEXT3 : '#fff',
                border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                opacity: isRunning ? 0.5 : 1,
                boxShadow: isRunning ? 'none' : '0 4px 14px rgba(34,197,94,0.3)',
                transition: 'all 0.2s ease',
              }}>
              <Icon name="play" size={14} color={isRunning ? TEXT3 : '#fff'} />
              {runMutation.isPending ? 'Starting...' : selectedRoots.length ? `Scan ${selectedRoots.length} root${selectedRoots.length > 1 ? 's' : ''}` : 'Run Scan'}
            </button>

            {confirmStop ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => { stopMutation.mutate(); setConfirmStop(false); }}
                  style={{ padding: '11px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="stop" size={12} color="#f87171" /> Confirm
                </button>
                <button type="button" onClick={() => setConfirmStop(false)}
                  style={{ padding: '11px 14px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmStop(true)}
                disabled={!isRunning}
                style={{
                  padding: '11px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700',
                  cursor: !isRunning ? 'not-allowed' : 'pointer',
                  background: isRunning ? 'rgba(239,68,68,0.12)' : SURFACE2,
                  color: isRunning ? '#f87171' : TEXT3,
                  border: `1px solid ${isRunning ? 'rgba(239,68,68,0.25)' : BORDER}`,
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  opacity: !isRunning ? 0.5 : 1,
                }}>
                <Icon name="stop" size={12} /> Stop
              </button>
            )}

            {confirmClearCache ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" disabled={clearCacheMutation.isPending} onClick={() => { clearCacheMutation.mutate(); setConfirmClearCache(false); }}
                  style={{ padding: '11px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700', cursor: clearCacheMutation.isPending ? 'not-allowed' : 'pointer', opacity: clearCacheMutation.isPending ? 0.5 : 1, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                  Confirm
                </button>
                <button type="button" onClick={() => setConfirmClearCache(false)}
                  style={{ padding: '11px 14px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClearCache(true)} disabled={clearCacheMutation.isPending || isRunning}
                title={isRunning ? 'Cannot clear cache while a scan is running' : undefined}
                style={{ padding: '11px 14px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '600', cursor: (clearCacheMutation.isPending || isRunning) ? 'not-allowed' : 'pointer', opacity: (clearCacheMutation.isPending || isRunning) ? 0.5 : 1, background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="trash" size={12} /> Clear Cache
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {healthLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="scn-skeleton" style={{ height: '78px', borderRadius: '14px' }} />
            ))}
          </>
        ) : (
          <>
            <Stat label="Roots" value={roots.length} accent="linear-gradient(90deg, #6366f1, #8b5cf6)" icon={<Icon name="layers" size={14} />} />
            <Stat label="Healthy" value={health?.healthyRoots ?? 0} accent="linear-gradient(90deg, #4ade80, #22c55e)" icon={<Icon name="check" size={14} />} />
            <Stat label="Total Videos" value={totalVideos.toLocaleString()} accent="linear-gradient(90deg, #60a5fa, #3b82f6)" icon={<Icon name="film" size={14} />} />
            <Stat label="Discovered" value={totalDiscovered.toLocaleString()} accent="linear-gradient(90deg, #a78bfa, #8b5cf6)" icon={<Icon name="zap" size={14} />} />
          </>
        )}
      </div>

      {/* Current Job Details */}
      {job && rootResults.length > 0 && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 }}>
              <Icon name="refresh" size={16} color={isRunning ? C.running : TEXT2} />
              Job Progress
            </h3>
            <span style={{ fontSize: '0.78rem', color: TEXT3 }}>
              {job.summary?.rootsScanned || 0} / {job.summary?.rootsRequested || 0} roots done
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <Stat label="Created" value={job.summary?.created || 0} accent="linear-gradient(90deg, #4ade80, #22c55e)" />
            <Stat label="Updated" value={job.summary?.updated || 0} accent="linear-gradient(90deg, #60a5fa, #3b82f6)" />
            <Stat label="Unchanged" value={job.summary?.unchanged || 0} accent="linear-gradient(90deg, #94a3b8, #64748b)" />
            <Stat label="Duplicates" value={job.summary?.duplicateDrafts || 0} accent="linear-gradient(90deg, #a78bfa, #8b5cf6)" />
            {(job.summary?.totalErrors || 0) > 0 && (
              <Stat label="Errors" value={job.summary.totalErrors} accent="linear-gradient(90deg, #f87171, #ef4444)" />
            )}
            {(job.summary?.deleted || 0) > 0 && (
              <Stat label="Deleted" value={job.summary.deleted} accent="linear-gradient(90deg, #f59e0b, #d97706)" />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
            {rootResults.map((root) => {
              const pct = root.totalCandidates > 0 ? (root.processed / root.totalCandidates) * 100 : 0;
              return (
                <div key={root.id} className="scn-anim-in" style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: root.status === 'running' ? 'rgba(34,197,94,0.05)' : SURFACE2,
                  border: `1px solid ${root.status === 'running' ? 'rgba(34,197,94,0.2)' : BORDER}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C[root.status] || TEXT3, flexShrink: 0 }} />
                      <span style={{ fontWeight: '600', color: TEXT, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{root.label}</span>
                      <StatusPill status={root.status} size="sm" />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: TEXT2, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: '#4ade80', fontWeight: '700' }}>+{root.created || 0}</span>
                      <span>{root.updated || 0} upd</span>
                      {(root.totalErrors || 0) > 0 && <span style={{ color: '#f87171' }}>{root.totalErrors} err</span>}
                    </div>
                  </div>
                  <ProgressBar percent={pct} color={pct >= 100 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #60a5fa, #3b82f6)'} height={4} animated={root.status === 'running'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: TEXT3 }}>{root.discovered || 0} folders discovered</span>
                    <span style={{ fontSize: '0.7rem', color: TEXT3, fontVariantNumeric: 'tabular-nums' }}>{root.processed || 0} / {root.totalCandidates || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roots */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 }}>
            <Icon name="folder" size={16} color={TEXT2} />
            Scan Roots
            <span style={{ fontSize: '0.78rem', color: TEXT3, fontWeight: '600' }}>· {roots.length}</span>
            {selectedRoots.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.1)' }}>
                {selectedRoots.length} selected
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['all', 'healthy', 'broken', 'remote', 'selected'].map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '600',
                  cursor: 'pointer', background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filter === f ? ACCENT : TEXT3,
                  border: `1px solid ${filter === f ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                  textTransform: 'capitalize',
                }}>{f}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {roots.length > 0 && selectedRoots.length < roots.length && (
            <button type="button" onClick={() => setSelectedRoots(roots.map(r => r.id))}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: ACCENT, border: `1px solid rgba(99,102,241,0.25)`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="check" size={10} /> Select All
            </button>
          )}
          {selectedRoots.length > 0 && (
            <button type="button" onClick={() => setSelectedRoots([])}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="x" size={10} /> Clear selection
            </button>
          )}
          <FixRootsButton />
        </div>

        {healthLoading ? (
          <div style={{ color: TEXT3, padding: '40px', textAlign: 'center' }}>
            <div className="scn-spin" style={{ display: 'inline-block' }}><Icon name="refresh" size={20} /></div>
          </div>
        ) : filteredRoots.length === 0 ? (
          <div style={{ color: TEXT3, padding: '40px', textAlign: 'center' }}>
            <Icon name="folder" size={32} color={TEXT3} />
            <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
              {filter === 'selected'
                ? 'No roots selected — click a root card below to select it for a partial scan'
                : 'No scan roots match this filter'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px' }}>
            {filteredRoots.map((root) => {
              const isSelected = selectedRoots.includes(root.id);
              const isCheckable = root.checkable !== false;
              const isBroken = !isCheckable || !root.exists || root.error;
              const statusColor = !isCheckable ? '#60a5fa' : root.exists ? (root.error ? '#facc15' : '#4ade80') : '#f87171';
              return (
                <div key={root.id} onClick={() => toggleRoot(root.id)}
                  role="checkbox" aria-checked={isSelected} tabIndex={0}
                  aria-label={`Select scan root ${root.label}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRoot(root.id); } }}
                  style={{
                    padding: '14px 16px', borderRadius: '12px',
                    background: isSelected ? 'rgba(99,102,241,0.08)' : SURFACE2,
                    border: `1px solid ${isSelected ? 'rgba(99,102,241,0.35)' : BORDER}`,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    position: 'relative', overflow: 'hidden',
                  }}>
                  {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div aria-hidden="true" style={{
                      width: '20px', height: '20px', borderRadius: '6px',
                      border: `2px solid ${isSelected ? ACCENT : BORDER}`,
                      background: isSelected ? ACCENT : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px', transition: 'all 0.15s',
                    }}>
                      {isSelected && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', color: TEXT, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{root.label}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: TEXT3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={root.scanPath}>{root.scanPath}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <Tag>{root.type}</Tag>
                        <Tag>{root.videoCount || 0} videos</Tag>
                        {!isCheckable && <Tag color="#60a5fa" bg="rgba(96,165,250,0.1)">remote</Tag>}
                        {root.lastCompletedAt && <Tag>{new Date(root.lastCompletedAt).toLocaleDateString()}</Tag>}
                      </div>
                      {root.error && (
                        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icon name="alert" size={10} color="#f87171" /> {root.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Runs Timeline */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: '0' }}>
            <Icon name="history" size={16} color={TEXT2} />
            Recent Runs
            {recentRuns.length > 0 && <span style={{ fontSize: '0.78rem', color: TEXT3, fontWeight: '600' }}>· {recentRuns.length}</span>}
          </h3>
          <select 
            value={runFilter} 
            onChange={(e) => setRunFilter(e.target.value)}
            style={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '6px',
              background: SURFACE2,
              border: `1px solid ${BORDER}`,
              color: TEXT2,
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="completed_with_errors">With Errors</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {filteredRuns.length > 0 ? (
          <div ref={runsContainerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '400px', overflowY: 'auto' }}>
            {filteredRuns.map((run, i) => {
              const dur = run.startedAt && run.completedAt
                ? formatDuration(Math.round((new Date(run.completedAt) - new Date(run.startedAt)) / 1000))
                : null;
              const isLast = i === filteredRuns.length - 1;
              const isRunning = run.status === 'running';
              const displayDur = isRunning ? elapsed : dur;
              return (
                <div 
                  key={run.id || i} 
                  className="scn-anim-in" 
                  style={{ display: 'flex', gap: '14px', position: 'relative', cursor: 'pointer' }}
                  onClick={() => setSelectedRun(run)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '24px' }}>
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: C[run.status] || TEXT3,
                      boxShadow: `0 0 0 3px ${(C[run.status] || TEXT3)}25`,
                      marginTop: '14px',
                    }} />
                    {!isLast && <div style={{ width: '2px', flex: 1, background: BORDER, marginTop: '4px' }} />}
                  </div>
                  <div style={{
                    flex: 1, paddingBottom: isLast ? '0' : '12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <StatusPill status={run.status} size="sm" />
                        {run.triggerSource && run.triggerSource !== 'manual' && (
                          <span style={{ 
                            fontSize: '0.68rem', 
                            color: run.triggerSource === 'auto' ? '#60a5fa' : '#a78bfa',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {run.triggerSource}
                          </span>
                        )}
                        {run.rootIds?.length > 0 && (
                          <span
                            style={{ fontSize: '0.72rem', color: TEXT2, fontWeight: '500' }}
                          >
                            {run.rootIds.slice(0, 2).map(id => roots.find(r => String(r.id) === String(id))?.label || id).join(', ')}
                            {run.rootIds.length > 2 && <span style={{ color: TEXT3 }}> +{run.rootIds.length - 2} more</span>}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: TEXT3 }}>
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : ''}
                        {displayDur !== null && <span style={{ color: TEXT2, marginLeft: '8px' }}>· {displayDur}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                      <Tag color="#4ade80" bg="rgba(34,197,94,0.1)">+{run.created || 0}</Tag>
                      <Tag>{run.updated || 0} upd</Tag>
                      {(run.totalErrors || 0) > 0 && <Tag color="#f87171" bg="rgba(239,68,68,0.1)">{run.totalErrors} err</Tag>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: TEXT3 }}>
            <Icon name="history" size={32} color={TEXT3} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ fontSize: '0.85rem', margin: '0 0 8px 0', fontWeight: '500' }}>
              {runFilter === 'all' ? 'No scan runs yet' : `No ${runFilter} runs found`}
            </p>
            <p style={{ fontSize: '0.75rem', margin: '0', opacity: 0.7 }}>
              {runFilter === 'all' ? 'Start a scan to see activity history here' : 'Try a different filter'}
            </p>
          </div>
        )}
        {filteredRuns.length > 0 && (
          <div style={{ pointerEvents: 'none', position: 'relative', marginTop: '-32px', height: '32px', background: `linear-gradient(to bottom, transparent, ${SURFACE})`, borderRadius: '0 0 8px 8px' }} />
        )}
        
        {/* Run Details Modal */}
        {selectedRun && (
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedRun(null)}
          >
            <div 
              style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px',
                maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto',
                padding: '24px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: TEXT }}>
                  Scan Run Details
                </h3>
                <button 
                  onClick={() => setSelectedRun(null)}
                  style={{
                    background: 'transparent', border: 'none', color: TEXT2,
                    cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Status</div>
                  <StatusPill status={selectedRun.status} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Trigger</div>
                  <span style={{ fontSize: '0.85rem', color: TEXT2, fontWeight: '500' }}>
                    {selectedRun.triggerSource || 'manual'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Started</div>
                  <div style={{ fontSize: '0.85rem', color: TEXT2 }}>
                    {selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '0.85rem', color: TEXT2 }}>
                    {selectedRun.completedAt ? new Date(selectedRun.completedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Tag color="#4ade80" bg="rgba(34,197,94,0.1)">+{selectedRun.created || 0} created</Tag>
                <Tag>{selectedRun.updated || 0} updated</Tag>
                <Tag>{selectedRun.unchanged || 0} unchanged</Tag>
                {selectedRun.deleted > 0 && <Tag color="#f87171" bg="rgba(239,68,68,0.1)">{selectedRun.deleted} deleted</Tag>}
              </div>
              
              {selectedRun.rootIds?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Roots Scanned</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedRun.rootIds.map(id => {
                      const root = roots.find(r => String(r.id) === String(id));
                      return (
                        <span key={id} style={{
                          fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px',
                          background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}`
                        }}>
                          {root?.label || id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {(selectedRun.errors?.length > 0 || selectedRun.rootResults?.some(r => r.errors?.length > 0)) && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Errors</div>
                  <div style={{ 
                    maxHeight: '200px', overflow: 'auto', 
                    background: SURFACE2, borderRadius: '8px', padding: '12px',
                    fontSize: '0.75rem', color: TEXT2
                  }}>
                    {selectedRun.errors?.map((err, i) => (
                      <div key={i} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: `1px solid ${BORDER}` }}>
                        {typeof err === 'string' ? err : JSON.stringify(err)}
                      </div>
                    ))}
                    {selectedRun.rootResults?.filter(r => r.errors?.length > 0).map((root, i) => (
                      <div key={`root-${i}`} style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {roots.find(r => String(r.id) === String(root.id))?.label || root.id}
                        </div>
                        {root.errors.map((err, j) => (
                          <div key={j} style={{ marginBottom: '4px', marginLeft: '8px' }}>
                            {typeof err === 'string' ? err : JSON.stringify(err)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedRun.skipped?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Skipped Items ({selectedRun.skipped.length})</div>
                  <div style={{ 
                    maxHeight: '150px', overflow: 'auto', 
                    background: SURFACE2, borderRadius: '8px', padding: '12px',
                    fontSize: '0.75rem', color: TEXT2
                  }}>
                    {selectedRun.skipped.map((item, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Run Details Modal */}
      {selectedRun && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedRun(null)}
        >
          <div 
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px',
              maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: TEXT }}>
                Scan Run Details
              </h3>
              <button 
                onClick={() => setSelectedRun(null)}
                style={{
                  background: 'transparent', border: 'none', color: TEXT2,
                  cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Status</div>
                <StatusPill status={selectedRun.status} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Trigger</div>
                <span style={{ fontSize: '0.85rem', color: TEXT2, fontWeight: '500' }}>
                  {selectedRun.triggerSource || 'manual'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Started</div>
                <div style={{ fontSize: '0.85rem', color: TEXT2 }}>
                  {selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '4px' }}>Completed</div>
                <div style={{ fontSize: '0.85rem', color: TEXT2 }}>
                  {selectedRun.completedAt ? new Date(selectedRun.completedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Tag color="#4ade80" bg="rgba(34,197,94,0.1)">+{selectedRun.created || 0} created</Tag>
              <Tag>{selectedRun.updated || 0} updated</Tag>
              <Tag>{selectedRun.unchanged || 0} unchanged</Tag>
              {selectedRun.deleted > 0 && <Tag color="#f87171" bg="rgba(239,68,68,0.1)">{selectedRun.deleted} deleted</Tag>}
            </div>
            
            {selectedRun.rootIds?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Roots Scanned</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedRun.rootIds.map(id => {
                    const root = roots.find(r => String(r.id) === String(id));
                    return (
                      <span key={id} style={{
                        fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px',
                        background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}`
                      }}>
                        {root?.label || id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {(selectedRun.errors?.length > 0 || selectedRun.rootResults?.some(r => r.errors?.length > 0)) && (
              <div>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Errors</div>
                <div style={{ 
                  maxHeight: '200px', overflow: 'auto', 
                  background: SURFACE2, borderRadius: '8px', padding: '12px',
                  fontSize: '0.75rem', color: TEXT2
                }}>
                  {selectedRun.errors?.map((err, i) => (
                    <div key={i} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: `1px solid ${BORDER}` }}>
                      {typeof err === 'string' ? err : JSON.stringify(err)}
                    </div>
                  ))}
                  {selectedRun.rootResults?.filter(r => r.errors?.length > 0).map((root, i) => (
                    <div key={`root-${i}`} style={{ marginTop: '8px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {roots.find(r => String(r.id) === String(root.id))?.label || root.id}
                      </div>
                      {root.errors.map((err, j) => (
                        <div key={j} style={{ marginBottom: '4px', marginLeft: '8px' }}>
                          {typeof err === 'string' ? err : JSON.stringify(err)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedRun.skipped?.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '0.7rem', color: TEXT3, marginBottom: '8px' }}>Skipped Items ({selectedRun.skipped.length})</div>
                <div style={{ 
                  maxHeight: '150px', overflow: 'auto', 
                  background: SURFACE2, borderRadius: '8px', padding: '12px',
                  fontSize: '0.75rem', color: TEXT2
                }}>
                  {selectedRun.skipped.map((item, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

const Tag = memo(function Tag({ children, color = TEXT2, bg = SURFACE2 }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '5px',
      fontSize: '0.68rem', fontWeight: '600',
      background: bg, color, border: `1px solid ${BORDER}`,
    }}>{children}</span>
  );
});

function FixRootsButton() {
  const [fixing, setFixing] = useState(false);
  const [dryResult, setDryResult] = useState(null);
  const [applied, setApplied] = useState(false);
  const toast = useContext(ToastContext);

  const preview = async () => {
    setDryResult(null);
    setApplied(false);
    try {
      const res = await adminService.fixMisconfiguredRoots(true);
      setDryResult(res);
    } catch (err) {
      const msg = err?.message || 'Failed to check roots';
      setDryResult({ error: msg });
      toast?.({ type: 'error', message: msg });
    }
  };

  const apply = async () => {
    setFixing(true);
    try {
      const res = await adminService.fixMisconfiguredRoots(false);
      setApplied(true);
      setDryResult({ ...res, applied: true });
      toast?.({ type: 'success', message: `Fixed ${res.deletedCount || 0} misconfigured entries.` });
    } catch (err) {
      const msg = err?.message || 'Failed to fix roots';
      setDryResult({ error: msg });
      toast?.({ type: 'error', message: msg });
    }
    setFixing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {!dryResult && !applied && (
        <button type="button" onClick={preview}
          title="Scans for catalog entries whose file paths no longer match any configured scan root — useful after moving files or changing scanner root paths"
          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="zap" size={11} /> Fix Misconfigured
        </button>
      )}
      {dryResult && !dryResult.applied && !dryResult.error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {dryResult.roots?.length > 0 ? (
            <>
              <span style={{ fontSize: '0.75rem', color: TEXT2 }}>
                {dryResult.roots.length} root(s) · {dryResult.roots.reduce((s, r) => s + r.entriesToDelete, 0)} entries
              </span>
              <button type="button" onClick={apply} disabled={fixing}
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: fixing ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {fixing ? 'Applying...' : 'Apply'}
              </button>
              <button type="button" onClick={() => setDryResult(null)}
                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` }}>
                Cancel
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name="check" size={11} /> All roots OK
            </span>
          )}
        </div>
      )}
      {dryResult?.error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{dryResult.error}</span>
          <button type="button" onClick={() => setDryResult(null)} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` }}>×</button>
        </div>
      )}
      {applied && (
        <span style={{ fontSize: '0.75rem', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Icon name="check" size={11} /> Fixed. Run a scan to re-index.
          <button type="button" onClick={() => { setDryResult(null); setApplied(false); }} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}`, marginLeft: '4px' }}>×</button>
        </span>
      )}
    </div>
  );
}
