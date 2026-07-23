import { useState, useCallback, useRef } from 'react';
import { adminService } from '../services';

function useTmdbImport(setFormField, setItemMeta) {
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [loadingTmdb, setLoadingTmdb] = useState(false);
  const [tmdbPreview, setTmdbPreview] = useState(null);
  const abortRef = useRef(null);

  const applyTmdbMetadata = useCallback((metadata) => {
    if (!metadata) return;

    setFormField('title', metadata.title);
    if (metadata.type) setFormField('type', metadata.type);
    if (metadata.description) setFormField('description', metadata.description);
    if (metadata.year) setFormField('year', metadata.year);
    if (metadata.genre) setFormField('genre', metadata.genre);
    if (metadata.poster) setFormField('poster', metadata.poster);
    if (metadata.backdrop) setFormField('backdrop', metadata.backdrop);
    if (Array.isArray(metadata.seasons) && metadata.seasons.length > 0) {
      setFormField('seasons', metadata.seasons);
    }

    setItemMeta((current) => ({
      ...(current || {}),
      ...(metadata || {}),
      tmdbId: metadata.tmdbId || current?.tmdbId || null,
      imdbId: metadata.imdbId || current?.imdbId || '',
      originalTitle: metadata.originalTitle || current?.originalTitle || '',
      originalLanguage: metadata.originalLanguage || current?.originalLanguage || '',
      metadataStatus: metadata.metadataStatus || 'matched',
      metadataProvider: metadata.metadataProvider || 'tmdb',
      metadataConfidence: metadata.metadataConfidence || 100,
      metadataUpdatedAt: metadata.metadataUpdatedAt || new Date().toISOString(),
      metadataError: metadata.metadataError || '',
      parsedTitle: metadata.parsedTitle || current?.parsedTitle || '',
      rating: metadata.rating ?? current?.rating ?? null,
      runtime: metadata.runtime ?? current?.runtime ?? null,
    }));
  }, [setFormField, setItemMeta]);

  const handleTmdbImport = useCallback(async (formDataType) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      setLoadingTmdb(true);
      const response = await adminService.importTmdbMetadata(tmdbIdInput, formDataType);
      setTmdbPreview(response.metadata || null);
    } catch (tmdbError) {
      if (tmdbError.name === 'AbortError') return;
      setTmdbPreview(null);
      throw tmdbError;
    } finally {
      setLoadingTmdb(false);
    }
  }, [tmdbIdInput]);

  return {
    tmdbIdInput,
    setTmdbIdInput,
    loadingTmdb,
    tmdbPreview,
    setTmdbPreview,
    applyTmdbMetadata,
    handleTmdbImport,
  };
}

export default useTmdbImport;
