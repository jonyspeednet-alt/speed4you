function MetadataSection({ formData, handleChange, tmdbIdInput, setTmdbIdInput, loadingTmdb, tmdbPreview, onFetchAndApply, hasDuplicateWarning, styles: S, isMobile }) {
  return (
    <>
      <span style={S.sectionEyebrow}>Metadata</span>
      <div style={{ ...S.tmdbRow, ...(isMobile ? S.tmdbRowMobile : {}) }}>
        <div style={S.field}>
          <input type="text" value={tmdbIdInput} onChange={(e) => setTmdbIdInput(e.target.value)}
            style={S.input} placeholder="TMDb/IMDb ID → Fetch & Apply" />
        </div>
        <button type="button" onClick={onFetchAndApply} disabled={loadingTmdb || !tmdbIdInput} style={S.submitBtn}>
          {loadingTmdb ? '..' : 'Fetch'}
        </button>
      </div>
      {tmdbPreview && (
        <div style={S.tmdbPreviewCard}>
          <strong>{tmdbPreview.title || 'Applied'}</strong>
          <small>{tmdbPreview.type} · {tmdbPreview.year || 'N/A'} · TMDb #{tmdbPreview.tmdbId}</small>
        </div>
      )}
      <div style={S.row2}>
        <div style={S.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={S.label}>Title *</label>
            <span style={{ fontSize: '0.52rem', color: (formData.title || '').length > 450 ? '#f59e0b' : TEXT3 }}>
              {(formData.title || '').length}/500
            </span>
          </div>
          <input type="text" name="title" value={formData.title} onChange={handleChange}
            style={{ ...S.input, ...(hasDuplicateWarning ? { borderColor: '#f59e0b' } : {}) }}
            required maxLength={500} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Type *</label>
          <select name="type" value={formData.type} onChange={handleChange} style={S.select}>
            <option value="movie">Movie</option>
            <option value="series">Series</option>
          </select>
        </div>
      </div>
      <div style={S.field}>
        <textarea name="description" value={formData.description} onChange={handleChange}
          style={S.textarea} rows={1} placeholder="Description..." />
      </div>
    </>
  );
}

const TEXT3 = 'var(--text-3, #475569)';

export default MetadataSection;
