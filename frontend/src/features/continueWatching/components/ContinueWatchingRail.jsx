import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ContinueWatchingRail.module.css';
import Skeleton from '../../../components/feedback/Skeleton';
import EmptyState from '../../../components/feedback/EmptyState';

function ContinueWatchingRail({ items, isLoading }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(maxLeft > 5 && el.scrollLeft < maxLeft - 5);
  }, []);

  const scheduleUpdate = useCallback(() => {
    window.requestAnimationFrame(updateScrollIndicators);
  }, [updateScrollIndicators]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollIndicators, { passive: true });
    scheduleUpdate();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollIndicators);
      ro?.disconnect();
    };
  }, [updateScrollIndicators, scheduleUpdate]);

  const scroll = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = 16;
    const firstCard = el.querySelector('[data-cw-card]');
    const cardW = firstCard?.getBoundingClientRect?.().width || 260;
    const dist = Math.max(200, Math.min(cardW + gap, el.clientWidth * 0.78));
    el.scrollBy({ left: dir === 'left' ? -dist : dist, behavior: 'smooth' });
    setTimeout(scheduleUpdate, 200);
  }, [scheduleUpdate]);

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
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Continue Watching</h2>
        <div className={styles.scrollControls}>
          <button
            type="button"
            aria-label="Scroll continue watching left"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`${styles.scrollBtn} ${!canScrollLeft ? styles.scrollBtnDisabled : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll continue watching right"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`${styles.scrollBtn} ${!canScrollRight ? styles.scrollBtnDisabled : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.rail} ref={scrollRef}>
        {items.map((item) => {
          const isSeries = item.contentType === 'series' || item.type === 'series';
          const pct = item.duration > 0
            ? Math.min(100, Math.max(0, (item.position / item.duration) * 100))
            : (Number(item.progress) || 0);
          return (
            <Link key={item.id} to={`/play/${isSeries ? 'series' : 'movie'}/${item.id}`} className={styles.card} data-cw-card>
              <div className={styles.posterWrapper}>
                <img src={item.poster?.includes('image.tmdb.org/t/p/') ? item.poster.replace(/\/t\/p\/[^/]+\//, '/t/p/w342/') : item.poster} alt={item.title} className={styles.poster} loading="lazy" />
                <div className={styles.progressContainer}>
                  <div style={{ width: `${pct}%` }} className={styles.progressBar} />
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
                <span className={styles.progressText}>{Math.round(pct)}% watched</span>
              </div>
            </Link>
          );
        })}
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
