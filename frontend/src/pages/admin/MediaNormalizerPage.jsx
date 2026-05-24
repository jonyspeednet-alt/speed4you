import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';

function formatSeconds(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) return `${hh}h ${mm}m ${String(ss).padStart(2, '0')}s`;
  if (mm > 0) return `${mm}m ${String(ss).padStart(2, '0')}s`;
  return `${ss}s`;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '\u2014';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

function logType(line) {
  if (!line) return 'info';
  if (line.includes('failed') || line.includes('error') || line.includes('Error')) return 'error';
  if (line.includes('start') || line.includes('started')) return 'start';
  if (line.includes('skip') || line.includes('done')) return 'success';
  if (line.includes('pause') || line.includes('warn')) return 'warn';
  return 'info';
}

const LOG_COLORS = {
  error: '#f87171',
  start: '#60a5fa',
  success: '#4ade80',
  warn: '#facc15',
  info: '#7ee787',
};

const PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const bgColor = toast.type === 'error' ? 'rgba(239,68,68,0.15)' : toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)';
  const borderColor = toast.type === 'error' ? 'rgba(239,68,68,0.3)' : toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)';
  const textColor = toast.type === 'error' ? '#f87171' : toast.type === 'success' ? '#4ade80' : '#60a5fa';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
      borderRadius: '12px', background: bgColor, border: `1px solid ${borderColor}`,
      color: textColor, fontSize: '0.85rem', fontWeight: '600', minWidth: '280px',
      maxWidth: '420px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      animation: 'toastIn 0.25s ease-out',
    }}>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button type="button" onClick={() => onDismiss(toast.id)}
        style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', opacity: 0.6, fontSize: '1rem', padding: '2px 4px' }}>
        &times;
      </button>
    </div>
  );
}

let toastIdCounter = 0;

export default function MediaNormalizerPage() {
  const queryClient = useQueryClient();
  const logEndRef = useRef(null);
  const [logFilter, setLogFilter] = useState('all');
  const [toasts, setToasts] = useState([]);
  const prevProcessedRef = useRef(null);
  const prevFailedRef = useRef(null);
  const [configOpen, setConfigOpen] = useState(false);

  const { data: normalizer = { running: false, state: null, recentLogLines: [] }, error: normalizerError } = useQuery({
    queryKey: ['admin', 'normalizer', 'status'],
    queryFn: () => adminService.getMediaNormalizerStatus(),
    refetchInterval: 2000,
  });

  const { data: normalizerConfig } = useQuery({
    queryKey: ['admin', 'normalizer', 'config'],
    queryFn: () => adminService.getNormalizerConfig(),
  });

  const normalizerMutation = useMutation({
    mutationFn: (action) => action === 'start'
      ? adminService.startMediaNormalizer()
      : adminService.stopMediaNormalizer(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'normalizer', 'status'] }),
  });

  const retryMutation = useMutation({
    mutationFn: (filePath) => adminService.retryMediaNormalizerFile(filePath),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'normalizer', 'status'] }),
  });

  const configMutation = useMutation({
    mutationFn: (cfg) => adminService.setNormalizerConfig(cfg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'normalizer', 'config'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'normalizer', 'status'] });
    },
  });

  const addToast = useCallback((type, message) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Detect new done/failed entries
  useEffect(() => {
    const processed = normalizer.state?.processed || {};
    const failed = normalizer.state?.failed || {};

    if (prevProcessedRef.current && prevFailedRef.current) {
      const prevProc = prevProcessedRef.current;
      const prevFail = prevFailedRef.current;

      for (const [key, entry] of Object.entries(processed)) {
        if (!prevProc[key] && entry.note === 'converted-and-replaced (full-transcode)') {
          const name = key.split('/').pop() || key;
          const saved = entry.inputSize && entry.outputSize
            ? ` (saved ${formatBytes(entry.inputSize - entry.outputSize)})` : '';
          addToast('success', `\u2705 ${name}${saved}`);
        }
      }

      for (const [key] of Object.entries(failed)) {
        if (!prevFail[key]) {
          const name = key.split('/').pop() || key;
          addToast('error', `\u274c ${name}`);
        }
      }
    }

    prevProcessedRef.current = processed;
    prevFailedRef.current = failed;
  }, [normalizer.state?.processed, normalizer.state?.failed, addToast]);

  const currentProgress = normalizer.state?.currentFileProgress || null;
  const pct = Math.max(0, Math.min(100, Number(currentProgress?.percent || 0)));
  const duration = Number(currentProgress?.durationSeconds || 0);
  const elapsed = Number(currentProgress?.progressSeconds || 0);
  const speed = parseFloat(currentProgress?.speed || '0');
  const eta = (speed > 0 && duration > 0 && elapsed < duration)
    ? formatSeconds((duration - elapsed) / speed)
    : null;

  const stats = normalizer.state?.stats || {};
  const total = (stats.converted || 0) + (stats.failed || 0) + (stats.skippedAlreadyOk || 0);

  const { totalInput, totalOutput, savedBytes, compressionPct } = useMemo(() => {
    const processed = normalizer.state?.processed || {};
    let input = 0, output = 0;
    for (const entry of Object.values(processed)) {
      if (entry.inputSize && entry.outputSize) {
        input += Number(entry.inputSize);
        output += Number(entry.outputSize);
      }
    }
    return {
      totalInput: input,
      totalOutput: output,
      savedBytes: input - output,
      compressionPct: input > 0 ? ((1 - output / input) * 100) : 0,
    };
  }, [normalizer.state?.processed]);

  const recentHistory = useMemo(() => {
    const lines = normalizer.recentLogLines || [];
    return lines.filter(l =>
      l.includes(' done ') || l.includes(' failed ') || l.includes(' skip-ok')
    ).slice(-10).reverse();
  }, [normalizer.recentLogLines]);

  const filteredLogs = logFilter === 'all'
    ? (normalizer.recentLogLines || [])
    : (normalizer.recentLogLines || []).filter(l => logType(l) === logFilter);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length]);

  const concurrency = normalizerConfig?.concurrency || 2;

  return (
    <div style={s.page}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Toast container */}
      <div style={s.toastContainer}>
        {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={dismissToast} />)}
      </div>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Media Normalizer</h1>
          <p style={s.subtitle}>Converts media to MP4 / H.264 / AAC with faststart for smooth playback</p>
        </div>
        <div style={s.headerRight}>
          <span style={{ ...s.badge, ...(normalizer.running ? s.badgeRunning : s.badgeIdle) }}>
            <span style={s.badgeDot} />
            {normalizer.running ? 'Running' : 'Idle'}
          </span>
          <div style={s.controls}>
            <button
              type="button"
              style={{ ...s.btn, ...(normalizer.running || normalizerMutation.isPending ? s.btnDisabled : s.btnStart) }}
              onClick={() => normalizerMutation.mutate('start')}
              disabled={normalizerMutation.isPending || normalizer.running}
            >
              {normalizerMutation.isPending && normalizerMutation.variables === 'start' ? 'Starting...' : 'Start'}
            </button>
            <button
              type="button"
              style={{ ...s.btn, ...(!normalizer.running || normalizerMutation.isPending ? s.btnDisabled : s.btnStop) }}
              onClick={() => normalizerMutation.mutate('stop')}
              disabled={normalizerMutation.isPending || !normalizer.running}
            >
              {normalizerMutation.isPending && normalizerMutation.variables === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          </div>
        </div>
      </div>

      {normalizerError && (
        <div style={s.errorBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {normalizerError.message || 'Status check failed'}
        </div>
      )}

      {/* Stats row */}
      <div style={s.statsRow}>
        <div style={{ ...s.statCard, ...s.statConverted }}>
          <div style={s.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg></div>
          <span style={s.statVal}>{stats.converted || 0}</span>
          <span style={s.statLabel}>Converted</span>
        </div>
        <div style={{ ...s.statCard, ...s.statOk }}>
          <div style={s.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg></div>
          <span style={s.statVal}>{stats.skippedAlreadyOk || 0}</span>
          <span style={s.statLabel}>Already OK</span>
        </div>
        <div style={{ ...s.statCard, ...s.statFailed }}>
          <div style={s.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
          <span style={s.statVal}>{stats.failed || 0}</span>
          <span style={s.statLabel}>Failed</span>
        </div>
        <div style={{ ...s.statCard, ...s.statTotal }}>
          <div style={s.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
          <span style={s.statVal}>{total}</span>
          <span style={s.statLabel}>Total Processed</span>
        </div>
        <div style={{ ...s.statCard, ...s.statSaved }}>
          <div style={s.statIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></div>
          <span style={s.statVal}>{formatBytes(savedBytes)}</span>
          <span style={s.statLabel}>Space Saved ({compressionPct.toFixed(1)}%)</span>
        </div>
      </div>

      {/* Savings bar */}
      {totalInput > 0 && (
        <div style={s.savingsBar}>
          <div style={s.savingsLabel}>
            <span>Total input: {formatBytes(totalInput)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <span>Output: {formatBytes(totalOutput)}</span>
            <span style={s.savingsHighlight}>Saved {formatBytes(savedBytes)} ({compressionPct.toFixed(1)}% smaller)</span>
          </div>
          <div style={s.savingsTrack}>
            <div style={{ ...s.savingsFill, width: `${Math.min(100, (totalOutput / totalInput) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={s.grid}>

        {/* Left: Progress + Workers + History + Config */}
        <div style={s.leftCol}>

          {/* Current Progress */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Current Progress
              </h3>
              {currentProgress && <span style={s.eta}>ETA: {eta || 'calculating...'}</span>}
            </div>

            {currentProgress ? (
              <div style={s.progressSection}>
                <div style={s.progressFileRow}>
                  <div style={s.fileIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg></div>
                  <span style={s.progressFileName} title={currentProgress.filePath}>
                    {currentProgress.filePath?.split('/').pop() || 'Processing...'}
                  </span>
                  <span style={s.progressPct}>{pct.toFixed(1)}%</span>
                </div>

                <div style={s.progressTrack}>
                  <div style={{
                    ...s.progressFill, width: `${pct}%`,
                    background: pct > 90 ? 'linear-gradient(90deg, #22c55e, #84cc16)'
                      : pct > 50 ? 'linear-gradient(90deg, #3b82f6, #22c55e)'
                      : 'linear-gradient(90deg, #6366f1, #3b82f6)'
                  }} />
                  <div style={{ ...s.progressGlow, width: `${pct}%` }} />
                </div>

                <div style={s.progressMeta}>
                  <span>{formatSeconds(elapsed)} / {formatSeconds(duration)}</span>
                  <span style={s.metaDivider}>|</span>
                  <span>Speed: <strong style={{ color: '#4ade80' }}>{currentProgress.speed || '\u2014'}</strong></span>
                  <span style={s.metaDivider}>|</span>
                  <span>Phase: <strong style={{ color: '#60a5fa' }}>{currentProgress.phase || '\u2014'}</strong></span>
                </div>

                {currentProgress.fps && <div style={s.progressFps}>{currentProgress.fps} fps</div>}
              </div>
            ) : (
              <div style={s.emptyState}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span>No active conversion. Press <strong>Start</strong> to begin.</span>
              </div>
            )}
          </div>

          {/* Worker status */}
          {normalizer.running && (
            <div style={s.card}>
              <div style={s.cardHeader}>
                <h3 style={s.cardTitle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                  Workers
                </h3>
                <span style={s.concurrencyBadge}>{concurrency} concurrent</span>
              </div>
              <div style={s.workersGrid}>
                {Array.from({ length: Math.max(2, concurrency) }).map((_, i) => (
                  <div key={i} style={(currentProgress && i === 0) ? s.workerCard : s.workerCardIdle}>
                    <div style={s.workerHeader}>
                      {(currentProgress && i === 0) ? <span style={s.workerActiveDot} /> : <span style={s.workerIdleDot} />}
                      <span style={s.workerLabel}>Worker {i + 1}</span>
                    </div>
                    <span style={(currentProgress && i === 0) ? s.workerFile : s.workerIdleText}>
                      {(currentProgress && i === 0) ? (currentProgress.filePath?.split('/').pop() || 'Processing...') : 'Waiting...'}
                    </span>
                    {(currentProgress && i === 0) && <div style={s.workerPhase}>{currentProgress.phase}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config Panel (collapsible) */}
          <div style={s.card}>
            <button type="button" onClick={() => setConfigOpen(o => !o)} style={s.configToggle}>
              <h3 style={{ ...s.cardTitle, marginBottom: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Config
              </h3>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: configOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {configOpen && (
              <ConfigForm config={normalizerConfig} onSubmit={(cfg) => configMutation.mutate(cfg)} isPending={configMutation.isPending} />
            )}
          </div>

          {/* Conversion History with Retry */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                Recent Activity
              </h3>
            </div>
            <div style={s.historyList}>
              {recentHistory.length > 0 ? recentHistory.map((line, i) => {
                const type = logType(line);
                const msg = line.split(']').pop()?.trim() || line;
                const isFailed = type === 'error';
                return (
                  <div key={i} style={{ ...s.historyItem, borderLeft: `3px solid ${LOG_COLORS[type]}` }}>
                    <div style={s.historyContent}>
                      <span style={{ color: LOG_COLORS[type], fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        {type === 'error' ? 'FAILED' : type === 'success' ? 'DONE' : 'SKIPPED'}
                      </span>
                      <span style={s.historyText}>{msg}</span>
                    </div>
                    {isFailed && (
                      <button
                        type="button"
                        style={s.retryBtn}
                        onClick={() => retryMutation.mutate(msg.split('->')[0]?.trim() || msg)}
                        disabled={retryMutation.isPending}
                        title="Retry this file"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        Retry
                      </button>
                    )}
                  </div>
                );
              }) : (
                <div style={s.emptyState}><span style={{ fontSize: '0.85rem' }}>No conversions yet.</span></div>
              )}
            </div>
          </div>

        </div>

        {/* Right: Log Viewer */}
        <div style={s.rightCol}>
          <div style={{ ...s.card, ...s.logCard }}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ee787" strokeWidth="2"><polyline points="4 17 9 12 4 7" /><polyline points="12 19 20 19 20 12 12 12" /></svg>
                Activity Log
              </h3>
              <div style={s.logFilters}>
                {['all', 'info', 'start', 'success', 'error'].map(f => (
                  <button key={f} type="button"
                    style={{ ...s.logFilterBtn, ...(logFilter === f ? s.logFilterActive : {}) }}
                    onClick={() => setLogFilter(f)}
                  >{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={s.logBox}>
              {filteredLogs.length > 0 ? filteredLogs.map((line, i) => (
                <div key={i} style={{ ...s.logLine, color: LOG_COLORS[logType(line)] || '#7ee787' }}>
                  <span style={s.logLineNum}>{String(i + 1).padStart(3, ' ')}</span>
                  {line}
                </div>
              )) : (
                <div style={{ color: '#475569', padding: '16px', textAlign: 'center' }}>
                  {logFilter === 'all' ? 'No logs yet.' : `No ${logFilter} logs.`}
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ConfigForm({ config, onSubmit, isPending }) {
  const [crf, setCrf] = useState(config?.crf ?? 19);
  const [preset, setPreset] = useState(config?.preset ?? 'medium');
  const [concurrency, setConcurrency] = useState(config?.concurrency ?? 2);

  useEffect(() => {
    if (config) {
      setCrf(config.crf ?? 19);
      setPreset(config.preset ?? 'medium');
      setConcurrency(config.concurrency ?? 2);
    }
  }, [config]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ crf, preset, concurrency });
  };

  return (
    <form onSubmit={handleSubmit} style={s.configForm}>
      <div style={s.configField}>
        <label style={s.configLabel}>
          CRF (quality) <span style={s.configVal}>{crf}</span>
        </label>
        <input type="range" min="0" max="51" value={crf}
          onChange={(e) => setCrf(Number(e.target.value))}
          style={s.configSlider} />
        <div style={s.configHelp}>
          <span>0 = lossless</span>
          <span>23 = good</span>
          <span>51 = worst</span>
        </div>
      </div>
      <div style={s.configField}>
        <label style={s.configLabel}>Preset (speed / compression)</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} style={s.configSelect}>
          {PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={s.configHelp}>
          <span>ultrafast = fast, large</span>
          <span>medium = balanced</span>
          <span>veryslow = slow, small</span>
        </div>
      </div>
      <div style={s.configField}>
        <label style={s.configLabel}>
          Max concurrent files <span style={s.configVal}>{concurrency}</span>
        </label>
        <input type="range" min="1" max="8" value={concurrency}
          onChange={(e) => setConcurrency(Number(e.target.value))}
          style={s.configSlider} />
        <div style={s.configHelp}>
          <span>Higher = more CPU/RAM</span>
        </div>
      </div>
      <button type="submit" disabled={isPending}
        style={s.configSaveBtn}>
        {isPending ? 'Saving...' : 'Apply Config'}
      </button>
      <div style={s.configNote}>Takes effect on next file; no restart needed</div>
    </form>
  );
}

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' },
  toastContainer: { position: 'fixed', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' },
  title: { fontSize: '1.5rem', fontWeight: '800', color: TEXT, margin: 0, letterSpacing: '-0.03em' },
  subtitle: { fontSize: '0.88rem', color: TEXT3, margin: '4px 0 0 0', lineHeight: 1.5 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },

  badge: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700' },
  badgeRunning: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
  badgeIdle: { background: SURFACE2, color: TEXT3, border: `1px solid ${BORDER}` },
  badgeDot: { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.5s ease-in-out infinite' },

  controls: { display: 'flex', gap: '8px' },
  btn: { padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all 180ms ease', minWidth: '100px' },
  btnStart: { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' },
  btnStop: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' },
  btnDisabled: { background: SURFACE2, color: TEXT3, cursor: 'not-allowed', border: `1px solid ${BORDER}`, opacity: 0.5 },

  errorBanner: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '0.85rem', fontWeight: '500' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  statCard: { padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid', position: 'relative', overflow: 'hidden' },
  statIcon: { width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: '1.8rem', fontWeight: '800', color: TEXT, lineHeight: 1, letterSpacing: '-0.03em' },
  statLabel: { fontSize: '0.78rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' },
  statConverted: { background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' },
  statOk: { background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.15)' },
  statFailed: { background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.15)' },
  statTotal: { background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.15)' },
  statSaved: { background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.2)' },

  savingsBar: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  savingsLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: TEXT2, flexWrap: 'wrap', fontWeight: '500' },
  savingsHighlight: { color: '#facc15', fontWeight: '700', marginLeft: 'auto' },
  savingsTrack: { height: '8px', borderRadius: '999px', background: SURFACE2, overflow: 'hidden', border: `1px solid ${BORDER}` },
  savingsFill: { height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #facc15, #f59e0b)', transition: 'width 0.5s ease' },

  grid: { display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '16px' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '16px' },

  card: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' },
  logCard: { padding: '0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 },
  eta: { fontSize: '0.78rem', color: '#4ade80', fontWeight: '600', padding: '4px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.08)' },

  configToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'inherit', fontSize: 'inherit',
  },
  configForm: { display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${BORDER}` },
  configField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  configLabel: { fontSize: '0.82rem', fontWeight: '600', color: TEXT, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  configVal: { color: '#60a5fa', fontWeight: '700', fontSize: '0.9rem' },
  configSlider: { width: '100%', height: '6px', borderRadius: '999px', appearance: 'none', background: SURFACE2, outline: 'none', cursor: 'pointer', accentColor: '#6366f1' },
  configHelp: { display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: TEXT3 },
  configSelect: {
    padding: '8px 12px', borderRadius: '8px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`,
    fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer', outline: 'none',
  },
  configSaveBtn: {
    padding: '12px 20px', borderRadius: '10px', background: ACCENT, color: '#fff', border: 'none',
    fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s',
  },
  configNote: { fontSize: '0.72rem', color: TEXT3, textAlign: 'center', fontStyle: 'italic' },

  progressSection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  progressFileRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  fileIcon: { width: '28px', height: '28px', borderRadius: '8px', background: SURFACE2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT2, flexShrink: 0 },
  progressFileName: { fontSize: '0.88rem', color: TEXT, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  progressPct: { fontSize: '1.1rem', fontWeight: '800', color: '#4ade80', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  progressTrack: { height: '10px', borderRadius: '999px', background: SURFACE2, overflow: 'hidden', border: `1px solid ${BORDER}`, position: 'relative' },
  progressFill: { height: '100%', borderRadius: '999px', transition: 'width 0.5s ease', position: 'relative', zIndex: 1 },
  progressGlow: { height: '100%', borderRadius: '999px', position: 'absolute', top: 0, left: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))', transition: 'width 0.5s ease' },
  progressMeta: { display: 'flex', gap: '8px', fontSize: '0.78rem', color: TEXT3, flexWrap: 'wrap', fontWeight: '500', alignItems: 'center' },
  metaDivider: { color: BORDER, opacity: 0.5 },
  progressFps: { fontSize: '0.75rem', color: TEXT3, fontWeight: '500' },

  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px', color: TEXT3, fontSize: '0.88rem', textAlign: 'center' },

  workersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' },
  workerCard: { padding: '14px', borderRadius: '12px', background: SURFACE2, border: '1px solid rgba(34,197,94,0.2)', display: 'flex', flexDirection: 'column', gap: '8px' },
  workerCardIdle: { padding: '14px', borderRadius: '12px', background: SURFACE2, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: '8px' },
  workerHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  workerActiveDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(34,197,94,0.5)', flexShrink: 0 },
  workerIdleDot: { width: '8px', height: '8px', borderRadius: '50%', background: TEXT3, flexShrink: 0 },
  workerLabel: { fontSize: '0.82rem', fontWeight: '700', color: TEXT },
  workerFile: { fontSize: '0.8rem', color: TEXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  workerIdleText: { fontSize: '0.8rem', color: TEXT3, fontStyle: 'italic' },
  workerPhase: { fontSize: '0.72rem', color: '#60a5fa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  concurrencyBadge: { fontSize: '0.72rem', color: '#60a5fa', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' },

  historyList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' },
  historyItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: SURFACE2, fontSize: '0.8rem' },
  historyContent: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
  historyText: { color: TEXT2, lineHeight: 1.4, wordBreak: 'break-all', fontSize: '0.78rem' },
  retryBtn: {
    display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
    padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700',
    cursor: 'pointer', border: 'none', background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
    transition: 'all 150ms ease',
  },

  logFilters: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  logFilterBtn: { padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', border: 'none', background: 'transparent', color: TEXT3, transition: 'all 150ms ease' },
  logFilterActive: { background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}` },

  logBox: { padding: '12px', minHeight: '300px', maxHeight: '480px', overflowY: 'auto', background: '#0d1117', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.75rem', lineHeight: 1.8 },
  logLine: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  logLineNum: { display: 'inline-block', width: '28px', textAlign: 'right', marginRight: '12px', color: '#30363d', userSelect: 'none', flexShrink: 0 },
};
