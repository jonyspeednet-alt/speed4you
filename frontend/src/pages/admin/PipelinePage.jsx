import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingState from '../../components/feedback/LoadingState';
import EmptyState from '../../components/feedback/EmptyState';

const S = {
  page: { padding: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' },
  headerTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' },
  panel: { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  panelHead: (color) => ({
    padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)',
    borderLeft: `3px solid ${color}`,
  }),
  panelTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' },
  panelBody: { padding: 'var(--spacing-md)' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' },
  statusDot: (running) => ({ width: '10px', height: '10px', borderRadius: '50%', background: running ? '#22c55e' : '#6b7280', flexShrink: 0 }),
  statusLabel: (running) => ({ fontSize: '0.85rem', color: running ? '#22c55e' : 'var(--text-3)', fontWeight: 500 }),
  btnGroup: { display: 'flex', gap: '8px', marginBottom: 'var(--spacing-md)' },
  miniStatGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  miniStat: { textAlign: 'center' },
  miniStatVal: (color) => ({ fontSize: '1.2rem', fontWeight: 700, color: color || 'var(--text)' }),
  miniStatLbl: { fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' },
  statCard: (color) => ({
    background: 'var(--surface)', borderRadius: '12px', padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--border-color)',
    borderLeft: `3px solid ${color}`,
  }),
  statValue: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' },
  section: { background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)', overflow: 'hidden' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-md)', borderBottom: '1px solid var(--border-color)' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-2)' },
  td: { padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text-2)', borderBottom: '1px solid var(--border-color)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logSection: { background: '#0a0a0f', borderRadius: '8px', padding: 'var(--spacing-md)', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.6 },
  logLine: { color: 'var(--text-2)' },
  controls: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
};

const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', completed: '#22c55e',
  failed: '#ef4444', 'normalizer-queued': '#8b5cf6',
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  return <Badge style={{ background: color + '22', color, border: `1px solid ${color}44`, fontWeight: 500 }}>{status}</Badge>;
}

function truncatePath(p, max) {
  if (!p) return '';
  if (p.length <= max) return p;
  const parts = p.split(/[/\\]/);
  if (parts.length < 3) return '...' + p.slice(-max);
  return parts.slice(0, 2).join('/') + '/.../' + parts.slice(-1);
}

function WorkerPanel({ title, color, lock, queueStats, onStart, onStop, startPending, extraStats }) {
  const running = !!lock?.pid;
  return (
    <div style={S.panel}>
      <div style={S.panelHead(color)}>
        <div style={S.panelTitle}>
          <span style={{ color }}>{title}</span>
        </div>
      </div>
      <div style={S.panelBody}>
        <div style={S.statusRow}>
          <div style={S.statusDot(running)} />
          <span style={S.statusLabel(running)}>{running ? `Running (pid ${lock.pid})` : 'Idle'}</span>
        </div>
        <div style={S.btnGroup}>
          <Button variant="primary" size="small" onClick={onStart} disabled={running || startPending}>
            {startPending ? 'Starting...' : running ? 'Running' : 'Start'}
          </Button>
          <Button variant="danger" size="small" onClick={onStop} disabled={!running}>
            Stop
          </Button>
        </div>
        <div style={S.miniStatGrid}>
          <div style={S.miniStat}>
            <div style={S.miniStatVal('#f59e0b')}>{queueStats?.pending || 0}</div>
            <div style={S.miniStatLbl}>Pending</div>
          </div>
          <div style={S.miniStat}>
            <div style={S.miniStatVal('#3b82f6')}>{queueStats?.processing || 0}</div>
            <div style={S.miniStatLbl}>Processing</div>
          </div>
          <div style={S.miniStat}>
            <div style={S.miniStatVal('#22c55e')}>{queueStats?.completed || 0}</div>
            <div style={S.miniStatLbl}>Completed</div>
          </div>
          <div style={S.miniStat}>
            <div style={S.miniStatVal('#ef4444')}>{queueStats?.failed || 0}</div>
            <div style={S.miniStatLbl}>Failed</div>
          </div>
        </div>
        {extraStats}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const qc = useQueryClient();
  const [showClearModal, setShowClearModal] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');

  const statusQ = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: adminService.getPipelineStatus,
    refetchInterval: 3000,
  });

  const scannerQ = useQuery({
    queryKey: ['pipeline-scanner'],
    queryFn: () => adminService.getPipelineScannerQueue(100),
    refetchInterval: 5000,
  });

  const normalizerQ = useQuery({
    queryKey: ['pipeline-normalizer'],
    queryFn: () => adminService.getPipelineNormalizerQueue(100),
    refetchInterval: 5000,
  });

  const logQ = useQuery({
    queryKey: ['pipeline-log'],
    queryFn: () => adminService.getPipelineLog(100),
    refetchInterval: 3000,
  });

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['pipeline'] }), [qc]);

  // Full pipeline
  const startPipe = useMutation({ mutationFn: adminService.startPipeline, onSuccess: invalidate });
  // Scanner
  const startScan = useMutation({ mutationFn: adminService.startScanner, onSuccess: invalidate });
  const stopScan = useMutation({ mutationFn: adminService.stopScanner, onSuccess: invalidate });
  // Normalizer
  const startNorm = useMutation({ mutationFn: adminService.startNormalizer, onSuccess: invalidate });
  const stopNorm = useMutation({ mutationFn: adminService.stopNormalizer, onSuccess: invalidate });
  // Clear
  const clearPipe = useMutation({
    mutationFn: adminService.clearPipeline,
    onSuccess: () => { invalidate(); setShowClearModal(false); },
  });
  // Retry
  const retryScanner = useMutation({ mutationFn: adminService.retryPipelineScannerItem, onSuccess: invalidate });
  const retryNormalizer = useMutation({ mutationFn: adminService.retryPipelineNormalizerItem, onSuccess: invalidate });
  const retryAll = useMutation({ mutationFn: adminService.retryAllPipelineFailed, onSuccess: invalidate });

  const data = statusQ.data;
  const scannerLock = data?.scannerLock;
  const normalizerLock = data?.normalizerLock;
  const sQ = data?.scanner || {};
  const nQ = data?.normalizer || {};
  const stats = data?.stats || {};
  const fullRunning = !!data?.lock?.pid;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.headerTitle}>Pipeline Controls</h1>
        <div style={S.controls}>
          <Button variant="primary" onClick={() => startPipe.mutate()} disabled={fullRunning || startPipe.isPending}>
            {startPipe.isPending ? 'Starting...' : fullRunning ? 'Full Pipeline Running' : 'Start Full Pipeline'}
          </Button>
          <Button variant="danger" onClick={() => setShowClearModal(true)}>Clear & Reset</Button>
        </div>
      </div>

      {/* Global Stats */}
      <div style={S.statsRow}>
        {[
          { label: 'Discovered', value: stats.discovered || 0, color: '#3b82f6' },
          { label: 'Browser-Native', value: stats.native || 0, color: '#22c55e' },
          { label: 'Normalized', value: stats.normalized || 0, color: '#8b5cf6' },
          { label: 'Published', value: stats.published || 0, color: '#f59e0b' },
          { label: 'Drafts', value: stats.drafts || 0, color: '#f97316' },
          { label: 'Failed', value: stats.failed || 0, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statValue}>{s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Scanner & Normalizer Panels */}
      <div style={S.grid2}>
        <WorkerPanel
          title="Scanner"
          color="#3b82f6"
          lock={scannerLock}
          queueStats={sQ}
          onStart={() => startScan.mutate()}
          onStop={() => stopScan.mutate()}
          startPending={startScan.isPending}
          extraStats={
            <div style={{ ...S.miniStatGrid, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <div style={S.miniStat}>
                <div style={S.miniStatVal('#8b5cf6')}>{sQ.normalizerQueued || 0}</div>
                <div style={S.miniStatLbl}>→ Normalizer</div>
              </div>
              <div style={S.miniStat}>
                <div style={S.miniStatVal('var(--text)')}>{sQ.total || 0}</div>
                <div style={S.miniStatLbl}>Total</div>
              </div>
            </div>
          }
        />
        <WorkerPanel
          title="Normalizer"
          color="#8b5cf6"
          lock={normalizerLock}
          queueStats={nQ}
          onStart={() => startNorm.mutate()}
          onStop={() => stopNorm.mutate()}
          startPending={startNorm.isPending}
          extraStats={
            <div style={{ ...S.miniStatGrid, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <div style={S.miniStat}>
                <div style={S.miniStatVal('var(--text)')}>{nQ.total || 0}</div>
                <div style={S.miniStatLbl}>Total</div>
              </div>
            </div>
          }
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)' }}>
        {['scanner', 'normalizer', 'log'].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
            color: activeTab === tab ? 'var(--text)' : 'var(--text-3)',
            borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{tab === 'scanner' ? 'Scanner Queue' : tab === 'normalizer' ? 'Normalizer Queue' : 'Activity Log'}</div>
        ))}
      </div>

      {/* Scanner Queue Tab */}
      {activeTab === 'scanner' && (
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Scanner Queue ({sQ.total || 0} items)</span>
            <Button variant="ghost" size="small" onClick={() => retryAll.mutate()}>Retry All Failed</Button>
          </div>
          {scannerQ.isLoading ? <LoadingState /> : (
            !scannerQ.data?.length ? <EmptyState title="Queue Empty" message="Run the scanner to discover media files" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={S.th}>File</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Strategy</th>
                    <th style={S.th}>Error</th>
                    <th style={S.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {scannerQ.data.slice(0, 50).map(item => (
                      <tr key={item.id}>
                        <td style={S.td} title={item.filePath}>{truncatePath(item.filePath, 60)}</td>
                        <td style={S.td}><StatusBadge status={item.status} /></td>
                        <td style={S.td}>{item.strategy || '-'}</td>
                        <td style={{ ...S.td, color: '#ef4444', maxWidth: '200px' }}>{item.error || '-'}</td>
                        <td style={S.td}>
                          {item.status === 'failed' && (
                            <Button variant="ghost" size="small" onClick={() => retryScanner.mutate(item.id)}>Retry</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* Normalizer Queue Tab */}
      {activeTab === 'normalizer' && (
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Normalizer Queue ({nQ.total || 0} items)</span>
          </div>
          {normalizerQ.isLoading ? <LoadingState /> : (
            !normalizerQ.data?.length ? <EmptyState title="Queue Empty" message="No files need normalization" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={S.th}>File</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Strategy</th>
                    <th style={S.th}>Metadata</th>
                    <th style={S.th}>Error</th>
                    <th style={S.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {normalizerQ.data.slice(0, 50).map(item => (
                      <tr key={item.id}>
                        <td style={S.td} title={item.filePath}>{truncatePath(item.filePath, 60)}</td>
                        <td style={S.td}><StatusBadge status={item.status} /></td>
                        <td style={S.td}>{item.strategy || '-'}</td>
                        <td style={S.td}>{item.metadataStatus || '-'}</td>
                        <td style={{ ...S.td, color: '#ef4444', maxWidth: '200px' }}>{item.error || '-'}</td>
                        <td style={S.td}>
                          {item.status === 'failed' && (
                            <Button variant="ghost" size="small" onClick={() => retryNormalizer.mutate(item.id)}>Retry</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'log' && (
        <div style={S.section}>
          <div style={S.sectionHeader}><span style={S.sectionTitle}>Activity Log</span></div>
          <div style={S.logSection}>
            {logQ.isLoading ? <LoadingState /> : (
              !logQ.data?.length ? <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '20px' }}>No log entries</div> : (
                logQ.data.slice().reverse().map((entry, i) => (
                  <div key={i} style={S.logLine}>
                    <span style={{ color: 'var(--text-3)' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    {' '}{entry.message}
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <Modal title="Clear All Pipeline Data" onClose={() => setShowClearModal(false)}>
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-2)' }}>
            This will clear ALL scanner and normalizer queues, logs, and stats. This action cannot be undone.
            Running workers will continue — stop them first if you want a clean slate.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowClearModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => clearPipe.mutate()} disabled={clearPipe.isPending}>
              {clearPipe.isPending ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
