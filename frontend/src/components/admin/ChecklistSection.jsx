function ChecklistSection({ formData, itemMeta, completenessScore, styles: S }) {
  const checks = [
    { label: 'T', ok: formData.title },
    { label: 'D', ok: formData.description },
    { label: 'V', ok: formData.videoUrl },
    { label: 'P', ok: formData.poster },
    { label: 'B', ok: formData.backdrop },
    { label: 'M', ok: itemMeta?.metadataStatus === 'matched' },
  ];

  return (
    <div style={S.checklist}>
      <span style={{ fontSize: '0.56rem', color: TEXT2, whiteSpace: 'nowrap', fontWeight: '600' }}>{completenessScore}%</span>
      <div style={S.checklistBar}>
        <div style={{ ...S.checklistFill, width: `${completenessScore}%`, background: completenessScore === 100 ? '#4ade80' : ACCENT }} />
      </div>
      {checks.map((c) => (
        <span key={c.label} style={{ ...S.checkItem, ...(c.ok ? S.checkOk : S.checkMuted) }}
          title={`${c.label === 'T' ? 'Title' : c.label === 'D' ? 'Desc' : c.label === 'V' ? 'Video' : c.label === 'P' ? 'Poster' : c.label === 'B' ? 'Banner' : 'Meta'}: ${c.ok ? 'ok' : 'missing'}`}>
          {c.ok ? '\u2713' : '\u2717'}
        </span>
      ))}
    </div>
  );
}

const ACCENT = 'var(--accent-primary, #6366f1)';
const TEXT2 = 'var(--text-2, #94a3b8)';

export default ChecklistSection;
