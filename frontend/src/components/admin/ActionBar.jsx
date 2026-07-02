function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function ActionBar({ isEditMode, loading, onSave, onSaveAndPublish, onDelete, onRetry, isDirty, hasError, publishedUrl, lastSavedAt, onReset, styles }) {
  return (
    <div style={styles.actions}>
      <button type="submit" disabled={loading} style={styles.secondaryBtn}>
        {loading ? 'Saving...' : (isEditMode ? 'Save Draft' : 'Save as Draft')}
      </button>
      <button type="button" disabled={loading} onClick={onSaveAndPublish} style={styles.submitBtn}>
        {loading ? 'Working...' : (isEditMode ? 'Update & Publish' : 'Save & Publish')}
      </button>
      {isEditMode && (
        <button type="button" disabled={loading} onClick={onDelete} style={styles.deleteBtn}>
          {loading ? 'Working...' : 'Delete'}
        </button>
      )}
      {!isEditMode && isDirty && (
        <button type="button" disabled={loading} onClick={onReset} style={styles.resetBtn}>
          Reset
        </button>
      )}
      {hasError && onRetry && (
        <button type="button" disabled={loading} onClick={onRetry} style={styles.retryBtn}>
          Retry
        </button>
      )}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isDirty && !hasError && <span style={{ fontSize: '0.65rem', color: '#f59e0b' }} aria-live="polite">Unsaved changes</span>}
        {!isDirty && lastSavedAt && (
          <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>Saved {formatTimeAgo(lastSavedAt)}</span>
        )}
        {isEditMode && publishedUrl && (
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent-primary, #6366f1)', textDecoration: 'none' }}>
            View on site
          </a>
        )}
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3, #475569)' }}>Ctrl+S</span>
      </span>
    </div>
  );
}

export default ActionBar;
