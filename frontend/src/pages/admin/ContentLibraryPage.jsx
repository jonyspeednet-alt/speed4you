import { startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../services';
import ConfirmDialog from '../../components/overlays/ConfirmDialog';
import { ToastContext } from '../../components/ui/ToastContext';
import { useBreakpoint } from '../../hooks';

function formatWhen(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function getMetadataTone(item) {
  if (item.metadataStatus === 'matched') return styles.toneSuccess;
  if (item.metadataStatus === 'needs_review') return styles.toneWarning;
  if (item.metadataStatus === 'not_found') return styles.toneDanger;
  return styles.toneNeutral;
}

function mergeContentItem(items, nextItem) {
  return items.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function ContentPoster({ src, alt, style, fallbackText = 'No Art' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div style={styles.posterFallback}>{fallbackText}</div>;
  }
  return (
    <img
      src={src} alt={alt} style={style} loading="lazy" decoding="async"
      onError={() => setFailed(true)} referrerPolicy="no-referrer"
    />
  );
}

function TypeBadge({ type }) {
  const isMovie = type === 'movie';
  return (
    <span style={{
      ...styles.typeBadge,
      background: isMovie ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)',
      color: isMovie ? '#818cf8' : '#c084fc',
    }}>
      {isMovie ? 'Movie' : 'Series'}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'grid', gap: '8px', padding: '16px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{
          height: '48px', borderRadius: '8px',
          background: 'linear-gradient(90deg, #181b22 25%, #22262f 50%, #181b22 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function ContentLibraryPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useContext(ToastContext);

  const sectionType = location.pathname === '/admin/movies'
    ? 'movie' : location.pathname === '/admin/series' ? 'series' : 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [allContent, setAllContent] = useState([]);
  const [selectedContentIds, setSelectedContentIds] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState({ status: true, metadata: true, source: true, actions: true });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [bulkEditor, setBulkEditor] = useState({ collection: '', tags: '', adminNotes: '', featuredOrder: '' });
  const [filters, setFilters] = useState({ search: '', status: '', source: '', language: '', category: '', collection: '', tag: '', sourceRootId: '', duplicatesOnly: false });
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [pageInput, setPageInput] = useState('1');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [roots, setRoots] = useState([]);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    setFilters((c) => ({ ...c, status: '' }));
    setSelectedContentIds([]);
  }, [sectionType]);

  useEffect(() => { setSearchInput(filters.search); }, [filters.search]);

  useEffect(() => {
    const t = setTimeout(() => setFilters((c) => (c.search === searchInput ? c : { ...c, search: searchInput })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const pageTitle = sectionType === 'movie' ? 'Movies'
    : sectionType === 'series' ? 'Series' : 'All Content';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`admin-content-columns-${sectionType}`);
      setVisibleColumns(raw ? JSON.parse(raw) : { status: true, metadata: true, source: true, actions: true });
      const p = localStorage.getItem(`admin-content-presets-${sectionType}`);
      setSavedPresets(p ? JSON.parse(p) : []);
    } catch { setSavedPresets([]); }
  }, [sectionType]);

  useEffect(() => {
    localStorage.setItem(`admin-content-columns-${sectionType}`, JSON.stringify(visibleColumns));
  }, [sectionType, visibleColumns]);

  useEffect(() => {
    localStorage.setItem(`admin-content-presets-${sectionType}`, JSON.stringify(savedPresets));
  }, [savedPresets, sectionType]);

  const apiParams = useMemo(() => ({
    ...(sectionType === 'movie' ? { type: 'movie' } : {}),
    ...(sectionType === 'series' ? { type: 'series' } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.collection ? { collection: filters.collection } : {}),
    ...(filters.tag ? { tag: filters.tag } : {}),
    ...(filters.sourceRootId ? { sourceRootId: filters.sourceRootId } : {}),
    ...(filters.duplicatesOnly ? { duplicatesOnly: 'true' } : {}),
    page: pagination.page, limit: pagination.limit,
    sortBy, sortDir,
  }), [sectionType, filters, pagination.page, pagination.limit, sortBy, sortDir]);

  const loadContent = useCallback(async () => {
    try {
      setError('');
      const res = await (sectionType === 'movie'
        ? adminService.getMovies(apiParams)
        : sectionType === 'series' ? adminService.getSeries(apiParams) : adminService.getContent(apiParams));
      const items = res?.items || [];
      setAllContent(items);
      setPagination((c) => ({ ...c, total: res?.total || 0 }));
      setSelectedContentIds((c) => c.filter((id) => items.some((i) => i.id === id)));
    } catch (e) {
      setError(e.message || 'Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, [apiParams, sectionType]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const loadAux = useCallback(async () => {
    try {
      const [rootsRes, orgRes] = await Promise.all([
        adminService.getScannerRoots().catch(() => ({ items: [] })),
        adminService.getContentOrganization(
          sectionType === 'movie' ? { type: 'movie' } : sectionType === 'series' ? { type: 'series' } : {}
        ).catch(() => ({})),
      ]);
      setRoots(rootsRes?.items || []);
      setOrganization(orgRes || {});
    } catch {}
  }, [sectionType]);

  useEffect(() => { const t = setTimeout(loadAux, 50); return () => clearTimeout(t); }, [loadAux]);

  useEffect(() => { setPagination((c) => ({ ...c, page: 1 })); }, [
    filters.search, filters.status, filters.source, filters.language,
    filters.category, filters.collection, filters.tag, filters.sourceRootId, filters.duplicatesOnly,
  ]);

  const filterOptions = useMemo(() => ({
    languages: [...new Set(allContent.map((i) => i.language).filter(Boolean))].sort(),
    categories: [...new Set(allContent.map((i) => i.category).filter(Boolean))].sort(),
    collections: [...new Set(allContent.map((i) => i.collection).filter(Boolean))].sort(),
    tags: [...new Set(allContent.flatMap((i) => i.tags || []).filter(Boolean))].sort(),
  }), [allContent]);

  const contentMetrics = useMemo(() => ({
    total: pagination.total, visible: allContent.length,
    published: allContent.filter((i) => i.status === 'published').length,
    drafts: allContent.filter((i) => i.status === 'draft').length,
    scanner: allContent.filter((i) => i.sourceType === 'scanner').length,
    manual: allContent.filter((i) => i.sourceType === 'manual').length,
    needsReview: allContent.filter((i) => i.metadataStatus === 'needs_review').length,
    duplicateRisk: allContent.filter((i) => Number(i.duplicateCount || 0) > 0).length,
  }), [allContent, pagination.total]);

  const updateFilter = (key, value) => setFilters((c) => ({ ...c, [key]: value }));
  const resetFilters = () => setFilters({ search: '', status: '', source: '', language: '', category: '', collection: '', tag: '', sourceRootId: '', duplicatesOnly: false });

  const toggleSort = (column) => {
    if (sortBy === column) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }
    else { setSortBy(column); setSortDir('desc'); }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const toggleContentSelection = (id) => setSelectedContentIds((c) => c.includes(id) ? c.filter((e) => e !== id) : [...c, id]);
  const allVisibleIds = useMemo(() => allContent.map((i) => i.id), [allContent]);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedContentIds.includes(id));
  const toggleSelectAllVisible = () => setSelectedContentIds((c) => allVisibleSelected ? c.filter((id) => !allVisibleIds.includes(id)) : [...new Set([...c, ...allVisibleIds])]);

  const handlePublish = useCallback(async (id) => {
    const item = await adminService.publishContent(id);
    setAllContent((c) => mergeContentItem(c, item));
  }, []);

  const handleUnpublish = useCallback(async (id) => {
    const item = await adminService.unpublishContent(id);
    setAllContent((c) => mergeContentItem(c, item));
  }, []);

  const flushDelete = useCallback(async (id) => {
    try {
      setError('');
      await adminService.deleteContent(id);
      setSuccessMsg('Content deleted.');
      setAllContent((c) => c.filter((i) => i.id !== Number(id)));
      setPagination((c) => ({ ...c, total: Math.max(0, c.total - 1) }));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { setError(e.message || 'Failed to delete.'); }
  }, []);

  const handleDelete = (id) => {
    const target = allContent.find((i) => i.id === Number(id));
    if (!target) return;
    if (pendingDelete?.timer) clearTimeout(pendingDelete.timer);
    setPendingDelete({ id: target.id, title: target.title, timer: setTimeout(() => { flushDelete(target.id); setPendingDelete(null); }, 5000) });
    setDeleteTarget(null);
    setSuccessMsg(`"${target.title}" will be deleted in 5s.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleBulkDelete = async () => {
    if (!selectedContentIds.length) return;
    try {
      setBulkDeleteLoading(true); setError('');
      const ids = [...selectedContentIds];
      await Promise.all(ids.map((id) => adminService.deleteContent(id)));
      setSelectedContentIds([]);
      setSuccessMsg(`Deleted ${ids.length} item${ids.length > 1 ? 's' : ''}.`);
      setAllContent((c) => c.filter((i) => !ids.includes(i.id)));
      setPagination((c) => ({ ...c, total: Math.max(0, c.total - ids.length) }));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { setError(e.message || 'Bulk delete failed.'); }
    finally { setBulkDeleteLoading(false); setDeleteTarget(null); }
  };

  const undoPendingDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    setPendingDelete(null);
    setSuccessMsg('Delete cancelled.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  useEffect(() => () => { if (pendingDelete?.timer) clearTimeout(pendingDelete.timer); }, [pendingDelete]);

  const handleBulkOrganize = async () => {
    if (!selectedContentIds.length) return;
    try {
      setBulkUpdateLoading(true); setError('');
      const changes = {};
      if (bulkEditor.collection.trim()) changes.collection = bulkEditor.collection.trim();
      if (bulkEditor.tags.trim()) changes.tags = bulkEditor.tags;
      if (bulkEditor.adminNotes.trim()) changes.adminNotes = bulkEditor.adminNotes.trim();
      if (bulkEditor.featuredOrder !== '') changes.featuredOrder = Number(bulkEditor.featuredOrder) || 0;
      if (!Object.keys(changes).length) { setError('Add at least one value.'); return; }
      const res = await adminService.bulkUpdateContent(selectedContentIds, changes);
      setSuccessMsg(`Updated ${res?.updatedCount || selectedContentIds.length} items.`);
      setBulkEditor({ collection: '', tags: '', adminNotes: '', featuredOrder: '' });
      if (Array.isArray(res?.items) && res.items.length) {
        setAllContent((c) => c.map((item) => res.items.find((u) => u.id === item.id) || item));
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { setError(e.message || 'Bulk organize failed.'); }
    finally { setBulkUpdateLoading(false); }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedContentIds.length) return;
    try {
      setBulkStatusLoading(true); setError('');
      const action = status === 'published' ? adminService.publishContent : adminService.unpublishContent;
      const items = await Promise.all(selectedContentIds.map((id) => action(id)));
      setAllContent((c) => c.map((i) => items.find((u) => u.id === i.id) || i));
      setSuccessMsg(`${status === 'published' ? 'Published' : 'Unpublished'} ${items.length} items.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { setError(e.message || 'Bulk status update failed.'); }
    finally { setBulkStatusLoading(false); }
  };

  const saveCurrentPreset = () => {
    const name = presetName.trim() || `Preset ${savedPresets.length + 1}`;
    setSavedPresets((c) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, filters }, ...c].slice(0, 12));
    setPresetName('');
  };

  const applyPreset = (preset) => { setFilters({ ...preset.filters }); setSearchInput(preset.filters.search || ''); setPagination((c) => ({ ...c, page: 1 })); };
  const removePreset = (id) => setSavedPresets((c) => c.filter((p) => p.id !== id));
  const toggleColumn = (key) => setVisibleColumns((c) => ({ ...c, [key]: !c[key] }));

  const exportCsv = () => {
    if (!allContent.length) { setError('No content to export.'); return; }
    const h = ['id', 'title', 'type', 'status', 'sourceType', 'language', 'category', 'collection', 'year', 'metadataStatus', 'metadataConfidence', 'duplicateCount'];
    const esc = (v) => { const t = String(v ?? ''); return (t.includes(',') || t.includes('"') || t.includes('\n')) ? `"${t.replace(/"/g, '""')}"` : t; };
    const rows = allContent.map((i) => [i.id, i.title, i.type, i.status, i.sourceType, i.language, i.category, i.collection, i.year, i.metadataStatus, i.metadataConfidence, i.duplicateCount].map(esc).join(','));
    const csv = `${h.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `content-${sectionType}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
  const pageWindow = useMemo(() => {
    const start = Math.max(1, pagination.page - 2);
    const end = Math.min(totalPages, start + 4);
    const n = Math.max(1, end - 4);
    return Array.from({ length: end - n + 1 }, (_, i) => n + i);
  }, [pagination.page, totalPages]);

  useEffect(() => { setPageInput(String(pagination.page)); }, [pagination.page]);
  const goToPage = (page) => startTransition(() => setPagination((c) => ({ ...c, page: Math.min(totalPages, Math.max(1, Number(page) || 1)) })));

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (selectedContentIds.length !== 1) return;
      const id = selectedContentIds[0];
      const item = allContent.find((i) => i.id === id);
      if (!item) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); handlePublish(id); }
      else if (k === 'u') { e.preventDefault(); handleUnpublish(id); }
      else if (k === 'e') { e.preventDefault(); navigate(`/admin/content/${id}/edit`); }
      else if (e.key === 'Delete') { e.preventDefault(); setDeleteTarget({ mode: 'single', id, title: item.title }); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allContent, handlePublish, handleUnpublish, navigate, selectedContentIds]);

  const colSpan = 3 + Number(visibleColumns.status) + Number(visibleColumns.metadata) + Number(visibleColumns.source) + Number(visibleColumns.actions);

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>{pageTitle}</h2>
          <div style={styles.pageMeta}>
            <span>{pagination.total} total</span>
            <span style={styles.dot}>·</span>
            <span style={{ color: '#4ade80' }}>{contentMetrics.published} published</span>
            <span style={styles.dot}>·</span>
            <span style={{ color: '#facc15' }}>{contentMetrics.drafts} drafts</span>
            {contentMetrics.needsReview > 0 && (
              <><span style={styles.dot}>·</span><span style={{ color: '#fbbf24' }}>{contentMetrics.needsReview} needs review</span></>
            )}
            {contentMetrics.duplicateRisk > 0 && (
              <><span style={styles.dot}>·</span><span style={{ color: '#f87171' }}>{contentMetrics.duplicateRisk} duplicates</span></>
            )}
          </div>
        </div>
        <Link to="/admin/content/new" style={styles.addBtn}>+ Add Content</Link>
      </div>

      {error ? <div style={styles.msgError}>{error}</div> : null}
      {successMsg ? <div style={styles.msgInfo}>{successMsg}</div> : null}
      {pendingDelete ? (
        <div style={styles.undoToast}>
          Deleting "{pendingDelete.title}"...
          <button type="button" onClick={undoPendingDelete} style={styles.undoBtn}>Undo</button>
        </div>
      ) : null}

      <div style={styles.statsRow}>
        <StatCard label="Total" value={contentMetrics.total} accent />
        <StatCard label="Published" value={contentMetrics.published} />
        <StatCard label="Drafts" value={contentMetrics.drafts} />
        <StatCard label="Needs Review" value={contentMetrics.needsReview} />
        <StatCard label="Scanner" value={contentMetrics.scanner} />
        <StatCard label="Manual" value={contentMetrics.manual} />
      </div>

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={styles.searchWrap}>
            <input
              type="text" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, genre, language..."
              style={styles.searchInput}
            />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            style={{ ...styles.chip, ...(showFilters ? styles.chipActive : {}) }}>
            Filters {showFilters ? '▲' : '▼'}
          </button>
          <button type="button" onClick={() => updateFilter('duplicatesOnly', !filters.duplicatesOnly)}
            style={{ ...styles.chip, ...(filters.duplicatesOnly ? styles.chipActive : {}) }}>Duplicates</button>
          <button type="button" onClick={() => updateFilter('status', filters.status === 'draft' ? '' : 'draft')}
            style={{ ...styles.chip, ...(filters.status === 'draft' ? styles.chipActive : {}) }}>Drafts</button>
          <button type="button" onClick={() => updateFilter('status', filters.status === 'published' ? '' : 'published')}
            style={{ ...styles.chip, ...(filters.status === 'published' ? styles.chipActive : {}) }}>Published</button>
        </div>
        <div style={styles.toolbarRight}>
          <button type="button" onClick={exportCsv} style={styles.chip}>Export CSV</button>
        </div>
      </div>

      {showFilters && (
        <div style={styles.filterPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Status</label>
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} style={styles.select}>
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Source</label>
              <select value={filters.source} onChange={(e) => updateFilter('source', e.target.value)} style={styles.select}>
                <option value="">All</option>
                <option value="scanner">Scanner</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Language</label>
              <select value={filters.language} onChange={(e) => updateFilter('language', e.target.value)} style={styles.select}>
                <option value="">All</option>
                {filterOptions.languages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Category</label>
              <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} style={styles.select}>
                <option value="">All</option>
                {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Collection</label>
              <select value={filters.collection} onChange={(e) => updateFilter('collection', e.target.value)} style={styles.select}>
                <option value="">All</option>
                {filterOptions.collections.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Tag</label>
              <select value={filters.tag} onChange={(e) => updateFilter('tag', e.target.value)} style={styles.select}>
                <option value="">All</option>
                {filterOptions.tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.filterLabel}>Root</label>
              <select value={filters.sourceRootId} onChange={(e) => updateFilter('sourceRootId', e.target.value)} style={styles.select}>
                <option value="">All</option>
                {roots.map((r) => <option key={r.id} value={r.id}>{r.label || r.id}</option>)}
              </select>
            </div>
            <div style={{ ...styles.field, justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetFilters} style={styles.clearBtn}>Clear All</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.bulkBar}>
        <div style={styles.bulkLeft}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Columns:</span>
          {['status', 'metadata', 'source', 'actions'].map((key) => (
            <button key={key} type="button" onClick={() => toggleColumn(key)}
              style={{ ...styles.chipSmall, ...(visibleColumns[key] ? styles.chipActive : {}) }}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '8px' }}>Per page:</span>
          {[25, 50, 100].map((s) => (
            <button key={s} type="button" onClick={() => startTransition(() => setPagination((c) => ({ ...c, page: 1, limit: s })))}
              style={{ ...styles.chipSmall, ...(pagination.limit === s ? styles.chipActive : {}) }}>
              {s}
            </button>
          ))}
        </div>
        <div style={styles.bulkRight}>
          {savedPresets.slice(0, 4).map((p) => (
            <div key={p.id} style={styles.presetChip}>
              <button type="button" onClick={() => applyPreset(p)} style={styles.chipSmall}>{p.name}</button>
              <button type="button" onClick={() => removePreset(p.id)} style={styles.presetDel}>×</button>
            </div>
          ))}
          <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
            placeholder="Save preset" style={styles.miniInput} />
          <button type="button" onClick={saveCurrentPreset} style={styles.chipSmall}>Save</button>
        </div>
      </div>

      {selectedContentIds.length > 0 && (
        <div style={styles.selectionBar}>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{selectedContentIds.length} selected</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <input type="text" value={bulkEditor.collection} onChange={(e) => setBulkEditor((c) => ({ ...c, collection: e.target.value }))}
              placeholder="Collection" style={styles.smallInput} />
            <input type="text" value={bulkEditor.tags} onChange={(e) => setBulkEditor((c) => ({ ...c, tags: e.target.value }))}
              placeholder="tags, comma separated" style={styles.smallInput} />
            <input type="number" value={bulkEditor.featuredOrder}
              onChange={(e) => setBulkEditor((c) => ({ ...c, featuredOrder: e.target.value }))}
              placeholder="Feature order" style={{ ...styles.smallInput, width: '100px' }} />
            <button type="button" onClick={handleBulkOrganize} disabled={bulkUpdateLoading || bulkStatusLoading}
              style={styles.actionBtn}>Organize</button>
            <button type="button" onClick={() => handleBulkStatusUpdate('published')}
              disabled={bulkStatusLoading || bulkUpdateLoading} style={styles.greenBtn}>Publish</button>
            <button type="button" onClick={() => handleBulkStatusUpdate('draft')}
              disabled={bulkStatusLoading || bulkUpdateLoading} style={styles.actionBtn}>Unpublish</button>
            <button type="button" onClick={() => setDeleteTarget({ mode: 'bulk', count: selectedContentIds.length })}
              disabled={bulkDeleteLoading || bulkStatusLoading} style={styles.dangerBtn}>
              {bulkDeleteLoading ? 'Deleting...' : `Delete (${selectedContentIds.length})`}
            </button>
          </div>
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, ...(isMobile ? styles.tableMobile : isTablet ? styles.tableTablet : {}) }}>
          <thead>
            <tr>
              <th style={styles.thCheck}>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
              </th>
              <th style={styles.thSort} onClick={() => toggleSort('title')}>
                Title <SortIcon column="title" />
              </th>
              {visibleColumns.status && (
                <th style={styles.thSort} onClick={() => toggleSort('status')}>
                  Status <SortIcon column="status" />
                </th>
              )}
              {visibleColumns.metadata && <th style={styles.th}>Metadata</th>}
              {visibleColumns.source && (
                <th style={styles.thSort} onClick={() => toggleSort('sourceType')}>
                  Source <SortIcon column="sourceType" />
                </th>
              )}
              {visibleColumns.actions && <th style={styles.thRight}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan}><LoadingSkeleton /></td></tr>
            ) : !allContent.length ? (
              <tr>
                <td colSpan={colSpan} style={styles.empty}>
                  No content matched the current filters.
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button type="button" onClick={resetFilters} style={styles.miniBtn}>Clear Filters</button>
                    <button type="button" onClick={() => goToPage(1)} style={styles.miniBtn}>Page 1</button>
                  </div>
                </td>
              </tr>
            ) : allContent.map((item) => (
              <tr key={item.id} style={styles.row}>
                <td style={styles.tdCheck}>
                  <input type="checkbox" checked={selectedContentIds.includes(item.id)}
                    onChange={() => toggleContentSelection(item.id)} />
                </td>
                <td style={styles.td}>
                  <div style={styles.titleCell}>
                    <ContentPoster src={resolvePoster(item)} alt={item.title}
                      style={styles.poster} fallbackText="" />
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.titleRow}>
                        <strong style={styles.titleText}>{item.title}</strong>
                        <TypeBadge type={item.type} />
                        {Number(item.duplicateCount || 0) > 0 && (
                          <span style={styles.dupBadge}>{item.duplicateCount} dup</span>
                        )}
                        {item.featured && <span style={styles.featBadge}>Featured</span>}
                        {item.collection && <span style={styles.colBadge}>{item.collection}</span>}
                      </div>
                      <div style={styles.metaLine}>
                        {item.category || '-'} · {item.year || 'N/A'} · {item.language || 'Unknown'}
                      </div>
                      {item.tags?.length > 0 && (
                        <div style={styles.metaLine}>Tags: {item.tags.join(', ')}</div>
                      )}
                      {item.sourcePath && <div style={styles.pathLine}>{item.sourcePath}</div>}
                    </div>
                  </div>
                </td>
                {visibleColumns.status && (
                  <td style={styles.td}>
                    <span style={{ ...styles.statusPill, ...(item.status === 'published' ? styles.statusPub : styles.statusDraft) }}>
                      {item.status}
                    </span>
                  </td>
                )}
                {visibleColumns.metadata && (
                  <td style={styles.td}>
                    <div style={{ ...styles.signalPill, ...getMetadataTone(item) }}>
                      {item.metadataStatus || 'pending'}
                    </div>
                    <div style={styles.metaLine}>{item.metadataConfidence || 0}% confidence</div>
                    <div style={styles.metaLine}>Updated: {formatWhen(item.metadataUpdatedAt || item.updatedAt)}</div>
                  </td>
                )}
                {visibleColumns.source && (
                  <td style={styles.td}>
                    <div style={styles.metaLine}>{item.sourceType || '-'}</div>
                    <div style={styles.metaLine}>Trend: {item.trendingScore || 0}</div>
                    <div style={styles.metaLine}>Dup: {item.duplicateCount || 0}</div>
                    {item.featuredOrder && <div style={styles.metaLine}>Slot: {item.featuredOrder}</div>}
                    {item.adminNotes && <div style={styles.metaLine}>Note: {item.adminNotes}</div>}
                  </td>
                )}
                {visibleColumns.actions && (
                  <td style={styles.tdActions}>
                    <div style={styles.actionGroup}>
                      {item.videoUrl && <Link to={`/watch/${item.id}`} style={styles.miniBtn}>Play</Link>}
                      <Link to={`/admin/content/${item.id}/edit`} style={styles.miniBtn}>Edit</Link>
                      {item.status === 'published' ? (
                        <button type="button" onClick={() => handleUnpublish(item.id)} style={styles.miniBtn}>Unpub</button>
                      ) : (
                        <button type="button" onClick={() => handlePublish(item.id)} style={styles.greenMiniBtn}>Publish</button>
                      )}
                      <button type="button" onClick={() => setDeleteTarget({ mode: 'single', id: item.id, title: item.title })}
                        style={styles.dangerMiniBtn}>Del</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.pagination}>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
          Page {pagination.page} of {totalPages} · {allContent.length} of {pagination.total} items
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button type="button" onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1} style={styles.pageBtn}>‹</button>
          {pageWindow.map((n) => (
            <button key={n} type="button" onClick={() => goToPage(n)}
              style={{ ...styles.pageBtn, ...(n === pagination.page ? styles.pageBtnActive : {}) }}>{n}</button>
          ))}
          <button type="button" onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= totalPages} style={styles.pageBtn}>›</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <input type="number" min="1" max={totalPages} value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToPage(pageInput); }}
              style={styles.pageInput} />
            <button type="button" onClick={() => goToPage(pageInput)} style={styles.pageBtn}>Go</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteTarget?.mode === 'bulk' ? handleBulkDelete : () => handleDelete(deleteTarget?.id)}
        title={deleteTarget?.mode === 'bulk' ? 'Delete selected content?' : 'Delete this content?'}
        message={deleteTarget?.mode === 'bulk'
          ? `${deleteTarget?.count || 0} items will be permanently removed.`
          : `"${deleteTarget?.title || 'This item'}" will be permanently removed.`}
        confirmText={deleteTarget?.mode === 'bulk' ? 'Delete Selected' : 'Delete'}
        cancelText="Cancel"
      />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      ...styles.statCard,
      ...(accent ? styles.statCardAccent : {}),
    }}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function resolvePoster(item) {
  return item?.poster || item?.backdrop || '';
}

const surface2 = 'var(--surface-2, #181b22)';
const border = 'var(--border, rgba(255,255,255,0.07))';
const text = 'var(--text, #f1f5f9)';
const text2 = 'var(--text-2, #94a3b8)';
const text3 = 'var(--text-3, #475569)';
const accent = 'var(--accent-primary, #6366f1)';
const accentBorder = 'var(--accent-border, rgba(99,102,241,0.3))';
const accentLight = 'var(--accent-light, rgba(99,102,241,0.12))';

const styles = {
  page: { display: 'grid', gap: '14px', padding: '0 0 24px' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '16px 0 8px', borderBottom: `1px solid ${border}` },
  pageTitle: { fontSize: '1.35rem', fontWeight: '700', color: text, margin: 0 },
  pageMeta: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: text2, marginTop: '6px', flexWrap: 'wrap' },
  dot: { color: text3 },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: accent, color: '#fff', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' },
  msgError: { padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem' },
  msgInfo: { padding: '10px 14px', borderRadius: '8px', background: 'rgba(56,189,248,0.08)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.18)', fontSize: '0.85rem' },
  undoToast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: '0.85rem' },
  undoBtn: { padding: '6px 12px', borderRadius: '6px', background: surface2, color: text, fontWeight: '600', fontSize: '0.78rem', border: `1px solid ${border}`, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' },
  statCard: { padding: '12px', borderRadius: '8px', background: surface2, border: `1px solid ${border}`, display: 'grid', gap: '2px', textAlign: 'center' },
  statCardAccent: { background: accentLight, border: `1px solid ${accentBorder}` },
  statValue: { fontSize: '1.3rem', fontWeight: '700', color: text },
  statLabel: { fontSize: '0.72rem', color: text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 },
  toolbarRight: { display: 'flex', gap: '6px' },
  searchWrap: { flex: 1, minWidth: '200px', maxWidth: '360px' },
  searchInput: { width: '100%', padding: '9px 14px', background: surface2, border: `1px solid ${border}`, borderRadius: '10px', color: text, fontSize: '0.9rem' },
  chip: { padding: '7px 14px', borderRadius: '999px', background: '#12171f', border: `1px solid ${border}`, color: text2, fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms' },
  chipActive: { background: accent, color: '#fff', borderColor: accent },
  chipSmall: { padding: '5px 10px', borderRadius: '6px', background: surface2, border: `1px solid ${border}`, color: text2, fontWeight: '600', fontSize: '0.74rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterPanel: { padding: '14px', borderRadius: '10px', background: '#12161f', border: `1px solid ${border}` },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' },
  field: { display: 'grid', gap: '6px' },
  filterLabel: { color: text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem', fontWeight: '700' },
  select: { padding: '9px 12px', background: surface2, border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '0.85rem' },
  clearBtn: { padding: '9px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', alignSelf: 'end' },
  bulkBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: '#12161f', border: `1px solid ${border}`, flexWrap: 'wrap' },
  bulkLeft: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' },
  bulkRight: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' },
  miniInput: { padding: '6px 10px', background: '#0e1117', border: `1px solid ${border}`, borderRadius: '6px', color: text, fontSize: '0.78rem', width: '100px' },
  selectionBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: accentLight, border: `1px solid ${accentBorder}`, flexWrap: 'wrap' },
  smallInput: { padding: '7px 10px', background: '#0e1117', border: `1px solid ${border}`, borderRadius: '6px', color: text, fontSize: '0.8rem', minWidth: '110px', width: '140px' },
  actionBtn: { padding: '6px 12px', borderRadius: '6px', background: surface2, border: `1px solid ${border}`, color: text2, fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer' },
  greenBtn: { padding: '6px 12px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontWeight: '600', fontSize: '0.75rem', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer' },
  dangerBtn: { padding: '6px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: '600', fontSize: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto', borderRadius: '12px', border: `1px solid ${border}`, background: '#0b0f14' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  tableTablet: { minWidth: '780px' },
  tableMobile: { minWidth: '660px' },
  th: { textAlign: 'left', color: text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', fontWeight: '700', padding: '10px 12px', background: '#0d1116', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap', userSelect: 'none' },
  thSort: { textAlign: 'left', color: text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', fontWeight: '700', padding: '10px 12px', background: '#0d1116', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' },
  thCheck: { width: '40px', padding: '10px 8px 10px 14px', background: '#0d1116', borderBottom: `1px solid ${border}` },
  thRight: { textAlign: 'right', color: text3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', fontWeight: '700', padding: '10px 14px', background: '#0d1116', borderBottom: `1px solid ${border}` },
  row: { background: 'transparent', transition: 'background 120ms' },
  td: { padding: '12px', borderBottom: `1px solid ${border}`, verticalAlign: 'middle', color: text2 },
  tdCheck: { padding: '10px 6px 10px 14px', borderBottom: `1px solid ${border}`, width: '32px' },
  tdActions: { padding: '12px', borderBottom: `1px solid ${border}`, verticalAlign: 'middle', textAlign: 'right' },
  titleCell: { display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', gap: '10px', alignItems: 'start' },
  poster: { width: '36px', height: '52px', objectFit: 'cover', borderRadius: '4px', marginTop: '2px' },
  posterFallback: { width: '36px', height: '52px', borderRadius: '4px', background: surface2, display: 'grid', placeItems: 'center', color: text3, fontSize: '0.55rem' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' },
  titleText: { color: text, fontSize: '0.85rem', fontWeight: '600' },
  metaLine: { color: text3, fontSize: '0.74rem', marginTop: '2px' },
  pathLine: { color: text3, fontSize: '0.68rem', wordBreak: 'break-all', marginTop: '2px' },
  typeBadge: { padding: '2px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.03em' },
  dupBadge: { padding: '2px 6px', borderRadius: '3px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontSize: '0.65rem', fontWeight: '600' },
  featBadge: { padding: '2px 6px', borderRadius: '3px', background: accentLight, color: accent, fontSize: '0.65rem', fontWeight: '600' },
  colBadge: { padding: '2px 6px', borderRadius: '3px', background: 'rgba(168,85,247,0.1)', color: '#c084fc', fontSize: '0.65rem', fontWeight: '600' },
  signalPill: { width: 'fit-content', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize' },
  toneSuccess: { background: 'rgba(34,197,94,0.1)', color: '#4ade80' },
  toneWarning: { background: 'rgba(245,158,11,0.1)', color: '#fbbf24' },
  toneDanger: { background: 'rgba(239,68,68,0.1)', color: '#f87171' },
  toneNeutral: { background: surface2, color: text2 },
  statusPill: { padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize', display: 'inline-flex' },
  statusPub: { background: 'rgba(34,197,94,0.1)', color: '#4ade80' },
  statusDraft: { background: 'rgba(234,179,8,0.1)', color: '#facc15' },
  actionGroup: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  miniBtn: { padding: '5px 10px', borderRadius: '5px', background: surface2, color: text2, fontWeight: '600', fontSize: '0.7rem', textDecoration: 'none', border: `1px solid ${border}`, cursor: 'pointer', whiteSpace: 'nowrap' },
  greenMiniBtn: { padding: '5px 10px', borderRadius: '5px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontWeight: '600', fontSize: '0.7rem', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' },
  dangerMiniBtn: { padding: '5px 10px', borderRadius: '5px', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: '600', fontSize: '0.7rem', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { padding: '32px 12px', textAlign: 'center', color: text3, fontSize: '0.85rem' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: '#12161f', border: `1px solid ${border}`, flexWrap: 'wrap' },
  pageBtn: { padding: '6px 11px', borderRadius: '6px', background: surface2, border: `1px solid ${border}`, color: text2, fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', minWidth: '32px', textAlign: 'center' },
  pageBtnActive: { background: accentLight, borderColor: accentBorder, color: text },
  pageInput: { width: '56px', padding: '6px 8px', background: surface2, border: `1px solid ${border}`, borderRadius: '6px', color: text, fontSize: '0.82rem', textAlign: 'center' },
  presetChip: { display: 'inline-flex', alignItems: 'center', gap: '2px', background: surface2, borderRadius: '5px', paddingRight: '2px', border: `1px solid ${border}` },
  presetDel: { width: '18px', height: '18px', borderRadius: '3px', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontWeight: '700', fontSize: '0.68rem', lineHeight: 1, cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};
