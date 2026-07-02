function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function ActionBar({ isEditMode, loading, onSave, onSaveAndPublish, onDelete, onRetry, isDirty, hasError, publishedUrl, lastSavedAt, onReset, styles: S }) {
  return (
    <div style={S.actions}>
      <button type="submit" disabled={loading} style={S.secondaryBtn}>
        {loading ? '..' : (isEditMode ? 'Save' : 'Save Draft')}
      </button>
      <button type="button" disabled={loading} onClick={onSaveAndPublish} style={S.submitBtn}>
        {loading ? '..' : (isEditMode ? 'Publish' : 'Save & Pub')}
      </button>
      {isEditMode && (
        <button type="button" disabled={loading} onClick={onDelete} style={S.deleteBtn}>Del</button>
      )}
      {!isEditMode && isDirty && (
        <button type="button" disabled={loading} onClick={onReset} style={S.resetBtn}>Reset</button>
      )}
      {hasError && onRetry && (
        <button type="button" disabled={loading} onClick={onRetry} style={S.retryBtn}>Retry</button>
      )}
      <span style={S.actionsSpacer}>
        {isDirty && !hasError && <span style={{ fontSize: '0.58rem', color: '#f59e0b' }} aria-live="polite">unsaved</span>}
        {!isDirty && lastSavedAt && (
          <span style={{ fontSize: '0.58rem', color: '#4ade80' }}>{formatTimeAgo(lastSavedAt)}</span>
        )}
        {isEditMode && publishedUrl && (
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.58rem', color: ACCENT, textDecoration: 'none' }}>view</a>
        )}
      </span>
    </div>
  );
}

const ACCENT = 'var(--accent-primary, #6366f1)';

export default ActionBar;
