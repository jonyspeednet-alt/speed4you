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
    <span className="top-nav-live-chip" style={{ cursor: 'default' }}>
      <span className="top-nav-live-dot" />
      <span>{count} online</span>
    </span>
  );
}

export default LiveUserBadge;
