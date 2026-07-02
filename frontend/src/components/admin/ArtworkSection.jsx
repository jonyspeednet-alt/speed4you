import { useCallback, useRef, useState } from 'react';

function ArtworkSection({ formData, setFormField, onAssetUpload, uploadingPoster, uploadingBackdrop, styles, isMobile }) {
  const posterInputRef = useRef(null);
  const backdropInputRef = useRef(null);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e, kind) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const syntheticEvent = { target: { files: [file], value: '' } };
    onAssetUpload(syntheticEvent, kind);
  }, [onAssetUpload]);

  return (
    <section id="section-artwork" data-section style={styles.section}>
      <span style={styles.sectionEyebrow}>Artwork Studio</span>

      <div
        style={styles.field}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'poster')}
      >
        <label style={styles.label}>Poster Image URL</label>
        <input type="text" name="poster" value={formData.poster} onChange={(e) => { setFormField('poster', e.target.value); setPosterError(false); }} style={styles.input} placeholder="/portal/uploads/posters/..." />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploadingPoster} style={styles.uploadBtn}>
            {uploadingPoster ? 'Uploading...' : 'Upload Poster'}
          </button>
          <input ref={posterInputRef} type="file" accept="image/*" onChange={(e) => { onAssetUpload(e, 'poster'); setPosterError(false); }} style={styles.hiddenInput} />
          {formData.poster && (
            <button type="button" onClick={() => { setFormField('poster', ''); setPosterError(false); }} style={{ ...styles.uploadBtn, color: '#f87171' }}>Remove</button>
          )}
        </div>
      </div>

      <div
        style={styles.field}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'backdrop')}
      >
        <label style={styles.label}>Banner Image URL</label>
        <input type="text" name="backdrop" value={formData.backdrop} onChange={(e) => { setFormField('backdrop', e.target.value); setBackdropError(false); }} style={styles.input} placeholder="/portal/uploads/banners/..." />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" onClick={() => backdropInputRef.current?.click()} disabled={uploadingBackdrop} style={styles.uploadBtn}>
            {uploadingBackdrop ? 'Uploading...' : 'Upload Banner'}
          </button>
          <input ref={backdropInputRef} type="file" accept="image/*" onChange={(e) => { onAssetUpload(e, 'backdrop'); setBackdropError(false); }} style={styles.hiddenInput} />
          {formData.backdrop && (
            <button type="button" onClick={() => { setFormField('backdrop', ''); setBackdropError(false); }} style={{ ...styles.uploadBtn, color: '#f87171' }}>Remove</button>
          )}
        </div>
      </div>

      <div style={styles.previewStage}>
        {formData.poster && !posterError
          ? <img src={formData.poster} alt="Poster preview" loading="lazy" onError={() => setPosterError(true)} style={{ ...styles.previewImage, ...(isMobile ? styles.previewImageMobile : {}) }} />
          : <div style={{ ...styles.posterFallback, ...(isMobile ? styles.previewImageMobile : {}) }}>Poster Preview</div>}
        {formData.backdrop && !backdropError
          ? <img src={formData.backdrop} alt="Backdrop preview" loading="lazy" onError={() => setBackdropError(true)} style={styles.previewWideImage} />
          : <div style={styles.backdropFallback}>Backdrop Preview</div>}
      </div>
    </section>
  );
}

export default ArtworkSection;
