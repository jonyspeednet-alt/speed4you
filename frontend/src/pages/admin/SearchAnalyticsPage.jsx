import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';

export default function SearchAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminService.getSearchAnalytics(),
    refetchInterval: 30000,
  });

  const topSearches = data?.topSearches || [];
  const zeroResults = data?.zeroResults || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: TEXT, margin: 0, letterSpacing: '-0.03em' }}>Search Analytics</h1>
        <p style={{ fontSize: '0.88rem', color: TEXT3, margin: '4px 0 0 0' }}>Popular searches and failed queries across the portal</p>
      </div>

      {isLoading ? (
        <div style={{ color: TEXT3, padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : (
        <>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: '0 0 16px 0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Top Searches
            </h3>
            {topSearches.length === 0 ? (
              <div style={{ color: TEXT3, textAlign: 'center', padding: '20px' }}>No search data yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE2 }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Query</th>
                    <th style={thStyle}>Count</th>
                    <th style={thStyle}>Avg Results</th>
                  </tr>
                </thead>
                <tbody>
                  {topSearches.map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: TEXT }}>{s.query}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{s.count}</td>
                      <td style={tdStyle}>{s.resultsCount ?? '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: '0 0 16px 0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              Zero-Result Queries
            </h3>
            {zeroResults.length === 0 ? (
              <div style={{ color: TEXT3, textAlign: 'center', padding: '20px' }}>No failed searches. \ud83c\udf89</div>
            ) : (
              <>
                <div style={{ fontSize: '0.8rem', color: TEXT3, marginBottom: '12px' }}>
                  These queries returned no results \u2014 consider adding matching content or fixing typos.
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE2 }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Query</th>
                      <th style={thStyle}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeroResults.map((s, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: '600', color: TEXT }}>{s.query}</td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: TEXT3, textAlign: 'center' }}>
            Data refreshes automatically every 30 seconds. Only analytics from the admin JWT user are tracked.
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700',
  color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.06em',
};

const tdStyle = {
  padding: '14px 16px', color: TEXT2, fontSize: '0.85rem',
};
