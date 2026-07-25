import { useQuery } from '@tanstack/react-query';
import { contentService } from '../../services';

function LiveUserBadge() {
  const { data } = useQuery({
    queryKey: ['online-count'],
    queryFn: () => contentService.getOnlineCount(),
    refetchInterval: 30000,
    staleTime: 15000,
    gcTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <div style={styles.badge}>
      <span style={styles.dot} />
      <span style={styles.count}>{count}</span>
      <span style={styles.text}>users online</span>
    </div>
  );
}

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '999px',
    background: 'rgba(0, 255, 170, 0.08)',
    border: '1px solid rgba(0, 255, 170, 0.2)',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    whiteSpace: 'nowrap',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#00ffaa',
    boxShadow: '0 0 8px #00ffaa',
    animation: 'livePulse 2s ease-in-out infinite',
    flexShrink: 0,
  },
  count: {
    color: '#00ffaa',
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.78rem',
  },
};

export default LiveUserBadge;
