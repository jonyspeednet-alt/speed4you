import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, Link, useParams, useBlocker } from 'react-router-dom';
import { adminService } from '../../services';
import ConfirmDialog from '../../components/overlays/ConfirmDialog';
import EpisodeEditor from '../../components/admin/EpisodeEditor';
import MetadataSection from '../../components/admin/MetadataSection';
import DetailsSection from '../../components/admin/DetailsSection';
import ArtworkSection from '../../components/admin/ArtworkSection';
import ChecklistSection from '../../components/admin/ChecklistSection';
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
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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
    }, { rootMargin: '-40px 0px -60% 0px' });
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

  const handleFetchAndApply = useCallback(async () => {
    try {
      await tmdb.handleTmdbImport(form.formData.type);
      if (tmdb.tmdbPreview) {
        tmdb.applyTmdbMetadata(tmdb.tmdbPreview);
      }
    } catch (err) {
      form.setError(err.message || 'Metadata fetch failed.');
    }
  }, [tmdb.handleTmdbImport, tmdb.applyTmdbMetadata, tmdb.tmdbPreview, form.formData.type, form.setError]);

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

  return (
    <div style={S.page}>
      <header style={S.toolbar}>
        <Link to="/admin/content" style={S.back}>← Library</Link>
        <span style={S.title}>{form.isEditMode ? 'Edit' : 'New'}</span>
        <span
          style={{ ...S.chip, cursor: form.isEditMode ? 'pointer' : 'default', color: form.formData.status === 'published' ? '#4ade80' : TEXT2 }}
          onClick={form.isEditMode ? handleTogglePublish : undefined}
          title={form.isEditMode ? 'Click to toggle' : ''}
        >{form.formData.status}</span>
        <span style={S.chip}>{form.completenessScore}%</span>
        {SECTION_NAV.map((s) => (
          <button key={s.id} type="button" onClick={() => scrollToSection(s.id)}
            style={{ ...S.navPill, ...(activeSection === s.id ? S.navPillActive : {}) }}>{s.label}</button>
        ))}
        <span style={S.spacer} />
        <button type="submit" disabled={form.loading} style={S.secondaryBtn}>
          {form.loading ? '..' : (form.isEditMode ? 'Save' : 'Save Draft')}
        </button>
        <button type="button" disabled={form.loading} onClick={handleSaveAndPublish} style={S.submitBtn}>
          {form.loading ? '..' : (form.isEditMode ? 'Publish' : 'Save & Pub')}
        </button>
        {form.isEditMode && (
          <button type="button" disabled={form.loading} onClick={() => setShowDeleteConfirm(true)} style={S.deleteBtn}>Del</button>
        )}
        {form.isDirty && <span style={S.unsavedDot} />}
        {!form.isDirty && form.lastSavedAt && <span style={{ fontSize: '0.56rem', color: '#4ade80' }}>saved</span>}
        <span style={S.hint}>Ctrl+S</span>
        {form.isEditMode && <button type="button" onClick={handleDuplicate} disabled={duplicating} style={S.miniBtn}>Dup</button>}
      </header>

      {form.error ? <div style={S.errorBar} role="alert">{form.error}</div> : null}

      {form.loadingItem ? (
        <FormSkeleton styles={S} />
      ) : (
        <form onSubmit={form.handleSubmit} style={S.form}>
          <div style={S.body}>
            <div style={S.mainCol}>
              <section id="section-metadata" data-section style={S.section}>
                <MetadataSection
                  formData={form.formData}
                  handleChange={form.handleChange}
                  tmdbIdInput={tmdb.tmdbIdInput}
                  setTmdbIdInput={tmdb.setTmdbIdInput}
                  loadingTmdb={tmdb.loadingTmdb}
                  tmdbPreview={tmdb.tmdbPreview}
                  onFetchAndApply={handleFetchAndApply}
                  hasDuplicateWarning={hasDuplicateWarning}
                  styles={S}
                  isMobile={isMobile}
                />
              </section>

              <section id="section-details" data-section style={S.section}>
                <DetailsSection
                  formData={form.formData}
                  handleChange={form.handleChange}
                  styles={S}
                />
              </section>

              {form.formData.type === 'series' && (
                <section id="section-episodes" data-section style={S.section}>
                  <EpisodeEditor
                    formData={form.formData}
                    episodesExpanded={episodesExpanded}
                    setEpisodesExpanded={setEpisodesExpanded}
                    handleSeasonChange={form.handleSeasonChange}
                    handleEpisodeChange={form.handleEpisodeChange}
                    onBatchSetUrls={handleBatchSetUrls}
                    onMoveEpisode={form.moveEpisode}
                    autoResize={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                    styles={S}
                  />
                </section>
              )}
            </div>

            <div style={S.sideCol}>
              <section id="section-artwork" data-section>
                <ArtworkSection
                  formData={form.formData}
                  setFormField={form.setFormField}
                  onAssetUpload={handleAssetUpload}
                  uploadingPoster={uploadingPoster}
                  uploadingBackdrop={uploadingBackdrop}
                  styles={S}
                  isMobile={isMobile}
                />
              </section>

              <ChecklistSection
                formData={form.formData}
                itemMeta={form.itemMeta}
                completenessScore={form.completenessScore}
                styles={S}
              />

              {form.isEditMode && (
                <button type="button" onClick={() => setShowPreview(!showPreview)} style={S.miniBtn}>
                  {showPreview ? 'Hide' : 'Preview'}
                </button>
              )}

              {showPreview && (
                <div style={{ ...S.section, padding: '4px 6px' }}>
                  <div style={S.previewRow}>
                    {form.formData.poster
                      ? <img src={form.formData.poster} alt="" style={S.previewImg} />
                      : <div style={S.previewImgPlaceholder}>No Poster</div>}
                    <div style={S.previewInfo}>
                      <strong style={S.previewTitle}>{form.formData.title || 'Untitled'}</strong>
                      <span style={S.previewMeta}>
                        {[form.formData.year, form.formData.genre, form.formData.language].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete this content?"
        message={`"${form.formData.title || 'This item'}" will be removed permanently.`}
        confirmText="Delete"
        cancelText="Keep"
      />
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

const S = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 },

  toolbar: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
    background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, minHeight: '32px',
  },
  back: { color: ACCENT, fontWeight: '600', fontSize: '0.68rem', textDecoration: 'none', whiteSpace: 'nowrap' },
  title: { fontSize: '0.78rem', fontWeight: '700', color: TEXT, whiteSpace: 'nowrap' },
  chip: { fontSize: '0.62rem', fontWeight: '600', color: TEXT2, padding: '1px 6px', borderRadius: '4px', background: SURFACE2, border: `1px solid ${BORDER}`, whiteSpace: 'nowrap' },
  navPill: { padding: '1px 6px', borderRadius: '4px', background: 'transparent', border: 'none', color: TEXT3, fontWeight: '600', fontSize: '0.62rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  navPillActive: { color: ACCENT, background: ACCENT_LIGHT },
  spacer: { flex: 1 },
  miniBtn: { padding: '1px 6px', borderRadius: '4px', background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, fontWeight: '600', fontSize: '0.62rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  hint: { fontSize: '0.58rem', color: TEXT3, whiteSpace: 'nowrap' },
  unsavedDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 },

  errorBar: { padding: '3px 10px', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.68rem', borderBottom: '1px solid rgba(239,68,68,0.15)', flexShrink: 0 },

  radarRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 10px', flexShrink: 0 },

  form: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  body: { display: 'grid', gridTemplateColumns: '1fr 260px', gap: '6px', padding: '6px 10px', flex: 1, overflow: 'auto', minHeight: 0 },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },

  section: { padding: '4px 6px', borderRadius: '4px', background: SURFACE, border: `1px solid ${BORDER}`, display: 'grid', gap: '4px' },
  sectionEyebrow: { color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.56rem', fontWeight: '700', marginBottom: '1px' },

  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '4px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' },
  row4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
  fieldInline: { display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 },
  label: { fontSize: '0.58rem', fontWeight: '600', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.05em' },
  labelInline: { fontSize: '0.58rem', fontWeight: '600', color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: '50px', flexShrink: 0 },
  input: { width: '100%', padding: '3px 6px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.72rem', lineHeight: '1.3' },
  select: { width: '100%', padding: '3px 6px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.72rem', lineHeight: '1.3' },
  textarea: { width: '100%', padding: '3px 6px', background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.72rem', lineHeight: '1.3', resize: 'none' },
  uploadBtn: { padding: '2px 6px', borderRadius: '3px', background: SURFACE2, color: TEXT2, fontWeight: '600', textAlign: 'center', cursor: 'pointer', border: `1px solid ${BORDER}`, fontSize: '0.6rem', whiteSpace: 'nowrap' },
  hiddenInput: { display: 'none' },
  submitBtn: { padding: '3px 10px', background: ACCENT, color: '#fff', borderRadius: '4px', fontWeight: '600', fontSize: '0.68rem', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' },
  secondaryBtn: { padding: '3px 8px', background: SURFACE2, color: TEXT, borderRadius: '4px', fontWeight: '600', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '0.68rem', whiteSpace: 'nowrap' },
  deleteBtn: { padding: '3px 8px', background: 'rgba(239,68,68,0.08)', color: '#f87171', borderRadius: '4px', fontWeight: '600', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontSize: '0.68rem', whiteSpace: 'nowrap' },
  resetBtn: { padding: '3px 8px', background: 'transparent', color: TEXT3, borderRadius: '4px', fontWeight: '600', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: '0.68rem', whiteSpace: 'nowrap' },
  retryBtn: { padding: '3px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '4px', fontWeight: '600', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', fontSize: '0.68rem', whiteSpace: 'nowrap' },

  tmdbRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px', alignItems: 'end' },
  tmdbRowMobile: { gridTemplateColumns: '1fr' },
  tmdbActions: { display: 'flex', gap: '3px' },
  tmdbPreviewCard: { padding: '3px 6px', borderRadius: '4px', background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, display: 'grid', gap: '1px', color: TEXT, fontSize: '0.68rem' },

  checklist: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', borderRadius: '4px', background: SURFACE, border: `1px solid ${BORDER}` },
  checklistBar: { flex: 1, height: '3px', borderRadius: '2px', background: SURFACE2, overflow: 'hidden' },
  checklistFill: { height: '100%', borderRadius: '2px', transition: 'width 300ms' },
  checkItem: { display: 'flex', gap: '3px', alignItems: 'center', color: TEXT3, fontSize: '0.58rem' },
  checkOk: { color: '#4ade80' },
  checkMuted: { color: TEXT3, opacity: 0.4 },
  okBox: { padding: '2px 6px', borderRadius: '3px', background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)', fontSize: '0.62rem' },
  infoBox: { padding: '2px 6px', borderRadius: '3px', background: ACCENT_LIGHT, color: '#a5b4fc', border: `1px solid ${ACCENT_BORDER}`, fontSize: '0.62rem' },
  errorBox: { padding: '2px 6px', borderRadius: '3px', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.62rem' },

  metaList: { display: 'grid', gap: '2px', color: TEXT2, lineHeight: '1.3', fontSize: '0.65rem' },
  duplicateList: { display: 'grid', gap: '3px' },
  duplicateCard: { padding: '3px 6px', borderRadius: '4px', border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT, display: 'grid', gap: '1px', textDecoration: 'none' },

  posterPreview: { width: '60px', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${BORDER}` },
  backdropPreview: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${BORDER}` },
  imgFallback: { width: '60px', aspectRatio: '2/3', borderRadius: '4px', background: SURFACE2, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.55rem', border: `1px solid ${BORDER}` },
  backdropFallback: { width: '100%', aspectRatio: '16/9', borderRadius: '4px', background: SURFACE2, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.55rem', border: `1px solid ${BORDER}` },

  seasonEditorStack: { display: 'grid', gap: '3px' },
  seasonCard: { display: 'grid', gap: '3px', padding: '4px 6px', borderRadius: '4px', background: SURFACE2, border: `1px solid ${BORDER}` },
  seasonHeader: { display: 'flex', justifyContent: 'space-between', gap: '4px', alignItems: 'center' },
  seasonTitle: { color: TEXT, fontWeight: '600', fontSize: '0.68rem' },
  seasonMeta: { color: TEXT3, fontSize: '0.6rem' },
  episodeEditorList: { display: 'grid', gap: '2px' },
  episodeEditorCard: { display: 'grid', gap: '3px', padding: '3px 6px', borderRadius: '3px', background: '#0a0c10', border: `1px solid ${BORDER}` },
  episodeEditorHeader: { display: 'grid', gap: '1px' },
  episodeEditorHint: { color: TEXT3, lineHeight: '1.2', wordBreak: 'break-all', fontSize: '0.56rem' },
  collapseBtn: { padding: '1px 5px', borderRadius: '3px', background: SURFACE2, border: `1px solid ${BORDER}`, color: TEXT2, fontWeight: '600', fontSize: '0.56rem', cursor: 'pointer', lineHeight: 1 },

  previewRow: { display: 'flex', gap: '6px', alignItems: 'start' },
  previewImg: { width: '50px', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 },
  previewImgPlaceholder: { width: '50px', aspectRatio: '2/3', borderRadius: '3px', background: SURFACE2, display: 'grid', placeItems: 'center', color: TEXT3, fontSize: '0.5rem', flexShrink: 0 },
  previewInfo: { display: 'grid', gap: '1px', minWidth: 0 },
  previewTitle: { color: TEXT, fontSize: '0.65rem', fontWeight: '600' },
  previewMeta: { color: TEXT3, fontSize: '0.56rem' },

  actions: {
    display: 'flex', gap: '4px', alignItems: 'center', padding: '3px 10px',
    background: SURFACE, borderTop: `1px solid ${BORDER}`, flexShrink: 0, minHeight: '28px',
  },
  actionsSpacer: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' },
};

export default AddContentPage;
