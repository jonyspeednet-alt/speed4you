import { useCallback, useRef, useState } from 'react';

function ArtworkSection({ formData, setFormField, onAssetUpload, uploadingPoster, uploadingBackdrop, styles: S, isMobile }) {
  const posterInputRef = useRef(null);
  const backdropInputRef = useRef(null);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleDrop = useCallback((e, kind) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    onAssetUpload({ target: { files: [file], value: '' } }, kind);
  }, [onAssetUpload]);

  return (
    <>
      <span style={S.sectionEyebrow}>Artwork</span>

      <div style={S.field} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'poster')}>
        <label style={S.label}>Poster</label>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <input type="text" name="poster" value={formData.poster}
            onChange={(e) => { setFormField('poster', e.target.value); setPosterError(false); }}
            style={{ ...S.input, flex: 1 }} placeholder="/portal/uploads/posters/..." />
          <button type="button" onClick={() => posterInputRef.current?.click()} disabled={uploadingPoster} style={S.uploadBtn}>
            {uploadingPoster ? '..' : '↑'}
          </button>
          <input ref={posterInputRef} type="file" accept="image/*" onChange={(e) => { onAssetUpload(e, 'poster'); setPosterError(false); }} style={S.hiddenInput} />
          {formData.poster && (
            <button type="button" onClick={() => { setFormField('poster', ''); setPosterError(false); }}
              style={{ ...S.uploadBtn, color: '#f87171' }}>×</button>
          )}
        </div>
      </div>

      <div style={S.field} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'backdrop')}>
        <label style={S.label}>Banner</label>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          <input type="text" name="backdrop" value={formData.backdrop}
            onChange={(e) => { setFormField('backdrop', e.target.value); setBackdropError(false); }}
            style={{ ...S.input, flex: 1 }} placeholder="/portal/uploads/banners/..." />
          <button type="button" onClick={() => backdropInputRef.current?.click()} disabled={uploadingBackdrop} style={S.uploadBtn}>
            {uploadingBackdrop ? '..' : '↑'}
          </button>
          <input ref={backdropInputRef} type="file" accept="image/*" onChange={(e) => { onAssetUpload(e, 'backdrop'); setBackdropError(false); }} style={S.hiddenInput} />
          {formData.backdrop && (
            <button type="button" onClick={() => { setFormField('backdrop', ''); setBackdropError(false); }}
              style={{ ...S.uploadBtn, color: '#f87171' }}>×</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        {formData.poster && !posterError
          ? <img src={formData.poster} alt="Poster" loading="lazy" onError={() => setPosterError(true)} style={S.posterPreview} />
          : <div style={S.imgFallback}>Poster</div>}
        {formData.backdrop && !backdropError
          ? <img src={formData.backdrop} alt="Banner" loading="lazy" onError={() => setBackdropError(true)} style={S.backdropPreview} />
          : <div style={S.backdropFallback}>Banner</div>}
      </div>
    </>
  );
}

export default ArtworkSection;
