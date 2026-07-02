function MetadataSection({ formData, handleChange, tmdbIdInput, setTmdbIdInput, loadingTmdb, tmdbPreview, onTmdbImport, onApplyTmdb, hasDuplicateWarning, styles, isMobile }) {
  return (
    <section id="section-metadata" data-section style={styles.section}>
      <span style={styles.sectionEyebrow}>Metadata Assist</span>
      <div style={{ ...styles.tmdbRow, ...(isMobile ? styles.tmdbRowMobile : {}) }}>
        <div style={styles.field}>
          <label style={styles.label}>TMDb / IMDb ID</label>
          <input
            type="text"
            value={tmdbIdInput}
            onChange={(e) => setTmdbIdInput(e.target.value)}
            style={styles.input}
            placeholder="Example: 728754 or tt7651504"
          />
        </div>
        <div style={styles.tmdbActions}>
          <button type="button" onClick={onTmdbImport} disabled={loadingTmdb || !tmdbIdInput} style={styles.secondaryBtn}>
            {loadingTmdb ? 'Fetching...' : 'Import Metadata'}
          </button>
          <button type="button" onClick={onApplyTmdb} disabled={!tmdbPreview} style={styles.submitBtn}>
            Apply to Form
          </button>
        </div>
      </div>

      {tmdbPreview && (
        <div style={styles.tmdbPreviewCard}>
          <strong>{tmdbPreview.title || 'Imported Result'}</strong>
          <span>{tmdbPreview.type} | {tmdbPreview.year || 'N/A'} | {tmdbPreview.genre || 'No genre'}</span>
          <small>
            TMDb #{tmdbPreview.tmdbId} | IMDb {tmdbPreview.imdbId || '-'}
            {tmdbPreview.type === 'series' ? ` | Episodes: ${(tmdbPreview.seasons || []).reduce((sum, season) => sum + ((season.episodes || []).length), 0)}` : ''}
          </small>
        </div>
      )}

      <div style={styles.row}>
        <div style={styles.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={styles.label}>Title *</label>
            <span style={{ fontSize: '0.62rem', color: (formData.title || '').length > 450 ? '#f59e0b' : 'var(--text-3, #475569)' }}>
              {(formData.title || '').length}/500
            </span>
          </div>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            style={{ ...styles.input, ...(hasDuplicateWarning ? { borderColor: '#f59e0b' } : {}) }}
            required
            maxLength={500}
          />
          {hasDuplicateWarning && (
            <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Similar titles found — check Duplicate Radar below</span>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Type *</label>
          <select name="type" value={formData.type} onChange={handleChange} style={styles.select}>
            <option value="movie">Movie</option>
            <option value="series">Series</option>
          </select>
        </div>
      </div>

      <div style={styles.field}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={styles.label}>Description</label>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-3, #475569)' }}>
            {(formData.description || '').length} chars
          </span>
        </div>
        <textarea name="description" value={formData.description} onChange={handleChange} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} style={styles.textarea} rows={2} />
      </div>
    </section>
  );
}

export default MetadataSection;
