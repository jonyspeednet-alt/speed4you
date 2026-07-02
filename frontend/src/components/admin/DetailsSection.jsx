function DetailsSection({ formData, handleChange, styles: S }) {
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
      <div style={S.row3}>
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
    </>
  );
}

export default DetailsSection;
