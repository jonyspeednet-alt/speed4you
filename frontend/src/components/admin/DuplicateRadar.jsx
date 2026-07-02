import { Link } from 'react-router-dom';

function DuplicateRadar({ duplicateCandidates, styles }) {
  return (
    <section style={styles.section}>
      <span style={styles.sectionEyebrow}>Duplicate Radar</span>
      {duplicateCandidates.length ? (
        <div style={styles.duplicateList}>
          {duplicateCandidates.map((candidate) => (
            <Link key={candidate.id} to={`/admin/content/${candidate.id}/edit`} style={styles.duplicateCard}>
              <strong>{candidate.title}</strong>
              <span>{candidate.status} | {candidate.sourceType}</span>
              <small>{candidate.sourcePath || 'No source path'}</small>
            </Link>
          ))}
        </div>
      ) : (
        <div style={styles.okBox}>No duplicate title candidates found.</div>
      )}
    </section>
  );
}

export default DuplicateRadar;
