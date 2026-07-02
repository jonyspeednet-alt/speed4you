function ScannerSource({ itemMeta, styles }) {
  if (!itemMeta) return null;

  return (
    <section style={styles.section}>
      <span style={styles.sectionEyebrow}>Scanner Source</span>
      <div style={styles.metaList}>
        <div><strong>Root:</strong> {itemMeta.sourceRootLabel || '-'}</div>
        <div><strong>Category:</strong> {itemMeta.category || '-'}</div>
        <div><strong>Path:</strong> {itemMeta.sourcePath || '-'}</div>
        <div><strong>Last Scan:</strong> {itemMeta.lastScannedAt || '-'}</div>
        <div><strong>Metadata:</strong> {itemMeta.metadataStatus || 'pending'} ({itemMeta.metadataConfidence || 0}%)</div>
        <div><strong>TMDb:</strong> {itemMeta.tmdbId || '-'}</div>
        <div><strong>IMDb:</strong> {itemMeta.imdbId || '-'}</div>
      </div>
    </section>
  );
}

export default ScannerSource;
