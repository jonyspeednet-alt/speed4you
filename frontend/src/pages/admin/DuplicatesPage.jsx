import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import { ToastContext } from '../../components/ui/ToastContext';
import { useContext } from 'react';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const SURFACE3 = 'var(--surface-3, #1f2330)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';
const DANGER = '#f87171';
const WARN = '#facc15';
const OK = '#4ade80';

function fmtBytes(bytes) {
  if (!bytes || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

function StatusPill({ status, children }) {
  const colorMap = {
    published: OK,
    draft: WARN,
    archived: TEXT3,
  };
  const color = colorMap[status] || TEXT2;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '6px',
      fontSize: '0.7rem', fontWeight: '700',
      background: `${color}20`, color, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {children || status}
    </span>
  );
}

function Stat({ label, value, accent, sub }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: '14px',
      background: SURFACE2, border: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', gap: '6px',
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent }} />}
      <span style={{ fontSize: '0.68rem', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>{label}</span>
      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: TEXT, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {sub && <span style={{ fontSize: '0.72rem', color: TEXT3 }}>{sub}</span>}
    </div>
  );
}

function GroupCard({ group, selected, onToggleSelect, onKeepOne, onMerge, keepId, busy }) {
  const [expanded, setExpanded] = useState(true);
  const sortedMembers = useMemo(() => {
    return [...(group.members || [])].sort((a, b) => {
      // Manual first, then published, then by updatedAt desc
      if ((a.sourceType || '') !== (b.sourceType || '')) {
        if (a.sourceType === 'manual') return -1;
        if (b.sourceType === 'manual') return 1;
      }
      if ((a.status || '') !== (b.status || '')) {
        if (a.status === 'published') return -1;
        if (b.status === 'published') return 1;
      }
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [group.members]);

  const allIds = sortedMembers.map((m) => m.id);
  const visibleKeepId = keepId || sortedMembers[0]?.id;

  return (
    <div style={{
      background: SURFACE2, border: `1px solid ${BORDER}`,
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 18px', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          borderBottom: expanded ? `1px solid ${BORDER}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{ color: TEXT2, fontSize: '0.85rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: TEXT, fontSize: '0.95rem', fontWeight: '700', textTransform: 'capitalize' }}>{group.contentType}</span>
              <span style={{ color: TEXT3, fontSize: '0.78rem' }}>·</span>
              <span style={{ color: TEXT2, fontSize: '0.78rem', fontFamily: 'monospace' }}>{group.titleKey}</span>
            </div>
            <span style={{ color: TEXT3, fontSize: '0.78rem' }}>Last updated: {fmtDate(group.lastUpdated)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: DANGER, fontSize: '1.05rem', fontWeight: '800' }}>{group.groupSize} dupes</span>
            <span style={{ color: TEXT3, fontSize: '0.72rem' }}>max reported: {group.maxDuplicateCount}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(group); }}
            style={{
              padding: '6px 12px', borderRadius: '8px',
              background: selected ? `${DANGER}30` : SURFACE3,
              color: selected ? DANGER : TEXT2,
              border: `1px solid ${selected ? DANGER : BORDER}`,
              fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
            }}
          >
            {selected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '10px 18px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sortedMembers.map((member) => {
              const isKeep = member.id === visibleKeepId;
              const isRemove = !isKeep && allIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px',
                    background: isKeep ? `${OK}10` : SURFACE,
                    border: `1px solid ${isKeep ? OK : BORDER}`,
                  }}
                >
                  <input
                    type="radio"
                    name={`keep-${group.contentType}-${group.titleKey}`}
                    checked={isKeep}
                    onChange={() => onKeepOne(group, member.id)}
                    style={{ accentColor: OK }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Link
                        to={`/admin/content/${member.id}/edit`}
                        style={{ color: TEXT, fontSize: '0.88rem', fontWeight: '600', textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {member.title}
                      </Link>
                      <span style={{ color: TEXT3, fontSize: '0.72rem', fontFamily: 'monospace' }}>#{member.id}</span>
                      <StatusPill status={member.status} />
                      {member.sourceType === 'manual' && (
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px',
                          background: `${ACCENT}25`, color: ACCENT, fontWeight: '700',
                        }}>MANUAL</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: TEXT3, fontSize: '0.72rem', flexWrap: 'wrap' }}>
                      <span>Root: <strong style={{ color: TEXT2 }}>{member.sourceRootLabel || member.sourceRootId || '—'}</strong></span>
                      {member.year && <span>Year: <strong style={{ color: TEXT2 }}>{member.year}</strong></span>}
                      {member.rating && <span>Rating: <strong style={{ color: TEXT2 }}>★{Number(member.rating).toFixed(1)}</strong></span>}
                      {member.runtime && <span>Runtime: <strong style={{ color: TEXT2 }}>{member.runtime}m</strong></span>}
                      <span>Updated: {fmtDate(member.updatedAt)}</span>
                    </div>
                    {member.sourcePath && (
                      <div style={{ color: TEXT3, fontSize: '0.68rem', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.sourcePath}
                      </div>
                    )}
                  </div>
                  {isRemove && (
                    <span style={{ color: DANGER, fontSize: '0.7rem', fontWeight: '700' }}>WILL REMOVE</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onMerge(group, visibleKeepId)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                background: DANGER, color: '#fff', border: 'none',
                fontSize: '0.8rem', fontWeight: '700', cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Merging…' : `Merge (keep #${visibleKeepId}, remove ${sortedMembers.length - 1})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuplicatesPage() {
  const toast = useContext(ToastContext);
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(100);
  const [minGroupSize, setMinGroupSize] = useState(2);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [keepByGroup, setKeepByGroup] = useState({});
  const [dryRun, setDryRun] = useState(true);
  const [reviewTab, setReviewTab] = useState('catalog'); // 'catalog' | 'filesystem'

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['catalog-duplicates', limit, minGroupSize],
    queryFn: () => adminService.getCatalogDuplicates({ limit, minGroupSize }),
    staleTime: 30 * 1000,
  });

  const { data: filesystemReview, isLoading: isLoadingFs, refetch: refetchFs } = useQuery({
    queryKey: ['duplicates-review'],
    queryFn: () => adminService.getDuplicateReview(),
    enabled: reviewTab === 'filesystem',
  });

  const mergeMutation = useMutation({
    mutationFn: ({ keepId, removeIds }) => adminService.mergeCatalogDuplicates(keepId, removeIds),
    onSuccess: (result) => {
      toast?.success?.(`Merged duplicates. Removed ${result.removedCount} items.`);
      queryClient.invalidateQueries({ queryKey: ['catalog-duplicates'] });
      setSelected(new Set());
    },
    onError: (err) => {
      toast?.error?.(`Merge failed: ${err.message}`);
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: (body) => adminService.runDuplicateCleanup(body),
    onSuccess: (result) => {
      const count = result.dryRun ? result.dryRunDeletedCount : result.deletedCount;
      toast?.success?.(`${result.dryRun ? 'Dry-run' : 'Cleanup'} complete: ${count} exact duplicate(s) ${result.dryRun ? 'would be' : ''} removed.`);
      queryClient.invalidateQueries({ queryKey: ['duplicates-review'] });
    },
    onError: (err) => {
      toast?.error?.(`Cleanup failed: ${err.message}`);
    },
  });

  const bulkMergeMutation = useMutation({
    mutationFn: async () => {
      const groups = filteredGroups;
      let totalRemoved = 0;
      for (const group of groups) {
        const keepId = keepByGroup[groupKey(group)] || (group.members?.[0]?.id);
        if (!keepId) continue;
        const removeIds = (group.members || []).map((m) => m.id).filter((id) => id !== keepId);
        if (!removeIds.length) continue;
        const result = await adminService.mergeCatalogDuplicates(keepId, removeIds);
        totalRemoved += result.removedCount || 0;
      }
      return { totalRemoved, groupCount: groups.length };
    },
    onSuccess: (result) => {
      toast?.success?.(`Bulk merge: ${result.groupCount} groups, ${result.totalRemoved} items removed.`);
      queryClient.invalidateQueries({ queryKey: ['catalog-duplicates'] });
      setSelected(new Set());
    },
    onError: (err) => {
      toast?.error?.(`Bulk merge failed: ${err.message}`);
    },
  });

  const filteredGroups = useMemo(() => {
    const all = data?.groups || [];
    return all.filter((group) => {
      if (filterType !== 'all' && group.contentType !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches = (group.members || []).some((m) =>
          String(m.title || '').toLowerCase().includes(q)
          || String(m.titleKey || '').toLowerCase().includes(q)
          || String(m.sourceRootLabel || '').toLowerCase().includes(q)
          || String(m.sourceRootId || '').toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [data, filterType, search]);

  const totalDuplicateItems = useMemo(() => {
    return filteredGroups.reduce((sum, g) => sum + (g.groupSize || 0), 0);
  }, [filteredGroups]);

  const groupKey = useCallback((group) => `${group.contentType}:${group.titleKey}`, []);

  const onToggleSelect = useCallback((group) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = groupKey(group);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [groupKey]);

  const onKeepOne = useCallback((group, id) => {
    setKeepByGroup((prev) => ({ ...prev, [groupKey(group)]: id }));
  }, [groupKey]);

  const onMerge = useCallback((group, keepId) => {
    if (!keepId) return;
    const removeIds = (group.members || []).map((m) => m.id).filter((id) => id !== keepId);
    if (!removeIds.length) {
      toast?.info?.('Nothing to merge — only one member in group.');
      return;
    }
    if (!window.confirm(`Merge ${group.members.length} duplicates? Keep #${keepId}, remove ${removeIds.length} item(s). This cannot be undone.`)) return;
    mergeMutation.mutate({ keepId, removeIds });
  }, [mergeMutation, toast]);

  if (error) {
    return (
      <div style={{ padding: '24px', color: DANGER }}>
        Error loading duplicates: {error.message}
        <button type="button" onClick={refetch} style={{ marginLeft: '12px', padding: '6px 12px', borderRadius: '6px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: TEXT, margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Duplicates</h1>
          <p style={{ color: TEXT3, margin: '4px 0 0', fontSize: '0.85rem' }}>
            Review and merge content that has the same normalized title across scanner roots.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              padding: '8px 14px', borderRadius: '8px', background: SURFACE2, color: TEXT,
              border: `1px solid ${BORDER}`, fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${BORDER}` }}>
        {[
          { id: 'catalog', label: 'Catalog Duplicates' },
          { id: 'filesystem', label: 'Filesystem Holds' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReviewTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${reviewTab === tab.id ? ACCENT : 'transparent'}`,
              color: reviewTab === tab.id ? TEXT : TEXT3,
              fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {reviewTab === 'catalog' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <Stat label="Groups" value={filteredGroups.length} accent={`linear-gradient(90deg, ${DANGER}, #ef4444)`} sub={data ? `of ${data.totalGroups} total` : ''} />
            <Stat label="Duplicate Items" value={totalDuplicateItems} accent={`linear-gradient(90deg, ${WARN}, #f59e0b)`} sub="across selected groups" />
            <Stat label="Selected Groups" value={selected.size} accent={`linear-gradient(90deg, ${ACCENT}, #818cf8)`} sub="for bulk merge" />
            <Stat label="Min Group Size" value={minGroupSize} accent="linear-gradient(90deg, #34d399, #10b981)" sub="show groups with N+ items" />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by title / key / root…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px',
                background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`,
                fontSize: '0.85rem', outline: 'none',
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`,
                fontSize: '0.85rem', outline: 'none',
              }}
            >
              <option value="all">All types</option>
              <option value="movie">Movies</option>
              <option value="series">Series</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem' }}>
              Limit
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
                style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.78rem', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.78rem' }}>
              Min
              <input
                type="number"
                min={2}
                max={50}
                value={minGroupSize}
                onChange={(e) => setMinGroupSize(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.78rem', outline: 'none' }}
              />
            </label>
            {selected.size > 0 && (
              <button
                type="button"
                disabled={bulkMergeMutation.isPending}
                onClick={() => {
                  if (!window.confirm(`Merge ${selected.size} group(s)? This will keep the selected member of each group and delete the rest. This cannot be undone.`)) return;
                  bulkMergeMutation.mutate();
                }}
                style={{
                  padding: '8px 14px', borderRadius: '8px', background: DANGER, color: '#fff',
                  border: 'none', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                  opacity: bulkMergeMutation.isPending ? 0.6 : 1,
                }}
              >
                {bulkMergeMutation.isPending ? 'Merging…' : `Bulk merge ${selected.size} group(s)`}
              </button>
            )}
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: TEXT3 }}>Loading duplicate groups…</div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: TEXT3, background: SURFACE2, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: '1.05rem', marginBottom: '6px' }}>No duplicate groups found</div>
              <div style={{ fontSize: '0.85rem' }}>Try lowering the min group size, or wait for the next scan to find new content.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredGroups.map((group) => (
                <GroupCard
                  key={groupKey(group)}
                  group={group}
                  selected={selected.has(groupKey(group))}
                  onToggleSelect={onToggleSelect}
                  onKeepOne={onKeepOne}
                  onMerge={onMerge}
                  keepId={keepByGroup[groupKey(group)]}
                  busy={mergeMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}

      {reviewTab === 'filesystem' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <Stat label="Hold Items" value={filesystemReview?.totalItems ?? 0} accent="linear-gradient(90deg, #f59e0b, #d97706)" />
            <Stat label="Exact Duplicates" value={filesystemReview?.exactDuplicates ?? 0} accent="linear-gradient(90deg, #ef4444, #dc2626)" />
            <Stat label="Pending Review" value={filesystemReview?.pendingReview ?? 0} accent="linear-gradient(90deg, #94a3b8, #64748b)" />
            <Stat label="Hold Dir" value={filesystemReview?.holdDirName ?? '—'} accent="linear-gradient(90deg, #6366f1, #4f46e5)" />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TEXT2, fontSize: '0.82rem' }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} style={{ accentColor: ACCENT }} />
              Dry run (preview only)
            </label>
            <button
              type="button"
              disabled={cleanupMutation.isPending || !filesystemReview?.exactDuplicates}
              onClick={() => {
                if (dryRun) {
                  cleanupMutation.mutate({ dryRun: true });
                } else {
                  if (!window.confirm(`Delete ${filesystemReview.exactDuplicates} exact duplicate file(s) from ${filesystemReview.holdDirName}? This is irreversible.`)) return;
                  cleanupMutation.mutate({ dryRun: false });
                }
              }}
              style={{
                padding: '8px 14px', borderRadius: '8px',
                background: dryRun ? SURFACE2 : DANGER,
                color: dryRun ? TEXT : '#fff',
                border: `1px solid ${dryRun ? BORDER : DANGER}`,
                fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                opacity: cleanupMutation.isPending || !filesystemReview?.exactDuplicates ? 0.5 : 1,
              }}
            >
              {cleanupMutation.isPending ? 'Running…' : (dryRun ? 'Preview cleanup' : `Delete ${filesystemReview?.exactDuplicates || 0} duplicates`)}
            </button>
            <button
              type="button"
              onClick={() => refetchFs()}
              style={{
                padding: '8px 14px', borderRadius: '8px', background: SURFACE2, color: TEXT,
                border: `1px solid ${BORDER}`, fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          {isLoadingFs ? (
            <div style={{ padding: '40px', textAlign: 'center', color: TEXT3 }}>Loading filesystem review…</div>
          ) : !filesystemReview?.items?.length ? (
            <div style={{ padding: '40px', textAlign: 'center', color: TEXT3, background: SURFACE2, borderRadius: '14px', border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: '1.05rem', marginBottom: '6px' }}>No files in <code>{filesystemReview?.holdDirName || '_duplicate_hold'}</code></div>
              <div style={{ fontSize: '0.85rem' }}>Drop files in any scanner root's <code>_duplicate_hold</code> folder to review them here.</div>
            </div>
          ) : (
            <div style={{ background: SURFACE2, borderRadius: '14px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: SURFACE3, textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: TEXT3, fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Held File</th>
                    <th style={{ padding: '10px 14px', color: TEXT3, fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Target</th>
                    <th style={{ padding: '10px 14px', color: TEXT3, fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Reason</th>
                    <th style={{ padding: '10px 14px', color: TEXT3, fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Size</th>
                    <th style={{ padding: '10px 14px', color: TEXT3, fontWeight: '700', fontSize: '0.7rem', textTransform: 'uppercase' }}>Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {filesystemReview.items.map((item, idx) => (
                    <tr key={`${item.heldPath}-${idx}`} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '10px 14px', color: TEXT, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {item.relativeHeldPath}
                      </td>
                      <td style={{ padding: '10px 14px', color: TEXT2, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {item.relativeTargetPath || <span style={{ color: TEXT3 }}>— missing —</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '700',
                          background: item.exactDuplicate ? `${OK}20` : `${WARN}20`,
                          color: item.exactDuplicate ? OK : WARN,
                        }}>
                          {item.compareReason}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: TEXT2 }}>{fmtBytes(item.size)}</td>
                      <td style={{ padding: '10px 14px', color: TEXT3 }}>{fmtDate(item.modifiedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
