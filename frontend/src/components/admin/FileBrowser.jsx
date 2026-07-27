import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services';

function formatSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

function titleFromFilename(name) {
  const cleaned = name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bS\d{2}E\d+\b.*$/i, '')
    .replace(/\bS\d{2}\b.*$/i, '')
    .replace(/.*?\b(?:E\d+)\b.*$/i, '')
    .replace(/\b\d{3,4}p\b/gi, '')
    .replace(/\b(?:WEB-DL|WEBRip|BluRay|HDTV|HDRip|DVDRip|x264|x265|h264|h265|AAC|DD5[.]1|DDP5[.]1|AC3)\b/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || name;
}

function FileBrowser({ rootId, currentPath, onSelectFile, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (path) => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.browseRoot(rootId, path);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => { load(currentPath || ''); }, [load, currentPath]);

  const enterDir = (dirPath) => {
    setLoading(true);
    load(dirPath);
  };

  const goUp = () => {
    if (!data || !data.currentPath) return;
    const parts = data.currentPath.split('/').filter(Boolean);
    parts.pop();
    load(parts.join('/'));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1e293b', borderRadius: '8px', padding: '16px', minWidth: '500px',
        maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        color: '#e2e8f0', fontSize: '0.7rem',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong>{data?.root?.label || rootId}</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '6px', wordBreak: 'break-all' }}>
          {data?.root?.scanPath || ''}
          {data?.currentPath ? `/${data.currentPath}` : ''}
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <button onClick={() => load('')} style={styles.navBtn} disabled={!data?.currentPath}>Root</button>
          <button onClick={goUp} style={styles.navBtn} disabled={!data?.currentPath}>..</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading...</div>}
          {error && <div style={{ textAlign: 'center', padding: '20px', color: '#f87171' }}>{error}</div>}
          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={styles.th}>Name</th>
                  <th style={{ ...styles.th, width: '80px' }}>Size</th>
                  <th style={{ ...styles.th, width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(data?.dirs || []).map((dir) => (
                  <tr key={dir.path} style={styles.row} onClick={() => enterDir(dir.path)}>
                    <td style={styles.td}><span style={{ color: '#60a5fa' }}>📁</span> {dir.name}</td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}><button style={styles.selBtn} onClick={(e) => { e.stopPropagation(); enterDir(dir.path); }}>Open</button></td>
                  </tr>
                ))}
                {(data?.files || []).map((file) => (
                  <tr key={file.path} style={styles.row}>
                    <td style={styles.td}>
                      <span style={{ color: file.isVideo ? '#4ade80' : '#94a3b8' }}>{file.isVideo ? '🎬' : '📄'}</span> {file.name}
                    </td>
                    <td style={styles.td}>{formatSize(file.size)}</td>
                    <td style={styles.td}>
                      {file.isVideo && (
                        <button style={styles.selBtn} onClick={() => onSelectFile(file, data)}>Pick</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && !data?.dirs?.length && !data?.files?.length && (
                  <tr><td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: '20px' }}>Empty directory</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  navBtn: {
    background: '#334155', border: 'none', color: '#cbd5e1', padding: '3px 10px',
    borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem',
  },
  th: {
    textAlign: 'left', padding: '4px 6px', fontSize: '0.6rem', color: '#94a3b8',
    fontWeight: 600, position: 'sticky', top: 0, background: '#1e293b',
  },
  td: { padding: '3px 6px', borderBottom: '1px solid #1e293b', fontSize: '0.65rem' },
  row: { cursor: 'pointer' },
  selBtn: {
    background: '#059669', border: 'none', color: 'white', padding: '2px 8px',
    borderRadius: '3px', cursor: 'pointer', fontSize: '0.6rem',
  },
};

export { titleFromFilename };
export default FileBrowser;
