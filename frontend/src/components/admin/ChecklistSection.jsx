function ChecklistSection({ formData, itemMeta, completenessScore, styles }) {
  const checks = [
    { label: 'Title ready', ok: formData.title },
    { label: 'Description added', ok: formData.description },
    { label: 'Playback path linked', ok: formData.videoUrl },
    { label: 'Poster attached', ok: formData.poster },
    { label: 'Backdrop attached', ok: formData.backdrop },
    { label: 'Metadata verified', ok: itemMeta?.metadataStatus === 'matched' },
  ];

  return (
    <section id="section-checklist" data-section style={styles.section}>
      <span style={styles.sectionEyebrow}>Publish Checklist</span>
      <div style={{ ...styles.field, marginBottom: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-2, #94a3b8)' }}>Completeness</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: completenessScore === 100 ? '#4ade80' : 'var(--text, #f1f5f9)' }}>{completenessScore}%</span>
        </div>
        <div
          style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-2, #181b22)', overflow: 'hidden' }}
          role="progressbar"
          aria-valuenow={completenessScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Content completeness: ${completenessScore}%`}
        >
          <div style={{ height: '100%', width: `${completenessScore}%`, borderRadius: '2px', background: completenessScore === 100 ? '#4ade80' : 'var(--accent-primary, #6366f1)', transition: 'width 300ms' }} />
        </div>
      </div>
      <div style={styles.checklist}>
        {checks.map((c) => (
          <div key={c.label} style={styles.checkItem} aria-label={`${c.label}: ${c.ok ? 'complete' : 'incomplete'}`}>
            <span style={c.ok ? styles.checkOk : styles.checkMuted}>{c.ok ? '\u2713' : '\u2717'}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ChecklistSection;
