import { useState, useContext, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';
import { ToastContext } from '../../components/ui/ToastContext.jsx';

const SURFACE2 = 'var(--surface-2, #181b22)';
const SURFACE3 = 'var(--surface-3, #1f2330)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';

const VERDICT_META = {
  compatible: { color: '#4ade80', label: 'Browser compatible' },
  audio_issue: { color: '#facc15', label: 'Sound issue' },
  video_issue: { color: '#f87171', label: 'Video play issue' },
  both: { color: '#f87171', label: 'Video + sound issue' },
  unknown: { color: '#f59e0b', label: 'Needs review' },
  ambiguous: { color: '#c084fc', label: 'Needs attention' },
  file_missing: { color: '#f87171', label: 'File missing' },
};

const JOB_STATUS_COLOR = {
  queued: TEXT3,
  running: '#4ade80',
  done: '#60a5fa',
  failed: '#f87171',
  cancelled: '#facc15',
  interrupted: '#fb923c',
};

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '—';
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec || 0)));
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function formatClock(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  background: SURFACE3, border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: '0.85rem', outline: 'none',
};

const btnPrimary = {
  padding: '10px 18px', borderRadius: '10px', border: 'none',
  background: ACCENT, color: '#fff', fontWeight: '700',
  fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
};

const btnGhost = {
  padding: '8px 14px', borderRadius: '10px',
  background: 'transparent', border: `1px solid ${BORDER}`,
  color: TEXT2, fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer',
};

const cardStyle = {
  background: SURFACE2, border: `1px solid ${BORDER}`,
  borderRadius: '14px', padding: '16px 18px',
};

function VerdictPill({ verdict }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700',
      background: `${meta.color}20`, color: meta.color,
      border: `1px solid ${meta.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
}

function JobPill({ status }) {
  const color = JOB_STATUS_COLOR[status] || TEXT3;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700',
      background: `${color}20`, color,
      border: `1px solid ${color}30`, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {status === 'running' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />}
      {String(status)}
    </span>
  );
}

const ProgressBar = memo(function ProgressBar({ percent, color }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.75rem', color: TEXT3, fontWeight: '600' }}>Progress</span>
        <span style={{ fontSize: '0.8rem', color: TEXT, fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div style={{ width: '100%', height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '5px',
          background: color || 'linear-gradient(90deg, #4ade80, #22c55e)',
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
});

function StreamTable({ analysis }) {
  const rows = [];
  if (analysis.video) {
    rows.push({
      kind: 'Video',
      detail: `${analysis.video.codec.toUpperCase()}${analysis.video.width ? ` · ${analysis.video.width}×${analysis.video.height}` : ''}`,
      status: analysis.video.status,
    });
  }
  (analysis.audios || []).forEach((a, i) => {
    rows.push({
      kind: `Audio ${analysis.audios.length > 1 ? i + 1 : ''}${a.isDefault ? ' (default)' : ''}`,
      detail: `${a.codec.toUpperCase()}${a.channels ? ` · ${a.channels}ch` : ''}${a.language ? ` · ${a.language}` : ''}${a.title ? ` · ${a.title}` : ''}`,
      status: a.status,
    });
  });
  if (analysis.subtitleCount > 0) {
    rows.push({ kind: 'Subtitles', detail: `${analysis.subtitleCount} track(s)`, status: 'ok' });
  }
  if (rows.length === 0) return <div style={{ color: TEXT3, fontSize: '0.8rem' }}>No stream info.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${BORDER}`, fontSize: '0.78rem',
        }}>
          <span style={{ color: TEXT3, fontWeight: '700', minWidth: '120px' }}>{r.kind}</span>
          <span style={{ color: TEXT2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail}</span>
          <span style={{
            fontWeight: '800', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em',
            color: r.status === 'ok' ? '#4ade80' : r.status === 'none' ? TEXT3 : '#f87171',
          }}>
            {r.status === 'ok' ? 'OK' : r.status === 'none' ? '—' : r.status === 'unknown' ? 'CHECK' : 'ISSUE'}
          </span>
        </div>
      ))}
    </div>
  );
}

function JobCard({ job, onCancel, cancelling, onRetry, retrying, onDeleteBackup, deletingBackup }) {
  const [showLog, setShowLog] = useState(false);
  const active = job.status === 'running' || job.status === 'queued';
  const retryable = job.status === 'failed' || job.status === 'interrupted' || job.status === 'cancelled';
  const p = job.progress || {};
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.9rem' }}>{job.targetLabel || job.itemTitle}</div>
          <div style={{ color: TEXT3, fontSize: '0.72rem', marginTop: '2px' }}>
            {job.id} · preset: {job.preset} · started {formatClock(job.startedAt)}
          </div>
        </div>
        <JobPill status={job.status} />
        {active && (
          <button style={{ ...btnGhost, borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
            onClick={() => onCancel(job.id)} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
        {retryable && (
          <button style={btnGhost} onClick={() => onRetry(job.id)} disabled={retrying}>
            {retrying ? 'Queuing…' : 'Retry'}
          </button>
        )}
        {job.status === 'done' && job.backupPath && (
          <button style={btnGhost} onClick={() => onDeleteBackup(job.id)} disabled={deletingBackup}>
            {deletingBackup ? 'Deleting…' : 'Delete backup'}
          </button>
        )}
      </div>

      {job.plan && (
        <div style={{ color: TEXT2, fontSize: '0.76rem', marginBottom: '10px' }}>
          Plan: video <b style={{ color: TEXT }}>{job.plan.video}</b>
          {(job.plan.audio || []).length > 0 && (
            <> · audio <b style={{ color: TEXT }}>{job.plan.audio.join(' · ')}</b></>
          )}
        </div>
      )}

      {(job.status === 'running' || job.status === 'done') && (
        <ProgressBar percent={p.percent} color={job.status === 'done' ? 'linear-gradient(90deg, #60a5fa, #3b82f6)' : undefined} />
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.76rem', color: TEXT2 }}>
        <span>Encoded: <b style={{ color: TEXT }}>{formatDuration(p.outTimeSec)} / {formatDuration(job.durationSec)}</b></span>
        {p.speed ? <span>Speed: <b style={{ color: TEXT }}>{p.speed}</b></span> : null}
        {job.status === 'running' && <span>ETA: <b style={{ color: TEXT }}>{p.etaSec != null ? formatDuration(p.etaSec) : '…'}</b></span>}
        {job.status === 'done' && job.finishedAt && <span>Finished: <b style={{ color: TEXT }}>{formatClock(job.finishedAt)}</b></span>}
        {job.status === 'done' && job.backupPath && (
          <span style={{ color: TEXT3 }}>Backup: {job.backupPath}</span>
        )}
      </div>

      {job.error && (
        <div style={{
          marginTop: '10px', padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', fontSize: '0.78rem',
        }}>
          {job.error}
        </div>
      )}

      <button style={{ ...btnGhost, marginTop: '10px' }} onClick={() => setShowLog((v) => !v)}>
        {showLog ? 'Hide log' : 'Show log'}
      </button>
      {showLog && (
        <pre style={{
          marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
          background: '#0a0e14', border: `1px solid ${BORDER}`,
          color: TEXT2, fontSize: '0.7rem', maxHeight: '220px', overflow: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {(job.logTail || []).join('\n') || 'No log yet.'}
        </pre>
      )}
    </div>
  );
}

function LibraryScanCard({ scanQuery, scanType, setScanType, selectedKeys, setSelectedKeys, preset, onStart, starting, onCancel, onQueue, queuing, notify }) {
  const data = scanQuery.data || {};
  const running = data.status === 'running';
  const report = running ? data : (data.lastReport || data);
  const found = report?.found || [];
  const checked = report?.checked || 0;
  const total = report?.total || 0;
  const pct = total > 0 ? Math.min(100, (checked / total) * 100) : 0;

  const toggleKey = (key) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const allKeys = found.map((f) => `${f.itemId}:${f.targetKey}`);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.includes(k));

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem', marginBottom: '4px' }}>3 · Full library scan</div>
      <div style={{ color: TEXT3, fontSize: '0.78rem', marginBottom: '12px' }}>
        Probes every published file and lists all browser-incompatible ones (EAC3/DTS sound, HEVC video). Runs in background — you can leave this page.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={scanType} onChange={(e) => setScanType(e.target.value)} disabled={running} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">Movies + Series</option>
          <option value="movie">Movies only</option>
          <option value="series">Series only</option>
        </select>
        {!running ? (
          <button style={btnPrimary} onClick={onStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start scan'}
          </button>
        ) : (
          <button style={{ ...btnGhost, borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }} onClick={onCancel}>
            Cancel scan
          </button>
        )}
        {data.startedAt && (
          <span style={{ color: TEXT3, fontSize: '0.74rem' }}>
            {data.status} · checked {checked}/{total} · found {report?.foundCount ?? found.length}
            {report?.finishedAt ? ` · finished ${formatClock(report.finishedAt)}` : ''}
          </span>
        )}
      </div>

      {(running || total > 0) && (
        <div style={{ marginTop: '10px' }}>
          <ProgressBar percent={pct} color="linear-gradient(90deg, #a78bfa, #8b5cf6)" />
        </div>
      )}

      {found.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={allSelected}
                onChange={() => setSelectedKeys(allSelected ? [] : allKeys)} />
              Select all ({found.length})
            </label>
            <button style={btnGhost} disabled={queuing || selectedKeys.length === 0} onClick={() => onQueue(false)}>
              {queuing ? 'Queuing…' : `Queue selected (${selectedKeys.length}) with preset “${preset}”`}
            </button>
            <button style={btnGhost} disabled={queuing} onClick={() => { if (window.confirm(`Queue ALL ${found.length} files for transcode?`)) onQueue(true); }}>
              Queue all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflow: 'auto' }}>
            {found.map((f) => {
              const key = `${f.itemId}:${f.targetKey}`;
              return (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${BORDER}`, fontSize: '0.76rem', cursor: 'pointer',
                }}>
                  <input type="checkbox" checked={selectedKeys.includes(key)} onChange={() => toggleKey(key)} />
                  <span style={{ color: TEXT, fontWeight: '700', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.label}
                  </span>
                  <span style={{ color: TEXT3 }}>{f.video} · {f.audio}</span>
                  <VerdictPill verdict={f.verdict} />
                </label>
              );
            })}
          </div>
        </div>
      )}
      {data.status === 'done' && found.length === 0 && (
        <div style={{ marginTop: '10px', color: '#4ade80', fontSize: '0.8rem' }}>Scan finished — no incompatible files found. 🎉</div>
      )}
    </div>
  );
}

const REPORT_LABELS = {
  no_sound: 'সাউন্ড নেই',
  no_video: 'ভিডিও চলে না',
  buffering: 'আটকে চলছে',
  wrong_content: 'ভুল ভিডিও',
  other: 'অন্য সমস্যা',
};

function ViewerReportsCard({ reportsQuery, onAnalyze, analyzing, onResolve }) {
  const reports = reportsQuery.data?.reports || [];
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem', flex: 1 }}>
          দর্শকদের রিপোর্ট {reports.length > 0 && (
            <span style={{
              marginLeft: '6px', padding: '2px 9px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
              color: '#f87171', fontSize: '0.72rem',
            }}>{reports.length} open</span>
          )}
        </div>
        <button style={btnGhost} onClick={() => reportsQuery.refetch()} disabled={reportsQuery.isFetching}>
          {reportsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div style={{ color: TEXT3, fontSize: '0.78rem', marginBottom: '12px' }}>
        Player থেকে দর্শকরা যে সমস্যাগুলো জানিয়েছে। Analyze চাপলে ওপরের checker-এ ফাইলটি পরীক্ষা হবে।
      </div>
      {reportsQuery.isPending && <div style={{ color: TEXT3, fontSize: '0.8rem' }}>Loading reports…</div>}
      {reportsQuery.isError && <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>Could not load reports.</div>}
      {!reportsQuery.isPending && reports.length === 0 && (
        <div style={{ color: TEXT3, fontSize: '0.8rem' }}>কোনো খোলা রিপোর্ট নেই। 🎉</div>
      )}
      {reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflow: 'auto' }}>
          {reports.map((r) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${BORDER}`, fontSize: '0.78rem',
            }}>
              <span style={{
                padding: '3px 9px', borderRadius: '6px', fontWeight: '800', fontSize: '0.7rem',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5',
                whiteSpace: 'nowrap',
              }}>
                {REPORT_LABELS[r.issueType] || r.issueType}
              </span>
              <span style={{ color: TEXT, fontWeight: '700', flex: 1, minWidth: '140px' }}>
                {r.title || `${r.contentType} #${r.contentId}`}
                {r.contentType === 'series' && r.season ? ` S${r.season}E${r.episode || '?'}` : ''}
              </span>
              {r.reportCount > 1 && (
                <span style={{ color: TEXT3, fontSize: '0.72rem' }}>×{r.reportCount} reports</span>
              )}
              {r.note && <span style={{ color: TEXT3, fontSize: '0.72rem', fontStyle: 'italic' }}>“{r.note}”</span>}
              <button style={btnGhost} disabled={analyzing} onClick={() => onAnalyze(r)}>
                Analyze
              </button>
              <button style={btnGhost} onClick={() => onResolve(r.id)}>
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoFixCard({ settingsQuery, draft, setDraft, onSave, saving }) {  const saved = settingsQuery.data || { autoFix: false, autoPreset: 'browser', autoMaxJobs: 10 };
  const cur = draft || saved;
  const dirty = draft !== null;
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem', marginBottom: '4px' }}>4 · Auto-fix new files</div>
      <div style={{ color: TEXT3, fontSize: '0.78rem', marginBottom: '12px' }}>
        When ON, every content scan automatically queues browser-compatibility transcodes for newly found files. One job runs at a time — the rest wait.
      </div>
      {settingsQuery.isPending && <div style={{ color: TEXT3, fontSize: '0.8rem' }}>Loading settings…</div>}
      {!settingsQuery.isPending && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: TEXT, fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
            <input type="checkbox" checked={Boolean(cur.autoFix)}
              onChange={(e) => setDraft({ ...cur, autoFix: e.target.checked })} />
            Auto-fix {cur.autoFix ? 'ON' : 'OFF'}
          </label>
          <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
            Auto preset
            <select value={cur.autoPreset}
              onChange={(e) => setDraft({ ...cur, autoPreset: e.target.value })}
              style={{ ...inputStyle, marginLeft: '6px', width: 'auto' }}>
              <option value="browser">Browser compatible (auto)</option>
              <option value="browser-720p">Browser 720p (fast)</option>
              <option value="audio-only">Audio only (fastest)</option>
            </select>
          </label>
          <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
            Max jobs per scan
            <input type="number" min="1" max="50" value={cur.autoMaxJobs}
              onChange={(e) => setDraft({ ...cur, autoMaxJobs: Number(e.target.value) || 10 })}
              style={{ ...inputStyle, marginLeft: '6px', width: '70px' }} />
          </label>
          <button style={btnPrimary} disabled={!dirty || saving} onClick={() => onSave(cur)}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MediaFixerPage() {
  const toast = useContext(ToastContext);
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [allEpisodes, setAllEpisodes] = useState(false);
  const [preset, setPreset] = useState('browser');
  const [analysis, setAnalysis] = useState(null);
  const [cancellingId, setCancellingId] = useState('');
  const [busyJobId, setBusyJobId] = useState('');
  const [advOpen, setAdvOpen] = useState(false);
  const [trxOpts, setTrxOpts] = useState({ crf: 23, videoPreset: 'veryfast', audioBitrate: 192, keepSubtitles: true, audioMode: 'all' });
  const [scanType, setScanType] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [settingsDraft, setSettingsDraft] = useState(null);

  const notify = (msg, type = 'info') => {
    try {
      if (type === 'error') toast?.error?.(msg);
      else toast?.success?.(msg);
    } catch { /* toast optional */ }
  };

  const analyzeMutation = useMutation({
    mutationFn: (overrideInput) => adminService.analyzeMedia((overrideInput || input).trim(), {
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      allEpisodes,
    }),
    onSuccess: (data) => {
      setAnalysis(data);
      const bad = (data.summary?.audio_issue || 0) + (data.summary?.video_issue || 0) + (data.summary?.both || 0);
      notify(bad > 0 ? `Found issues in ${bad} file(s)` : 'All files look browser-compatible', bad > 0 ? 'info' : 'info');
    },
    onError: (e) => notify(e?.message || 'Analyze failed', 'error'),
  });

  const transcodeMutation = useMutation({
    mutationFn: () => adminService.startTranscode(input.trim(), {
      preset,
      options: trxOpts,
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      allEpisodes,
    }),
    onSuccess: (data) => {
      const started = (data.jobs || []).length;
      const skipped = (data.results || []).filter((r) => r.skipped).length;
      notify(started > 0 ? `Started ${started} transcode job(s)` : 'Nothing to transcode', 'info');
      if (skipped > 0 && started === 0) {
        notify((data.results || []).map((r) => `${r.target}: ${r.reason}`).join(' | '), 'info');
      }
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
    },
    onError: (e) => notify(e?.message || 'Transcode failed to start', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => adminService.cancelTranscodeJob(id),
    onMutate: (id) => setCancellingId(id),
    onSettled: () => {
      setCancellingId('');
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
    },
    onError: (e) => notify(e?.message || 'Cancel failed', 'error'),
  });

  const retryMutation = useMutation({
    mutationFn: (id) => adminService.retryTranscodeJob(id, { preset, options: trxOpts }),
    onMutate: (id) => setBusyJobId(id),
    onSettled: () => {
      setBusyJobId('');
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
    },
    onSuccess: () => notify('Job queued again', 'info'),
    onError: (e) => notify(e?.message || 'Retry failed', 'error'),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (id) => adminService.deleteJobBackup(id),
    onMutate: (id) => setBusyJobId(id),
    onSettled: () => {
      setBusyJobId('');
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['media-backups'] });
    },
    onSuccess: (r) => notify(`Backup deleted (${formatBytes(r.sizeFreed)} freed)`, 'info'),
    onError: (e) => notify(e?.message || 'Delete failed', 'error'),
  });

  const deleteAllBackupsMutation = useMutation({
    mutationFn: () => adminService.deleteAllBackups(),
    onSuccess: (r) => {
      notify(`Deleted ${r.deleted} backup(s), freed ${formatBytes(r.sizeFreed)}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['media-backups'] });
    },
    onError: (e) => notify(e?.message || 'Delete failed', 'error'),
  });

  const jobsQuery = useQuery({
    queryKey: ['transcode-jobs'],
    queryFn: () => adminService.getTranscodeJobs(),
    refetchInterval: (query) => {
      const jobs = query?.state?.data?.jobs || [];
      return jobs.some((j) => j.status === 'running' || j.status === 'queued') ? 2000 : false;
    },
  });

  const backupsQuery = useQuery({
    queryKey: ['media-backups'],
    queryFn: () => adminService.getBackups(),
  });

  const settingsQuery = useQuery({
    queryKey: ['media-settings'],
    queryFn: () => adminService.getMediaSettings(),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data) => adminService.saveMediaSettings(data),
    onSuccess: (data) => {
      setSettingsDraft(null);
      queryClient.invalidateQueries({ queryKey: ['media-settings'] });
      notify(data.autoFix ? 'Auto-fix ON — new incompatible files will be queued after each scan' : 'Auto-fix OFF', 'info');
    },
    onError: (e) => notify(e?.message || 'Save failed', 'error'),
  });

  const reportsQuery = useQuery({
    queryKey: ['media-reports'],
    queryFn: () => adminService.getMediaReports('open'),
    refetchInterval: 30000,
  });

  const resolveReportMutation = useMutation({
    mutationFn: (id) => adminService.resolveMediaReport(id, true),
    onSuccess: () => {
      notify('Report resolved', 'info');
      queryClient.invalidateQueries({ queryKey: ['media-reports'] });
    },
    onError: (e) => notify(e?.message || 'Resolve failed', 'error'),
  });

  const scanQuery = useQuery({
    queryKey: ['media-scan'],
    queryFn: () => adminService.getLibraryScan(),
    refetchInterval: (query) => {
      const s = query?.state?.data;
      return s?.status === 'running' ? 3000 : false;
    },
  });

  const startScanMutation = useMutation({
    mutationFn: () => adminService.startLibraryScan(scanType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-scan'] });
      notify('Library scan started', 'info');
    },
    onError: (e) => notify(e?.message || 'Scan failed to start', 'error'),
  });

  const cancelScanMutation = useMutation({
    mutationFn: () => adminService.cancelLibraryScan(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['media-scan'] }),
  });

  const queueScanMutation = useMutation({
    mutationFn: (useAll) => {
      const keys = useAll ? undefined : selectedKeys;
      return adminService.queueScanFindings({ keys, all: useAll, preset, options: trxOpts });
    },
    onSuccess: (data) => {
      const started = (data.results || []).filter((r) => r.jobId).length;
      notify(`Queued ${started} job(s) from scan`, 'info');
      setSelectedKeys([]);
      queryClient.invalidateQueries({ queryKey: ['transcode-jobs'] });
    },
    onError: (e) => notify(e?.message || 'Queue failed', 'error'),
  });

  const jobs = jobsQuery.data?.jobs || [];
  const presets = analysis?.presets || [
    { id: 'browser', label: 'Browser compatible (auto)', description: 'Only converts what is broken.' },
    { id: 'browser-720p', label: 'Browser compatible 720p (fast)', description: 'Scales to 720p H.264 + AAC.' },
    { id: 'audio-only', label: 'Audio only (fastest)', description: 'Converts bad audio to AAC, video untouched.' },
  ];
  const analyzedBad = analysis ? (analysis.summary?.audio_issue || 0) + (analysis.summary?.video_issue || 0) + (analysis.summary?.both || 0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '980px' }}>
      {/* Input card */}
      <div style={cardStyle}>
        <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem', marginBottom: '4px' }}>1 · Check a movie or series</div>
        <div style={{ color: TEXT3, fontSize: '0.78rem', marginBottom: '12px' }}>
          Paste a content link (<code>/movies/34876</code>), full URL, or numeric ID. The system probes the file and tells you if there is a sound or video-play issue.
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, flex: '1 1 280px' }}
            placeholder="https://speed4you.net/movies/34876  or  34876"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') analyzeMutation.mutate(); }}
          />
          <button style={btnPrimary} onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending || !input.trim()}>
            {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem' }}>
            Season
            <input style={{ ...inputStyle, width: '70px' }} value={season} onChange={(e) => setSeason(e.target.value)} disabled={allEpisodes} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem' }}>
            Episode
            <input style={{ ...inputStyle, width: '70px' }} value={episode} onChange={(e) => setEpisode(e.target.value)} disabled={allEpisodes} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={allEpisodes} onChange={(e) => setAllEpisodes(e.target.checked)} />
            All episodes (series)
          </label>
        </div>
        {analyzeMutation.isError && (
          <div style={{ marginTop: '10px', color: '#fca5a5', fontSize: '0.8rem' }}>
            {analyzeMutation.error?.message || 'Analyze failed'}
          </div>
        )}
      </div>

      {/* Analysis results */}
      {analysis && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem' }}>
                {analysis.item?.title} {analysis.item?.year ? `(${analysis.item.year})` : ''}
              </div>
              <div style={{ color: TEXT3, fontSize: '0.74rem', marginTop: '2px' }}>
                #{analysis.item?.id} · {analysis.item?.type} · {analysis.item?.language || '—'} · {analysis.targets?.length || 0} file(s) checked
              </div>
            </div>
          </div>

          {(analysis.targets || []).map((t, i) => (
            <div key={t.key || i} style={{
              border: `1px solid ${BORDER}`, borderRadius: '10px',
              padding: '12px 14px', marginBottom: '10px', background: 'rgba(255,255,255,0.015)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '700', color: TEXT, fontSize: '0.85rem', flex: 1, minWidth: '180px' }}>{t.label}</span>
                <VerdictPill verdict={t.verdict} />
              </div>
              <div style={{ color: TEXT3, fontSize: '0.72rem', marginTop: '4px', wordBreak: 'break-all' }}>
                {t.filePath || 'file not found'} · {formatBytes(t.sizeBytes)}
                {t.durationSec ? ` · ${formatDuration(t.durationSec)}` : ''}
                {t.video?.width ? ` · ${t.video.width}×${t.video.height}` : ''}
              </div>
              {(t.issues || []).map((issue, k) => (
                <div key={k} style={{
                  marginTop: '8px', padding: '8px 10px', borderRadius: '8px', fontSize: '0.78rem',
                  background: issue.severity === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${issue.severity === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  color: issue.severity === 'error' ? '#fca5a5' : '#fcd34d',
                }}>
                  {issue.message}
                </div>
              ))}
              {t.exists && <StreamTable analysis={t} />}
            </div>
          ))}

          {/* Transcode */}
          {analyzedBad > 0 && (
            <div style={{ marginTop: '14px', borderTop: `1px solid ${BORDER}`, paddingTop: '14px' }}>
              <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.9rem', marginBottom: '8px' }}>2 · Fix it (transcode for browsers)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {presets.map((p) => (
                  <label key={p.id} style={{
                    display: 'flex', gap: '10px', padding: '10px 12px', borderRadius: '10px',
                    border: `1px solid ${preset === p.id ? ACCENT : BORDER}`,
                    background: preset === p.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}>
                    <input type="radio" name="trx-preset" checked={preset === p.id} onChange={() => setPreset(p.id)} />
                    <span>
                      <span style={{ display: 'block', color: TEXT, fontWeight: '700', fontSize: '0.82rem' }}>{p.label}</span>
                      <span style={{ display: 'block', color: TEXT3, fontSize: '0.74rem', marginTop: '2px' }}>{p.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button style={btnPrimary} onClick={() => transcodeMutation.mutate()} disabled={transcodeMutation.isPending}>
                {transcodeMutation.isPending ? 'Starting…' : `Transcode ${analyzedBad} file(s)`}
              </button>
              <div style={{ marginTop: '10px' }}>
                <button style={btnGhost} onClick={() => setAdvOpen((v) => !v)}>
                  {advOpen ? 'Hide advanced options' : 'Advanced options (quality, tracks, subtitles)'}
                </button>
                {advOpen && (
                  <div style={{
                    marginTop: '8px', padding: '12px', borderRadius: '10px',
                    border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.015)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
                      Quality (CRF — lower is better, bigger file): <b style={{ color: TEXT }}>{trxOpts.crf}</b>
                      <input type="range" min="18" max="28" step="1" value={trxOpts.crf}
                        onChange={(e) => setTrxOpts((o) => ({ ...o, crf: Number(e.target.value) }))}
                        style={{ width: '100%', marginTop: '4px' }} />
                    </label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
                        Speed preset
                        <select value={trxOpts.videoPreset}
                          onChange={(e) => setTrxOpts((o) => ({ ...o, videoPreset: e.target.value }))}
                          style={{ ...inputStyle, marginLeft: '6px', width: 'auto' }}>
                          <option value="ultrafast">ultrafast (fastest)</option>
                          <option value="superfast">superfast</option>
                          <option value="veryfast">veryfast (default)</option>
                          <option value="faster">faster</option>
                          <option value="fast">fast (slower, better)</option>
                        </select>
                      </label>
                      <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
                        Audio bitrate
                        <select value={trxOpts.audioBitrate}
                          onChange={(e) => setTrxOpts((o) => ({ ...o, audioBitrate: Number(e.target.value) }))}
                          style={{ ...inputStyle, marginLeft: '6px', width: 'auto' }}>
                          <option value={128}>128k</option>
                          <option value={192}>192k (default)</option>
                          <option value={256}>256k</option>
                          <option value={320}>320k</option>
                        </select>
                      </label>
                      <label style={{ color: TEXT2, fontSize: '0.78rem' }}>
                        Audio tracks
                        <select value={trxOpts.audioMode}
                          onChange={(e) => setTrxOpts((o) => ({ ...o, audioMode: e.target.value }))}
                          style={{ ...inputStyle, marginLeft: '6px', width: 'auto' }}>
                          <option value="all">all tracks</option>
                          <option value="default">default only</option>
                        </select>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trxOpts.keepSubtitles}
                          onChange={(e) => setTrxOpts((o) => ({ ...o, keepSubtitles: e.target.checked }))} />
                        Keep subtitles
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ color: TEXT3, fontSize: '0.72rem', marginTop: '8px' }}>
                Only broken streams are converted. The original file is kept as a backup (.orig-bak). One job runs at a time — the rest wait in queue.
              </div>
              {transcodeMutation.isError && (
                <div style={{ marginTop: '8px', color: '#fca5a5', fontSize: '0.8rem' }}>
                  {transcodeMutation.error?.message || 'Could not start transcode'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Viewer reports */}
      <ViewerReportsCard
        reportsQuery={reportsQuery}
        onAnalyze={(r) => {
          const link = `/${r.contentType === 'series' ? 'series' : 'movies'}/${r.contentId}`;
          setInput(link);
          analyzeMutation.mutate(link);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        analyzing={analyzeMutation.isPending}
        onResolve={(id) => resolveReportMutation.mutate(id)}
      />

      {/* Library scan */}
      <LibraryScanCard
        scanQuery={scanQuery}
        scanType={scanType}
        setScanType={setScanType}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
        preset={preset}
        onStart={() => startScanMutation.mutate()}
        starting={startScanMutation.isPending}
        onCancel={() => cancelScanMutation.mutate()}
        onQueue={(useAll) => queueScanMutation.mutate(useAll)}
        queuing={queueScanMutation.isPending}
        notify={notify}
      />

      {/* Auto-fix settings */}
      <AutoFixCard
        settingsQuery={settingsQuery}
        draft={settingsDraft}
        setDraft={setSettingsDraft}
        onSave={(data) => saveSettingsMutation.mutate(data)}
        saving={saveSettingsMutation.isPending}
      />

      {/* Jobs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: '800', color: TEXT, fontSize: '0.95rem', flex: 1 }}>Transcode jobs</div>
          {backupsQuery.data && backupsQuery.data.count > 0 && (
            <span style={{ fontSize: '0.74rem', color: TEXT3 }}>
              {backupsQuery.data.count} backup(s) · {formatBytes(backupsQuery.data.totalBytes)}
            </span>
          )}
          {backupsQuery.data && backupsQuery.data.count > 0 && (
            <button style={btnGhost} onClick={() => { if (window.confirm('Delete ALL backup (.orig-bak) files? Transcoded files stay.')) deleteAllBackupsMutation.mutate(); }} disabled={deleteAllBackupsMutation.isPending}>
              {deleteAllBackupsMutation.isPending ? 'Deleting…' : 'Delete all backups'}
            </button>
          )}
          <button style={btnGhost} onClick={() => { jobsQuery.refetch(); backupsQuery.refetch(); }} disabled={jobsQuery.isFetching}>
            {jobsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {jobsQuery.isPending && <div style={{ color: TEXT3, fontSize: '0.8rem' }}>Loading jobs…</div>}
        {jobsQuery.isError && <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>Could not load jobs.</div>}
        {jobs.length === 0 && !jobsQuery.isPending && (
          <div style={{ color: TEXT3, fontSize: '0.8rem' }}>No transcode jobs yet. Analyze a link above to start.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jobs.map((job) => (
            <JobCard
              key={job.id} job={job}
              onCancel={(id) => cancelMutation.mutate(id)} cancelling={cancellingId !== ''}
              onRetry={(id) => retryMutation.mutate(id)} retrying={busyJobId !== ''}
              onDeleteBackup={(id) => deleteBackupMutation.mutate(id)} deletingBackup={busyJobId !== ''}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
