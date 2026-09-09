import { Link } from 'react-router-dom';

const fallback = `${import.meta.env.BASE_URL}assets/poster-placeholder.svg`;

export default function ContentCard({ item, type, eager = false, cardWidth }) {
  const isSeries = type === 'series' || item.type === 'series';
  const poster = (item.poster || fallback).replace(/(image\.tmdb\.org\/t\/p\/)[^/]+\//, '$1w342/');
  const rating = item.rating || item.voteAverage || item.imdbRating;
  const numRating = rating ? Number(rating).toFixed(1) : null;

  return (
    <article className="catalog-card" style={cardWidth ? { width: cardWidth, maxWidth: '100%' } : undefined}>
      <Link to={`/${isSeries ? 'series' : 'movies'}/${item.id}`} className="catalog-card-link">
        <div className="catalog-poster">
          <img src={poster} alt="" width="342" height="513" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={event => { if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback; }} />
          
          {/* Top badges */}
          <div className="catalog-poster-badges">
            {isSeries && <span className="badge-series">Series</span>}
            {numRating && Number(numRating) > 0 && (
              <span className="badge-rating">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffd166" stroke="#ffd166"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {numRating}
              </span>
            )}
            {item.quality && <span className="badge-quality">{item.quality}</span>}
          </div>
        </div>
        <h3>{item.title}</h3>
        <div className="catalog-card-meta">
          {item.year && item.year !== 'Unknown' && <span className="meta-tag meta-year">{item.year}</span>}
          <span className={`meta-tag ${isSeries ? 'meta-series' : 'meta-movie'}`}>{isSeries ? 'Series' : 'Movie'}</span>
          {item.language && item.language !== 'Unknown' && <span className="meta-tag meta-lang">{item.language}</span>}
        </div>
      </Link>
    </article>
  );
}
