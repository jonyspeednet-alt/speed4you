import { Link } from 'react-router-dom';
import styles from './ContinueWatchingRail.module.css';
import Skeleton from '../../../components/feedback/Skeleton';
import EmptyState from '../../../components/feedback/EmptyState';

function ContinueWatchingRail({ items, isLoading }) {
  if (isLoading) {
    return <ContinueWatchingRailSkeleton />;
  }

  if (!items || items.length === 0) {
    return (
      <div className={styles.section}>
         <h2 className={styles.title}>Continue Watching</h2>
        <EmptyState message="You haven't started watching anything yet.">
          <p>New to the platform? <Link to="/browse">Browse our library</Link> to get started.</p>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Continue Watching</h2>
      <div className={styles.rail}>
        {items.map((item) => (
          <Link key={item.id} to={`/watch/${item.id}`} className={styles.card}>
            <div className={styles.posterWrapper}>
              <img src={item.poster} alt={item.title} className={styles.poster} loading="lazy" />
              <div className={styles.progressContainer}>
                <div style={{ width: `${item.progress}%` }} className={styles.progressBar} />
              </div>
              <div className={styles.overlay}>
                <div className={styles.playIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={styles.info}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <span className={styles.progressText}>{Math.round(item.progress)}% watched</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


function ContinueWatchingRailSkeleton() {
  return (
    <div className={styles.section}>
      <h2 className={styles.title}><Skeleton width="200px" /></h2>
      <div className={styles.rail}>
        {[...Array(5)].map((_, index) => (
          <div key={index} className={styles.card}>
            <Skeleton style={{ aspectRatio: '16/9', borderRadius: 'var(--radius-lg)'}} />
            <div className={styles.info}>
              <Skeleton width="80%" style={{ marginBottom: 'var(--spacing-xs)' }} />
              <Skeleton width="50%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContinueWatchingRail;
