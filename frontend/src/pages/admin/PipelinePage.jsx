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
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' },
  statCard: (color) => ({
    background: 'var(--surface)', borderRadius: '12px', padding: 'var(--spacing-md)',
    border: '1px solid var(--border-color)',
    borderLeft: `3px solid ${color}`,
  }),
  statValue: { fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' },
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
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  'normalizer-queued': '#8b5cf6',
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

  const startPipe = useMutation({
    mutationFn: adminService.startPipeline,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); },
  });

  const clearPipe = useMutation({
    mutationFn: adminService.clearPipeline,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pipeline'] }); setShowClearModal(false); },
  });

  const retryScanner = useMutation({
    mutationFn: adminService.retryPipelineScannerItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  const retryNormalizer = useMutation({
    mutationFn: adminService.retryPipelineNormalizerItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  const retryAll = useMutation({
    mutationFn: adminService.retryAllPipelineFailed,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  const status = statusQ.data;
  const isRunning = status?.lock?.pid;

  const sQueues = status?.scanner || {};
  const nQueues = status?.normalizer || {};
  const stats = status?.stats || {};

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.headerTitle}>Pipeline Queue</h1>
        <div style={S.controls}>
          <Button variant="primary" onClick={() => startPipe.mutate()} disabled={isRunning || startPipe.isPending}>
            {startPipe.isPending ? 'Starting...' : isRunning ? 'Running' : 'Start Pipeline'}
          </Button>
          <Button variant="danger" onClick={() => setShowClearModal(true)} disabled={startPipe.isPending}>
            Clear & Reset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        <div style={S.statCard('#3b82f6')}>
          <div style={S.statValue}>{stats.discovered || 0}</div>
          <div style={S.statLabel}>Discovered</div>
        </div>
        <div style={S.statCard('#22c55e')}>
          <div style={S.statValue}>{stats.native || 0}</div>
          <div style={S.statLabel}>Browser-Native</div>
        </div>
        <div style={S.statCard('#8b5cf6')}>
          <div style={S.statValue}>{stats.normalized || 0}</div>
          <div style={S.statLabel}>Normalized</div>
        </div>
        <div style={S.statCard('#f59e0b')}>
          <div style={S.statValue}>{stats.published || 0}</div>
          <div style={S.statLabel}>Published</div>
        </div>
        <div style={S.statCard('#f97316')}>
          <div style={S.statValue}>{stats.drafts || 0}</div>
          <div style={S.statLabel}>Drafts</div>
        </div>
        <div style={S.statCard('#ef4444')}>
          <div style={S.statValue}>{stats.failed || 0}</div>
          <div style={S.statLabel}>Failed</div>
        </div>
      </div>

      {/* Queue Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={S.section}>
          <div style={S.sectionHeader}><span style={S.sectionTitle}>Scanner Queue</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: 'var(--spacing-md)' }}>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{sQueues.pending || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Pending</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>{sQueues.processing || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Processing</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{sQueues.completed || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Completed</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#8b5cf6' }}>{sQueues.normalizerQueued || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>→ Normalizer</div></div>
          </div>
        </div>
        <div style={S.section}>
          <div style={S.sectionHeader}><span style={S.sectionTitle}>Normalizer Queue</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: 'var(--spacing-md)' }}>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{nQueues.pending || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Pending</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>{nQueues.processing || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Processing</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#22c55e' }}>{nQueues.completed || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Completed</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{nQueues.failed || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Failed</div></div>
          </div>
        </div>
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

      {/* Tab Content */}
      {activeTab === 'scanner' && (
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Scanner Queue ({sQueues.total || 0} items)</span>
            <Button variant="ghost" size="small" onClick={() => retryAll.mutate()}>Retry All Failed</Button>
          </div>
          {scannerQ.isLoading ? <LoadingState /> : (
            !scannerQ.data?.length ? <EmptyState title="Queue Empty" message="Run the pipeline to discover media files" /> : (
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

      {activeTab === 'normalizer' && (
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Normalizer Queue ({nQueues.total || 0} items)</span>
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
