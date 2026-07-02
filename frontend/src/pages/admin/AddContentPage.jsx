import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, Link, useParams, useBlocker } from 'react-router-dom';
import { adminService } from '../../services';
import ConfirmDialog from '../../components/overlays/ConfirmDialog';
import EpisodeEditor from '../../components/admin/EpisodeEditor';
import MetadataSection from '../../components/admin/MetadataSection';
import DetailsSection from '../../components/admin/DetailsSection';
import ArtworkSection from '../../components/admin/ArtworkSection';
import ChecklistSection from '../../components/admin/ChecklistSection';
import DuplicateRadar from '../../components/admin/DuplicateRadar';
import ScannerSource from '../../components/admin/ScannerSource';
import ActionBar from '../../components/admin/ActionBar';
import FormSkeleton from '../../components/admin/FormSkeleton';
import { useBreakpoint } from '../../hooks';
import useContentForm from '../../hooks/useContentForm';
import useTmdbImport from '../../hooks/useTmdbImport';
import useDuplicateDetection from '../../hooks/useDuplicateDetection';

function AddContentPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const navigate = useNavigate();
  const { id } = useParams();

  const form = useContentForm(id);
  const tmdb = useTmdbImport(form.setFormField, form.setItemMeta);
  const { liveDuplicates } = useDuplicateDetection(form.formData.title, form.formData.type, form.isEditMode, id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [episodesExpanded, setEpisodesExpanded] = useState(true);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [duplicating, setDuplicating] = useState(false);

  const duplicateCandidates = liveDuplicates ?? (form.itemMeta?.duplicateCandidates || []);
  const hasDuplicateWarning = duplicateCandidates.length > 0;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      form.isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  const SECTION_NAV = useMemo(() => [
    { id: 'section-metadata', label: 'Metadata' },
    { id: 'section-details', label: 'Details' },
    ...(form.formData.type === 'series' ? [{ id: 'section-episodes', label: `Episodes (${(form.formData.seasons || []).reduce((s, seas) => s + (seas.episodes || []).length, 0)})` }] : []),
    { id: 'section-artwork', label: 'Artwork' },
    { id: 'section-checklist', label: 'Checklist' },
  ], [form.formData.type, form.formData.seasons]);

  const scrollToSection = useCallback((sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-80px 0px -60% 0px' });
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [form.loadingItem, form.formData.type]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        form.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        form.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        form.handleSubmit(new Event('submit'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [form.handleSubmit, form.undo, form.redo]);

  const handleAssetUpload = useCallback(async (event, kind) => {
    if (kind === 'poster') setUploadingPoster(true);
    else setUploadingBackdrop(true);
    try {
      await form.handleAssetUpload(event, kind);
    } finally {
      if (kind === 'poster') setUploadingPoster(false);
      else setUploadingBackdrop(false);
    }
  }, [form.handleAssetUpload]);

  const handleSaveAndPublish = useCallback(async () => {
    const result = await form.handleSaveAndPublish();
    if (result.success) navigate('/admin/content');
  }, [form.handleSaveAndPublish, navigate]);

  const handleDelete = useCallback(async () => {
    const result = await form.handleDelete();
    if (result.success) navigate('/admin/content');
    setShowDeleteConfirm(false);
  }, [form.handleDelete, navigate]);

  const handleTmdbImport = useCallback(async () => {
    try {
      await tmdb.handleTmdbImport(form.formData.type);
    } catch (err) {
      form.setError(err.message || 'Metadata import failed.');
    }
  }, [tmdb.handleTmdbImport, form.formData.type, form.setError]);

  const handleBatchSetUrls = useCallback((pattern) => {
    const seasons = form.formData.seasons || [];
    seasons.forEach((season, si) => {
      (season.episodes || []).forEach((ep, ei) => {
        const num = (ep.number || ei + 1);
        const nn = String(num).padStart(2, '0');
        const url = pattern.replace(/\{NN\}/g, nn).replace(/\{N\}/g, String(num));
        form.handleEpisodeChange(si, ei, 'videoUrl', url);
      });
    });
  }, [form.formData.seasons, form.handleEpisodeChange]);

  const handleDuplicate = useCallback(async () => {
    if (!form.isEditMode || !id) return;
    try {
      setDuplicating(true);
      const item = await adminService.getContentById(id);
      delete item.id;
      delete item.createdAt;
      delete item.updatedAt;
      item.title = `${item.title} (Copy)`;
      item.status = 'draft';
      const created = await adminService.createContent(item);
      navigate(`/admin/content/${created.id}/edit`);
    } catch (err) {
      form.setError(err.message || 'Failed to duplicate content.');
    } finally {
      setDuplicating(false);
    }
  }, [form.isEditMode, id, form.setError, navigate]);

  const handleTogglePublish = useCallback(async () => {
    if (!form.isEditMode || !id) return;
    const newStatus = form.formData.status === 'published' ? 'draft' : 'published';
    form.setFormField('status', newStatus);
    try {
      await adminService.updateContent(id, { status: newStatus });
      form.setPublishedUrl(newStatus === 'published' ? `/movies/${form.itemMeta?.slug || id}` : null);
    } catch (err) {
      form.setError(err.message || 'Failed to update status.');
      form.setFormField('status', newStatus === 'published' ? 'draft' : 'published');
    }
  }, [form.isEditMode, id, form.formData.status, form.setFormField, form.setError, form.itemMeta]);

  const handleLoadHistory = useCallback(async () => {
    if (!showHistory) {
      setVersionHistory([
        { date: form.itemMeta?.updatedAt || new Date().toISOString(), user: 'Admin', action: 'Last update' },
        { date: form.itemMeta?.createdAt || new Date().toISOString(), user: 'System', action: 'Created by scanner' },
      ]);
    }
    setShowHistory(!showHistory);
  }, [showHistory, form.itemMeta]);

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <section style={{ ...styles.header, ...(isMobile ? styles.headerMobile : isTablet ? styles.headerTablet : {}) }}>
        <div style={styles.headerCopy}>
          <Link to="/admin/content" style={styles.back}>Back to Content Library</Link>
          <h1 style={styles.title}>{form.isEditMode ? 'Content Review Studio' : 'Create Content Entry'}</h1>
        </div>
        <div style={styles.statusRail}>
          <div
            style={{ ...styles.statusCard, cursor: form.isEditMode ? 'pointer' : 'default' }}
            onClick={form.isEditMode ? handleTogglePublish : undefined}
            title={form.isEditMode ? 'Click to toggle publish status' : ''}
          >
            <span style={styles.statusLabel}>Status</span>
            <strong style={{ ...styles.statusValue, color: form.formData.status === 'published' ? '#4ade80' : undefined }}>{form.formData.status}</strong>
          </div>
          <div style={styles.statusCard}>
            <span style={styles.statusLabel}>Complete</span>
            <strong style={styles.statusValue}>{form.completenessScore}%</strong>
          </div>
          <div style={styles.statusCard}>
            <span style={styles.statusLabel}>Meta</span>
            <strong style={styles.statusValue}>{form.itemMeta?.metadataStatus || 'manual'}</strong>
          </div>
        </div>
        {form.isEditMode && (
          <div style={{ display: 'flex', gap: '6px', gridColumn: '1 / -1' }}>
            <button type="button" onClick={handleDuplicate} disabled={duplicating} style={styles.secondaryBtn}>
              {duplicating ? 'Duplicating...' : 'Duplicate Content'}
            </button>
            <button type="button" onClick={handleLoadHistory} style={styles.secondaryBtn}>
              {showHistory ? 'Hide History' : 'Version History'}
            </button>
          </div>
        )}
      </section>

      {form.error ? <div style={styles.errorBox} role="alert">{form.error}</div> : null}

      {!form.loadingItem && (
        <nav style={styles.sectionNav}>
          {SECTION_NAV.map((s) => (
            <button key={s.id} type="button" onClick={() => scrollToSection(s.id)}
              aria-current={activeSection === s.id ? 'true' : undefined}
              style={{ ...styles.sectionNavItem, ...(activeSection === s.id ? styles.sectionNavItemActive : {}) }}>
              {s.label}
            </button>
          ))}
        </nav>
      )}

      {form.loadingItem ? (
        <FormSkeleton styles={styles} />
      ) : (
        <>
          {form.isEditMode && form.itemMeta && (
            <div style={styles.metaGrid}>
              <ScannerSource itemMeta={form.itemMeta} styles={styles} />
              <DuplicateRadar duplicateCandidates={duplicateCandidates} styles={styles} />
            </div>
          )}

          <form onSubmit={form.handleSubmit} style={styles.form}>
            <div style={{ ...styles.contentGrid, ...(isMobile || isTablet ? styles.contentGridMobile : {}) }}>
              <div style={styles.formStack}>
                <MetadataSection
                  formData={form.formData}
                  handleChange={form.handleChange}
                  tmdbIdInput={tmdb.tmdbIdInput}
                  setTmdbIdInput={tmdb.setTmdbIdInput}
                  loadingTmdb={tmdb.loadingTmdb}
                  tmdbPreview={tmdb.tmdbPreview}
                  onTmdbImport={handleTmdbImport}
                  onApplyTmdb={() => tmdb.applyTmdbMetadata(tmdb.tmdbPreview)}
                  hasDuplicateWarning={hasDuplicateWarning}
                  styles={styles}
                  isMobile={isMobile}
                />

                <DetailsSection
                  formData={form.formData}
                  handleChange={form.handleChange}
                  styles={styles}
                />

                <EpisodeEditor
                  formData={form.formData}
                  episodesExpanded={episodesExpanded}
                  setEpisodesExpanded={setEpisodesExpanded}
                  handleSeasonChange={form.handleSeasonChange}
                  handleEpisodeChange={form.handleEpisodeChange}
                  onBatchSetUrls={handleBatchSetUrls}
                  onMoveEpisode={form.moveEpisode}
                  autoResize={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  styles={styles}
                />
              </div>

              <aside style={{ ...styles.assetRail, ...(isMobile || isTablet ? styles.assetRailMobile : {}) }}>
                <ArtworkSection
                  formData={form.formData}
                  setFormField={form.setFormField}
                  onAssetUpload={handleAssetUpload}
                  uploadingPoster={uploadingPoster}
                  uploadingBackdrop={uploadingBackdrop}
                  styles={styles}
                  isMobile={isMobile}
                />

                <ChecklistSection
                  formData={form.formData}
                  itemMeta={form.itemMeta}
                  completenessScore={form.completenessScore}
                  styles={styles}
                />

                {form.isEditMode && (
                  <button type="button" onClick={() => setShowPreview(!showPreview)} style={styles.secondaryBtn}>
                    {showPreview ? 'Hide Preview' : 'Preview Card'}
                  </button>
                )}

                {showPreview && (
                  <section style={styles.section}>
                    <span style={styles.sectionEyebrow}>Card Preview</span>
                    <div style={styles.previewCard}>
                      {form.formData.poster
                        ? <img src={form.formData.poster} alt="" style={styles.previewCardImage} />
                        : <div style={styles.previewCardImagePlaceholder}>No Poster</div>}
                      <div style={styles.previewCardBody}>
                        <strong style={styles.previewCardTitle}>{form.formData.title || 'Untitled'}</strong>
                        <span style={styles.previewCardMeta}>
                          {[form.formData.year, form.formData.genre, form.formData.language].filter(Boolean).join(' | ')}
                        </span>
                      </div>
                    </div>
                  </section>
                )}
              </aside>
            </div>

            <ActionBar
              isEditMode={form.isEditMode}
              loading={form.loading}
              onSave={() => form.handleSubmit(new Event('submit'))}
              onSaveAndPublish={handleSaveAndPublish}
              onDelete={() => setShowDeleteConfirm(true)}
              onRetry={() => form.handleSubmit(new Event('submit'))}
              isDirty={form.isDirty}
              hasError={!!form.error}
              publishedUrl={form.publishedUrl}
              lastSavedAt={form.lastSavedAt}
              onReset={form.resetForm}
              styles={styles}
            />
          </form>

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete this content?"
            message={`"${form.formData.title || 'This item'}" will be removed from the portal catalog. This action cannot be undone.`}
            confirmText="Delete Permanently"
            cancelText="Keep Content"
          />
        </>
      )}
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

const styles = {
  page: { display: 'grid', gap: '12px' },
  header: {
    padding: '14px 18px',
    borderRadius: '10px',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(200px, 0.8fr)',
    gap: '14px',
    alignItems: 'center',
  },
  headerTablet: { gridTemplateColumns: '1fr' },
  headerMobile: { padding: '12px', gridTemplateColumns: '1fr' },
  headerCopy: { display: 'grid', gap: '4px' },
  back: { color: ACCENT, display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500', fontSize: '0.8rem' },
  title: { fontSize: '1.15rem', fontWeight: '700', color: TEXT, margin: 0 },
  statusRail: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  statusCard: { padding: '8px 10px', borderRadius: '8px', background: SURFACE2, border: `1px solid ${BORDER}`, display: 'grid', gap: '2px' },
  statusLabel: { fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT3, fontWeight: '600' },
  statusValue: { color: TEXT, fontWeight: '600', fontSize: '0.82rem', textTransform: 'capitalize' },
  sectionNav: { display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px 0', position: 'sticky', top: '0', zIndex: 5, background: 'var(--bg-primary, #0a0c10)' },
  sectionNavItem: { padding: '5px 10px', borderRadius: '6px', background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, fontWeight: '600', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms' },
  sectionNavItemActive: { background: ACCENT_LIGHT, borderColor: ACCENT_BORDER, color: TEXT },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  collapseBtn: { padding: '3px 8px', borderRadius: '6px', background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, fontWeight: '600', fontSize: '0.7rem', cursor: 'pointer', lineHeight: 1 },
  section: { padding: '12px 14px', borderRadius: '10px', background: SURFACE, border: `1px solid ${BORDER}`, display: 'grid', gap: '10px' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' },
  metaList: { display: 'grid', gap: '4px', color: TEXT2, lineHeight: '1.5', fontSize: '0.8rem' },
  duplicateList: { display: 'grid', gap: '6px' },
  duplicateCard: { padding: '8px 10px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, display: 'grid', gap: '3px', textDecoration: 'none' },
  okBox: { padding: '6px 10px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)', fontSize: '0.8rem' },
  infoBox: { padding: '6px 10px', borderRadius: '8px', background: ACCENT_LIGHT, color: '#a5b4fc', border: `1px solid ${ACCENT_BORDER}`, fontSize: '0.8rem' },
  errorBox: { padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.8rem' },
  form: { display: 'grid', gap: '10px' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(240px, 0.7fr)', gap: '12px', alignItems: 'start' },
  contentGridMobile: { gridTemplateColumns: '1fr' },
  formStack: { display: 'grid', gap: '10px' },
  assetRail: { display: 'grid', gap: '10px', position: 'sticky', top: '36px' },
  assetRailMobile: { position: 'static', top: 'auto' },
  tmdbRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '8px', alignItems: 'end' },
  tmdbRowMobile: { gridTemplateColumns: '1fr' },
  tmdbActions: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  tmdbPreviewCard: { padding: '8px 10px', borderRadius: '8px', background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, display: 'grid', gap: '3px', color: TEXT, fontSize: '0.8rem' },
  sectionEyebrow: { color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.62rem', fontWeight: '700' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  label: { fontSize: '0.68rem', fontWeight: '600', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.07em' },
  input: { width: '100%', padding: '7px 10px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '8px', color: TEXT, fontSize: '0.85rem' },
  select: { width: '100%', padding: '7px 10px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '8px', color: TEXT, fontSize: '0.85rem' },
  textarea: { width: '100%', padding: '7px 10px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '8px', color: TEXT, fontSize: '0.85rem', resize: 'vertical' },
  uploadBtn: { padding: '6px 10px', borderRadius: '6px', background: SURFACE2, color: TEXT2, fontWeight: '600', textAlign: 'center', cursor: 'pointer', border: `1px solid ${BORDER}`, fontSize: '0.75rem' },
  hiddenInput: { display: 'none' },
  previewStage: { display: 'grid', gap: '8px' },
  previewImage: { width: '100%', maxWidth: '120px', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: '8px' },
  previewImageMobile: { maxWidth: '100%' },
  previewWideImage: { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '8px' },
  posterFallback: { width: '100%', maxWidth: '120px', aspectRatio: '2 / 3', borderRadius: '8px', background: SURFACE2, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.7rem', border: `1px solid ${BORDER}` },
  backdropFallback: { width: '100%', aspectRatio: '16 / 9', borderRadius: '8px', background: SURFACE2, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.7rem', border: `1px solid ${BORDER}` },
  checklist: { display: 'grid', gap: '4px' },
  seasonEditorStack: { display: 'grid', gap: '8px' },
  seasonCard: { display: 'grid', gap: '8px', padding: '10px', borderRadius: '8px', background: SURFACE2, border: `1px solid ${BORDER}` },
  seasonHeader: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  seasonTitle: { color: TEXT, fontWeight: '600', fontSize: '0.82rem' },
  seasonMeta: { color: TEXT3, fontSize: '0.75rem' },
  episodeEditorList: { display: 'grid', gap: '8px' },
  episodeEditorCard: { display: 'grid', gap: '8px', padding: '8px', borderRadius: '8px', background: '#0a0c10', border: `1px solid ${BORDER}` },
  episodeEditorHeader: { display: 'grid', gap: '2px' },
  episodeEditorHint: { color: TEXT3, lineHeight: '1.4', wordBreak: 'break-all', fontSize: '0.7rem' },
  checkItem: { display: 'flex', gap: '6px', alignItems: 'center', color: TEXT2, fontSize: '0.78rem' },
  checkOk: { color: '#4ade80' },
  checkMuted: { color: TEXT3 },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', position: 'sticky', bottom: 0, padding: '10px 18px', background: SURFACE, borderTop: `1px solid ${BORDER}`, zIndex: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' },
  secondaryBtn: { padding: '7px 14px', background: SURFACE2, color: TEXT, borderRadius: '8px', fontWeight: '600', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '0.82rem' },
  submitBtn: { padding: '7px 16px', background: ACCENT, color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', border: 'none' },
  deleteBtn: { padding: '7px 14px', background: 'rgba(239,68,68,0.08)', color: '#f87171', borderRadius: '8px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontSize: '0.82rem' },
  resetBtn: { padding: '7px 14px', background: 'transparent', color: TEXT3, borderRadius: '8px', fontWeight: '600', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '0.82rem' },
  retryBtn: { padding: '7px 14px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px', fontWeight: '600', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', fontSize: '0.82rem' },
  previewCard: { display: 'grid', gap: '8px', background: SURFACE2, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${BORDER}` },
  previewCardImage: { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' },
  previewCardImagePlaceholder: { width: '100%', aspectRatio: '16 / 9', background: SURFACE, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.75rem' },
  previewCardBody: { padding: '8px 10px', display: 'grid', gap: '2px' },
  previewCardTitle: { color: TEXT, fontSize: '0.82rem', fontWeight: '600' },
  previewCardMeta: { color: TEXT3, fontSize: '0.7rem' },
};

export default AddContentPage;
