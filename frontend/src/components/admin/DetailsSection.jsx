import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services';

function DetailsSection({ formData, handleChange, styles: S, onBrowseRoot }) {
  const [roots, setRoots] = useState([]);
  const [loadingRoots, setLoadingRoots] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingRoots(true);
    adminService.getScannerRoots()
      .then((data) => { if (!cancelled) setRoots(data.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingRoots(false); });
    return () => { cancelled = true; };
  }, []);

  const handleRootChange = useCallback((e) => {
    const selectedId = e.target.value;
    handleChange({ target: { name: 'sourceRootId', value: selectedId } });
    const root = roots.find((r) => r.id === selectedId);
    if (root && root.scanPath && !formData.sourcePath) {
      handleChange({ target: { name: 'sourcePath', value: root.scanPath } });
    }
  }, [roots, handleChange, formData.sourcePath]);

  return (
    <>
      <span style={S.sectionEyebrow}>Details</span>
      <div style={S.row4}>
        <div style={S.field}>
          <label style={S.label}>Year</label>
          <input type="number" name="year" value={formData.year} onChange={handleChange} style={S.input} min={1900} max={new Date().getFullYear() + 5} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Genre</label>
          <input type="text" name="genre" value={formData.genre} onChange={handleChange} style={S.input} placeholder="Action, Drama..." />
        </div>
        <div style={S.field}>
          <label style={S.label}>Language</label>
          <select name="language" value={formData.language} onChange={handleChange} style={S.select}>
            <option value="English">English</option>
            <option value="Bengali">Bengali</option>
            <option value="Hindi">Hindi</option>
            <option value="Korean">Korean</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} style={S.select}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <div style={S.row4}>
        <div style={S.field}>
          <label style={S.label}>Scanner Root</label>
          <select name="sourceRootId" value={formData.sourceRootId || ''} onChange={handleRootChange} style={S.select}>
            <option value="">-- None (manual) --</option>
            {roots.map((root) => (
              <option key={root.id} value={root.id}>{root.label || root.id} ({root.type})</option>
            ))}
          </select>
          {loadingRoots && <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>Loading...</span>}
        </div>
        <div style={S.field}>
          <label style={S.label}>Category</label>
          <input type="text" name="category" value={formData.category} onChange={handleChange} style={S.input} placeholder="English Movies..." />
        </div>
        <div style={S.field}>
          <label style={S.label}>Media URL</label>
          <input type="text" name="videoUrl" value={formData.videoUrl} onChange={handleChange} style={S.input} placeholder="/English%20Movies/..." />
        </div>
        <div style={S.field}>
          <label style={S.label}>Tags</label>
          <input type="text" name="tags" value={formData.tags} onChange={handleChange} style={S.input} placeholder="featured, trending" />
        </div>
      </div>
      <div style={S.row4}>
        <div style={S.field}>
          <label style={S.label}>Collection</label>
          <input type="text" name="collection" value={formData.collection} onChange={handleChange} style={S.input} placeholder="Weekend Picks..." />
        </div>
        <div style={S.field}>
          <label style={S.label}>Score</label>
          <input type="number" name="editorialScore" value={formData.editorialScore} onChange={handleChange} style={S.input} min={0} max={100} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Order</label>
          <input type="number" name="featuredOrder" value={formData.featuredOrder} onChange={handleChange} style={S.input} min={0} max={999} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Notes</label>
          <input type="text" name="adminNotes" value={formData.adminNotes} onChange={handleChange} style={S.input} placeholder="Internal note..." />
        </div>
      </div>
      {formData.sourceRootId && (
        <div style={{ marginTop: '4px' }}>
          <button type="button" onClick={() => onBrowseRoot(formData.sourceRootId, '')} style={S.miniBtn}>
            Browse Files
          </button>
        </div>
      )}
    </>
  );
}

export default DetailsSection;
