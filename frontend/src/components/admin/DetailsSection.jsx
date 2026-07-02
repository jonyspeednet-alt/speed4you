function DetailsSection({ formData, handleChange, styles }) {
  return (
    <section id="section-details" data-section style={styles.section}>
      <span style={styles.sectionEyebrow}>Release Details</span>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Year</label>
          <input type="number" name="year" value={formData.year} onChange={handleChange} style={styles.input} min={1900} max={new Date().getFullYear() + 5} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Genre</label>
          <input type="text" name="genre" value={formData.genre} onChange={handleChange} style={styles.input} placeholder="Action, Drama, Thriller..." />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Language</label>
          <select name="language" value={formData.language} onChange={handleChange} style={styles.select}>
            <option value="English">English</option>
            <option value="Bengali">Bengali</option>
            <option value="Hindi">Hindi</option>
            <option value="Korean">Korean</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} style={styles.select}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <input type="text" name="category" value={formData.category} onChange={handleChange} style={styles.input} placeholder="English Movies, K-Drama, Anime..." />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Media URL</label>
          <input type="text" name="videoUrl" value={formData.videoUrl} onChange={handleChange} style={styles.input} placeholder="/English%20Movies/..." />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Collection</label>
          <input type="text" name="collection" value={formData.collection} onChange={handleChange} style={styles.input} placeholder="Weekend Picks, Bangla Spotlight..." />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Tags</label>
          <input type="text" name="tags" value={formData.tags} onChange={handleChange} style={styles.input} placeholder="featured, family, trending" />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Editorial Score</label>
          <input type="number" name="editorialScore" value={formData.editorialScore} onChange={handleChange} style={styles.input} min={0} max={100} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Featured Order</label>
          <input type="number" name="featuredOrder" value={formData.featuredOrder} onChange={handleChange} style={styles.input} min={0} max={999} />
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Admin Notes</label>
        <textarea name="adminNotes" value={formData.adminNotes} onChange={handleChange} onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} style={styles.textarea} rows={1} placeholder="Internal note for future management..." />
      </div>
    </section>
  );
}

export default DetailsSection;
