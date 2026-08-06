import { useState, useCallback, useEffect, useRef } from 'react';
import { adminService } from '../services';

const emptyForm = {
  title: '',
  type: 'movie',
  description: '',
  year: new Date().getFullYear(),
  genre: '',
  language: 'English',
  status: 'draft',
  poster: '',
  backdrop: '',
  videoUrl: '',
  category: '',
  collection: '',
  tags: '',
  adminNotes: '',
  editorialScore: 0,
  featuredOrder: 0,
  sourceRootId: '',
  seasons: [],
};

const AUTOSAVE_KEY = 'speed4you_content_draft';
const AUTOSAVE_INTERVAL = 30000;
const MAX_HISTORY = 50;

function coerceNumeric(value, fallback = null) {
  if (value === '' || value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildSubmissionData(formData, itemMeta, overrides = {}) {
  return {
    ...formData,
    year: coerceNumeric(formData.year),
    editorialScore: coerceNumeric(formData.editorialScore, 0),
    featuredOrder: coerceNumeric(formData.featuredOrder, 0),
    ...overrides,
    ...(itemMeta ? {
      tmdbId: coerceNumeric(itemMeta.tmdbId),
      imdbId: itemMeta.imdbId || '',
      originalTitle: itemMeta.originalTitle || '',
      originalLanguage: itemMeta.originalLanguage || '',
      metadataStatus: itemMeta.metadataStatus || 'matched',
      metadataConfidence: coerceNumeric(itemMeta.metadataConfidence, 100),
      metadataProvider: itemMeta.metadataProvider || 'tmdb',
      metadataUpdatedAt: itemMeta.metadataUpdatedAt || new Date().toISOString(),
      metadataError: itemMeta.metadataError || '',
      parsedTitle: itemMeta.parsedTitle || '',
    } : {}),
    tags: typeof formData.tags === 'string'
      ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : formData.tags,
    sourceRootId: formData.sourceRootId || '',
  };
}

function useContentForm(id) {
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEditMode);
  const [error, setError] = useState('');
  const [itemMeta, setItemMeta] = useState(null);
  const [formData, setFormData] = useState(() => {
    if (!isEditMode) {
      try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.type === 'movie' || parsed.type === 'series')) {
            const restored = { ...emptyForm, ...parsed, year: parsed.year || new Date().getFullYear() };
            if (Array.isArray(restored.tags)) restored.tags = restored.tags.join(', ');
            return restored;
          }
        }
      } catch {}
    }
    return emptyForm;
  });
  const [isDirty, setIsDirty] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const autosaveTimerRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isUndoingRef = useRef(false);

  const pushHistory = useCallback((state) => {
    if (isUndoingRef.current) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(state)));
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    isUndoingRef.current = true;
    setFormData(historyRef.current[historyIndexRef.current]);
    isUndoingRef.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    isUndoingRef.current = true;
    setFormData(historyRef.current[historyIndexRef.current]);
    isUndoingRef.current = false;
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  useEffect(() => {
    if (!isEditMode) {
      setItemMeta(null);
      setFormData(emptyForm);
      return;
    }

    const loadItem = async () => {
      try {
        setLoadingItem(true);
        setError('');
        const item = await adminService.getContentById(id);
        setItemMeta(item);
        const loaded = {
          title: item.title || '',
          type: item.type || 'movie',
          description: item.description || '',
          year: item.year || '',
          genre: item.genre || '',
          language: item.language || 'English',
          status: item.status || 'draft',
          poster: item.poster || '',
          backdrop: item.backdrop || '',
          videoUrl: item.videoUrl || '',
          category: item.category || '',
          collection: item.collection || '',
          tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
          adminNotes: item.adminNotes || '',
          editorialScore: item.editorialScore || 0,
          sourceRootId: item.sourceRootId || '',
          featuredOrder: item.featuredOrder || 0,
          seasons: Array.isArray(item.seasons)
            ? item.seasons.map((season, seasonIndex) => ({
              ...season,
              id: season.id || seasonIndex + 1,
              number: season.number || season.id || seasonIndex + 1,
              title: season.title || '',
              episodes: Array.isArray(season.episodes)
                ? season.episodes.map((episode, episodeIndex) => ({
                  ...episode,
                  id: episode.id || episodeIndex + 1,
                  number: episode.number || episode.id || episodeIndex + 1,
                  title: episode.title || '',
                  description: episode.description || '',
                  videoUrl: episode.videoUrl || '',
                }))
                : [],
            }))
            : [],
        };
        setFormData(loaded);
        historyRef.current = [JSON.parse(JSON.stringify(loaded))];
        historyIndexRef.current = 0;
        setPublishedUrl(item.status === 'published' ? `/movies/${item.slug || item.id}` : null);
      } catch (err) {
        setError(err.message || 'Failed to load content details.');
      } finally {
        setLoadingItem(false);
      }
    };

    loadItem();
  }, [id, isEditMode]);

  useEffect(() => {
    if (!loadingItem && formData) pushHistory(formData);
  }, [formData, loadingItem, pushHistory]);

  const handleChange = useCallback((event) => {
    const { name, value, type: inputType } = event.target;
    let coerced = value;
    if (inputType === 'number' || name === 'year' || name === 'editorialScore' || name === 'featuredOrder' || name === 'rating' || name === 'duration') {
      coerced = value === '' ? '' : (Number(value) || value);
    }
    setFormData((prev) => {
      if (name === 'type') {
        if (value === 'series' && (!Array.isArray(prev.seasons) || prev.seasons.length === 0)) {
          return {
            ...prev,
            type: 'series',
            seasons: [{
              id: `${Date.now()}-s1`,
              number: 1,
              title: '',
              poster: '',
              episodes: [{
                id: `${Date.now()}-s1-e1`,
                number: 1,
                title: '',
                description: '',
                videoUrl: '',
              }],
            }],
          };
        }
        if (value === 'movie') {
          return { ...prev, type: 'movie', seasons: [] };
        }
      }
      return { ...prev, [name]: coerced };
    });
    setIsDirty(true);
  }, []);

  const handleSeasonChange = useCallback((seasonIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      seasons: (prev.seasons || []).map((season, index) => (
        index === seasonIndex ? { ...season, [field]: value } : season
      )),
    }));
    setIsDirty(true);
  }, []);

  const handleAddSeason = useCallback(() => {
    setFormData((prev) => {
      const nextSeasonNumber = (prev.seasons?.length || 0) + 1;
      return {
        ...prev,
        seasons: [
          ...(prev.seasons || []),
          {
            id: `${Date.now()}-s${nextSeasonNumber}`,
            number: nextSeasonNumber,
            title: '',
            poster: '',
            episodes: [{
              id: `${Date.now()}-s${nextSeasonNumber}-e1`,
              number: 1,
              title: '',
              description: '',
              videoUrl: '',
            }],
          },
        ],
      };
    });
    setIsDirty(true);
  }, []);

  const handleAddEpisode = useCallback((seasonIndex) => {
    setFormData((prev) => ({
      ...prev,
      seasons: (prev.seasons || []).map((season, index) => {
        if (index !== seasonIndex) return season;
        const nextEpisodeNumber = (season.episodes?.length || 0) + 1;
        return {
          ...season,
          episodes: [
            ...(season.episodes || []),
            {
              id: `${Date.now()}-s${season.number || seasonIndex + 1}-e${nextEpisodeNumber}`,
              number: nextEpisodeNumber,
              title: '',
              description: '',
              videoUrl: '',
            },
          ],
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const handleEpisodeChange = useCallback((seasonIndex, episodeIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      seasons: (prev.seasons || []).map((season, currentSeasonIndex) => {
        if (currentSeasonIndex !== seasonIndex) return season;
        return {
          ...season,
          episodes: (season.episodes || []).map((episode, currentEpisodeIndex) => (
            currentEpisodeIndex === episodeIndex
              ? { ...episode, [field]: value }
              : episode
          )),
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const setFormField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const moveEpisode = useCallback((seasonIndex, fromIndex, toIndex) => {
    setFormData((prev) => ({
      ...prev,
      seasons: (prev.seasons || []).map((season, si) => {
        if (si !== seasonIndex) return season;
        const eps = [...(season.episodes || [])];
        const [moved] = eps.splice(fromIndex, 1);
        eps.splice(toIndex, 0, moved);
        return { ...season, episodes: eps };
      }),
    }));
    setIsDirty(true);
  }, []);

  const refreshItemMeta = useCallback(async (contentId) => {
    if (!contentId) return;
    try {
      const freshItem = await adminService.getContentById(contentId);
      setItemMeta(freshItem);
    } catch {}
  }, []);

  // Clear cached public detail pages so admins don't see stale draft data
  const clearDetailPageCache = useCallback((contentId) => {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const slug = String(contentId || '');
      sessionStorage.removeItem(`portal-movie-details-v1:${slug}`);
      sessionStorage.removeItem(`portal-series-details-v1:${slug}`);
    } catch {}
  }, []);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const submissionData = buildSubmissionData(formData, itemMeta);
      if (isEditMode) {
        await adminService.updateContent(id, submissionData);
      } else {
        await adminService.createContent(submissionData);
      }
      setIsDirty(false);
      setLastSavedAt(Date.now());
      localStorage.removeItem(AUTOSAVE_KEY);
      clearDetailPageCache(id);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to save content.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [formData, itemMeta, isEditMode, id, clearDetailPageCache]);

  const handleSaveAndPublish = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let targetId = id;
      const submissionData = buildSubmissionData(formData, itemMeta, { status: 'published' });
      if (isEditMode) {
        const updated = await adminService.updateContent(id, submissionData);
        targetId = updated.id;
      } else {
        const created = await adminService.createContent(submissionData);
        targetId = created.id;
      }
      await refreshItemMeta(targetId);
      setIsDirty(false);
      setPublishedUrl(`/movies/${submissionData.slug || targetId}`);
      setLastSavedAt(Date.now());
      localStorage.removeItem(AUTOSAVE_KEY);
      clearDetailPageCache(targetId);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to publish content.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [formData, itemMeta, isEditMode, id, refreshItemMeta, clearDetailPageCache]);

  const handleAssetUpload = useCallback(async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const response = kind === 'poster'
        ? await adminService.uploadPoster(file)
        : await adminService.uploadBanner(file);
      setFormData((current) => ({
        ...current,
        [kind === 'poster' ? 'poster' : 'backdrop']: response.url,
      }));
      setIsDirty(true);
    } catch (uploadError) {
      setError(uploadError.message || 'Asset upload failed.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!isEditMode || loading) return;
    try {
      setLoading(true);
      setError('');
      await adminService.deleteContent(id);
      localStorage.removeItem(AUTOSAVE_KEY);
      return { success: true };
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete content.');
      return { success: false, error: deleteError.message };
    } finally {
      setLoading(false);
    }
  }, [isEditMode, loading, id]);

  const resetForm = useCallback(() => {
    setFormData(emptyForm);
    setItemMeta(null);
    setError('');
    setIsDirty(false);
    setPublishedUrl(null);
    localStorage.removeItem(AUTOSAVE_KEY);
    historyRef.current = [JSON.parse(JSON.stringify(emptyForm))];
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (isEditMode || !isDirty) return;
    autosaveTimerRef.current = setInterval(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
      } catch {}
    }, AUTOSAVE_INTERVAL);
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [formData, isDirty, isEditMode]);

  const completenessScore = (() => {
    const checks = [
      formData.title,
      formData.description,
      formData.genre,
      formData.poster,
      formData.backdrop,
      formData.videoUrl,
      formData.sourceRootId,
      formData.category,
      formData.language,
      formData.year,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  })();

  return {
    formData,
    setFormField,
    handleChange,
    handleSeasonChange,
    handleEpisodeChange,
    handleAddSeason,
    handleAddEpisode,
    handleAssetUpload,
    handleSubmit,
    handleSaveAndPublish,
    handleDelete,
    moveEpisode,
    refreshItemMeta,
    resetForm,
    undo,
    redo,
    canUndo,
    canRedo,
    loading,
    loadingItem,
    error,
    setError,
    itemMeta,
    setItemMeta,
    isEditMode,
    isDirty,
    publishedUrl,
    lastSavedAt,
    completenessScore,
  };
}

export { emptyForm, buildSubmissionData };
export default useContentForm;
