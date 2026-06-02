import { useState, useRef, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';
import { ToastContext } from '../../components/ui/ToastContext';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';

const STATUS_COLORS = {
  running: '#4ade80',
  completed: '#60a5fa',
  failed: '#f87171',
  stopped: '#facc15',
  idle: TEXT3,
  pending: TEXT3,
  finalizing: '#60a5fa',
};

export default function ScannerPage() {
  const queryClient = useQueryClient();
  const logEndRef = useRef(null);
  const toast = useContext(ToastContext);
  const [prevJobStatus, setPrevJobStatus] = useState(null);

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['admin', 'scanner', 'health'],
    queryFn: () => adminService.getScannerHealth(),
    refetchInterval: 3000,
  });

  const { data: jobData } = useQuery({
    queryKey: ['admin', 'scanner', 'currentJob'],
    queryFn: () => adminService.getCurrentScannerJob(),
    refetchInterval: 3000,
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin', 'scanner', 'logs'],
    queryFn: () => adminService.getScannerLogs(15),
    refetchInterval: 5000,
  });

  const runMutation = useMutation({
    mutationFn: () => adminService.runScanner(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] }); },
  });

  const stopMutation = useMutation({
    mutationFn: () => adminService.stopScanner(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] }); },
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => adminService.clearScannerMetadataCache(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'scanner'] }); },
  });

  const job = jobData?.job || null;
  const roots = health?.roots || [];
  const recentRuns = logsData?.items || health?.recentRuns || [];
  const isRunning = job?.status === 'running';

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [recentRuns]);

  useEffect(() => {
    if (!job) return;
    if (prevJobStatus === 'running' && job.status !== 'running') {
      const summary = job.summary;
      const errCount = summary?.errors?.length || 0;
      const msg = errCount > 0
        ? `Scan completed with ${errCount} error(s). ${summary?.created || 0} created, ${summary?.updated || 0} updated, ${summary?.unchanged || 0} unchanged.`
        : `Scan completed successfully. ${summary?.created || 0} created, ${summary?.updated || 0} updated, ${summary?.unchanged || 0} unchanged, ${summary?.duplicateDrafts || 0} duplicates.`;
      toast?.({ type: errCount > 0 ? 'error' : 'success', message: msg, duration: 6000 });
    }
    setPrevJobStatus(job.status);
  }, [job?.status]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: TEXT, margin: 0, letterSpacing: '-0.03em' }}>Scanner</h1>
          <p style={{ fontSize: '0.88rem', color: TEXT3, margin: '4px 0 0 0' }}>
            Scan media folders, detect new files, and populate the catalog with metadata
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px',
            fontSize: '0.82rem', fontWeight: '700',
            background: isRunning ? 'rgba(34,197,94,0.12)' : SURFACE2,
            color: isRunning ? '#4ade80' : TEXT3,
            border: isRunning ? '1px solid rgba(34,197,94,0.25)' : `1px solid ${BORDER}`,
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#4ade80' : TEXT3, animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
            {isRunning ? 'Scanning...' : 'Idle'}
          </span>
          <button type="button" onClick={() => runMutation.mutate()}
            disabled={isRunning || runMutation.isPending}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
              cursor: isRunning ? 'not-allowed' : 'pointer', border: 'none',
              background: isRunning ? SURFACE2 : 'rgba(34,197,94,0.12)', color: isRunning ? TEXT3 : '#4ade80',
              border: isRunning ? `1px solid ${BORDER}` : '1px solid rgba(34,197,94,0.25)',
              opacity: isRunning ? 0.5 : 1,
            }}>
            {runMutation.isPending ? 'Starting...' : 'Run Scan'}
          </button>
          <button type="button" onClick={() => stopMutation.mutate()}
            disabled={!isRunning || stopMutation.isPending}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
              cursor: !isRunning ? 'not-allowed' : 'pointer', border: 'none',
              background: !isRunning ? SURFACE2 : 'rgba(239,68,68,0.1)', color: !isRunning ? TEXT3 : '#f87171',
              border: !isRunning ? `1px solid ${BORDER}` : '1px solid rgba(239,68,68,0.2)',
              opacity: !isRunning ? 0.5 : 1,
            }}>
            Stop
          </button>
          <button type="button" onClick={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
            style={{
              padding: '10px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '600',
              cursor: 'pointer', border: 'none', background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}`,
            }}>
            Clear Cache
          </button>
        </div>
      </div>

      {/* Job progress */}
      {job && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS[job.status] || TEXT2} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Current Job
            </h3>
            <span style={{ fontSize: '0.78rem', color: TEXT3, fontWeight: '500' }}>Started: {job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : '\u2014'}</span>
          </div>
          {job.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Roots Scanned', value: `${job.summary.rootsScanned || 0} / ${job.summary.rootsRequested || 0}` },
                { label: 'Created', value: job.summary.created || 0 },
                { label: 'Updated', value: job.summary.updated || 0 },
                { label: 'Unchanged', value: job.summary.unchanged || 0 },
                { label: 'Deleted', value: job.summary.deleted || 0 },
                { label: 'Duplicates', value: job.summary.duplicateDrafts || 0 },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px', borderRadius: '12px', background: SURFACE2, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{s.label}</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: '800', color: TEXT, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
          {job.summary?.rootResults?.map(root => (
            <div key={root.id} style={{ padding: '12px 16px', borderRadius: '10px', background: SURFACE2, border: `1px solid ${BORDER}`, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[root.status] || TEXT3, flexShrink: 0 }} />
                <span style={{ fontWeight: '600', color: TEXT, fontSize: '0.88rem' }}>{root.label}</span>
                <span style={{ fontSize: '0.75rem', color: TEXT3 }}>({root.type})</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: TEXT2, flexWrap: 'wrap' }}>
                <span>{root.discovered || 0} folders</span>
                <span>{root.processed || 0} / {root.totalCandidates || 0} processed</span>
                <span style={{ color: '#4ade80', fontWeight: '600' }}>+{root.created || 0}</span>
                {root.errors?.length > 0 && <span style={{ color: '#f87171' }}>{root.errors.length} errors</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roots */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            Scan Roots ({roots.length})
          </h3>
          <FixRootsButton />
        </div>
        {healthLoading ? (
          <div style={{ color: TEXT3, padding: '20px', textAlign: 'center' }}>Loading...</div>
        ) : roots.length === 0 ? (
          <div style={{ color: TEXT3, padding: '20px', textAlign: 'center' }}>No scan roots configured.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roots.map(root => (
              <div key={root.id} style={{
                padding: '14px 16px', borderRadius: '10px', background: SURFACE2, border: `1px solid ${BORDER}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                    background: root.exists ? (root.error ? '#facc15' : '#4ade80') : '#f87171',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: TEXT, fontSize: '0.88rem' }}>{root.label}</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT3 }}>{root.scanPath}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: TEXT2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={tagStyle}>{root.type}</span>
                  <span style={tagStyle}>{root.videoCount || 0} videos</span>
                  {root.lastCompletedAt && <span style={tagStyle}>Last scan: {new Date(root.lastCompletedAt).toLocaleDateString()}</span>}
                  {root.error && <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{root.error}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: '0 0 16px 0' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Recent Runs ({recentRuns.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {recentRuns.map((run, i) => (
              <div key={run.id || i} style={{
                padding: '12px 16px', borderRadius: '10px', background: SURFACE2, border: `1px solid ${BORDER}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLORS[run.status] || TEXT3,
                  }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '600', color: TEXT }}>
                      {run.status?.toUpperCase()}
                      {run.rootIds?.length > 0 && ` \u2014 ${run.rootIds.length} root(s)`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: TEXT3 }}>
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : ''}
                      {run.completedAt ? ` \u2192 ${new Date(run.completedAt).toLocaleTimeString()}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: TEXT2, flexWrap: 'wrap' }}>
                  <span style={tagStyle}>+{run.created || 0} created</span>
                  <span style={tagStyle}>{run.updated || 0} updated</span>
                  {run.errors?.length > 0 && <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>{run.errors.length} errors</span>}
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function FixRootsButton() {
  const [fixing, setFixing] = useState(false);
  const [dryResult, setDryResult] = useState(null);
  const [applied, setApplied] = useState(false);

  const preview = async () => {
    setDryResult(null);
    setApplied(false);
    try {
      const res = await adminService.fixMisconfiguredRoots(true);
      setDryResult(res);
    } catch { setDryResult({ error: 'Failed to check roots' }); }
  };

  const apply = async () => {
    setFixing(true);
    try {
      const res = await adminService.fixMisconfiguredRoots(false);
      setApplied(true);
      setDryResult({ ...res, applied: true });
    } catch { setDryResult({ ...dryResult, error: 'Failed to fix roots' }); }
    setFixing(false);
  };

  return (
    <div>
      {!dryResult && !applied && (
        <button type="button" onClick={preview}
          style={{
            padding: '8px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '600',
            cursor: 'pointer', border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.25)',
          }}>
          Fix Misconfigured Roots
        </button>
      )}
      {dryResult && !dryResult.applied && !dryResult.error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {dryResult.roots?.length > 0 ? (
            <>
              <span style={{ fontSize: '0.78rem', color: TEXT2 }}>
                {dryResult.roots.map(r => r.label).join(', ')} ({dryResult.roots.reduce((s, r) => s + r.entriesToDelete, 0)} entries)
              </span>
              <button type="button" onClick={apply} disabled={fixing}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '700',
                  cursor: fixing ? 'not-allowed' : 'pointer', border: 'none',
                  background: 'rgba(239,68,68,0.12)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                  opacity: fixing ? 0.5 : 1,
                }}>
                {fixing ? 'Applying...' : 'Apply Fix'}
              </button>
              <button type="button" onClick={() => setDryResult(null)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem',
                  cursor: 'pointer', border: 'none', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}`,
                }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.78rem', color: '#4ade80' }}>All roots configured correctly</span>
              <button type="button" onClick={() => setDryResult(null)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem',
                  cursor: 'pointer', border: 'none', background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}`,
                }}>
                Dismiss
              </button>
            </>
          )}
        </div>
      )}
      {dryResult?.error && (
        <span style={{ fontSize: '0.78rem', color: '#f87171' }}>{dryResult.error}</span>
      )}
      {applied && (
        <span style={{ fontSize: '0.78rem', color: '#4ade80' }}>Roots fixed. Run a scan to re-index.</span>
      )}
    </div>
  );
}

const tagStyle = {
  padding: '2px 8px', borderRadius: '4px', background: SURFACE2,
  border: `1px solid ${BORDER}`, fontWeight: '600',
};
