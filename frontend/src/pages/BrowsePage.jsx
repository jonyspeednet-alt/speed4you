import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { contentService } from '../services';
import ContentCard from '../components/media/ContentCard';

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'];
const LANGUAGES = ['Bengali', 'Hindi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Korean', 'Japanese', 'Chinese'];

function Filter({ label, value, options, onChange }) {
  const values = options.map(option => typeof option === 'string' ? { value: option, label: option } : option);
  if (value && !values.some(option => option.value === value)) values.push({ value, label: value });
  return (
    <label className="catalog-filter">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {values.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function BrowsePage({ type, home = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchText, setSearchText] = useState(query);
  useEffect(() => { setSearchText(query); }, [query]);

  // The URL is the single source of truth, including browser back/forward.
  const params = {};
  for (const key of ['q', 'genre', 'language', 'sort', 'year', 'collection', 'type']) {
    const value = searchParams.get(key);
    if (value && !['All', 'undefined', 'null'].includes(value)) params[key] = value;
  }
  if (type) params.type = type;
  params.sort = params.sort || 'latest';

  const { data, isLoading, isFetching, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['simple-catalog', params],
    queryFn: ({ pageParam = 1 }) => contentService.fetchBrowsePage({ ...params, pageParam }),
    initialPageParam: 1,
    getNextPageParam: lastPage => lastPage.nextPage,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const items = [];
  const seen = new Set();
  for (const page of data?.pages || []) {
    for (const item of page.items) {
      if (!item?.id || seen.has(String(item.id))) continue;
      seen.add(String(item.id));
      items.push(item);
    }
  }
  const total = data?.pages[0]?.total || 0;
  const title = type === 'movie' ? 'Movies' : type === 'series' ? 'Series' : home ? 'Movies & series' : 'Browse all titles';
  useEffect(() => { document.title = (home ? 'Home' : title) + ' — Speed4You'; }, [home, title]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (type) next.delete('type');
    setSearchParams(next);
  }

  function resetFilters() {
    setSearchText('');
    setSearchParams({});
  }

  const hasFilters = ['q', 'genre', 'language', 'year', 'collection', 'type'].some(key => params[key] && !(key === 'type' && type)) || params.sort !== 'latest';
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  return (
    <div className="catalog-page">
      <div className="catalog-header-row">
        <div>
          <h1>{title}</h1>
          <p className="catalog-status" role="status">
            {isLoading ? 'Loading titles…' : isFetching && !isFetchingNextPage ? 'Updating…' : `${items.length} of ${total} titles${query ? ` for “${query}”` : ''}`}
          </p>
        </div>
        <button
          type="button"
          className="catalog-mobile-filter-btn"
          onClick={() => setMobileFilterOpen(prev => !prev)}
          aria-expanded={mobileFilterOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {mobileFilterOpen ? 'Hide Filters' : 'Filters'}
          {hasFilters && <span className="catalog-filter-dot" />}
        </button>
      </div>

      <div className="catalog-layout">
        <aside className={`catalog-sidebar ${mobileFilterOpen ? 'catalog-sidebar-open' : ''}`}>
          <div className="catalog-sidebar-title">
            <span>Filter & Search</span>
            {hasFilters && (
              <button type="button" className="catalog-reset" onClick={resetFilters}>
                Clear
              </button>
            )}
          </div>

          <form
            className="catalog-search"
            role="search"
            onSubmit={event => {
              event.preventDefault();
              updateFilter('q', searchText.trim());
              setMobileFilterOpen(false);
            }}
          >
            <label className="sr-only" htmlFor="catalog-query">Search movies and series</label>
            <input
              id="catalog-query"
              type="search"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder="Search..."
            />
            <button className="catalog-button" type="submit">Go</button>
          </form>

          <div className="catalog-filters">
            <Filter
              label="Sort by"
              value={params.sort}
              options={[
                { value: 'latest', label: 'Release date' },
                { value: 'popular', label: 'Most watched' },
                { value: 'rating', label: 'Top rated' }
              ]}
              onChange={value => updateFilter('sort', value)}
            />
            <Filter
              label="Language"
              value={params.language || ''}
              options={[{ value: '', label: 'All languages' }, ...LANGUAGES]}
              onChange={value => updateFilter('language', value)}
            />
            <Filter
              label="Genre"
              value={params.genre || ''}
              options={[{ value: '', label: 'All genres' }, ...GENRES]}
              onChange={value => updateFilter('genre', value)}
            />
            <Filter
              label="Year"
              value={params.year || ''}
              options={[{ value: '', label: 'All years' }, ...Array.from({ length: 30 }, (_, index) => String(new Date().getFullYear() - index))]}
              onChange={value => updateFilter('year', value)}
            />
          </div>

          {hasFilters && (
            <button type="button" className="catalog-reset-btn" onClick={resetFilters}>
              Reset all filters
            </button>
          )}
        </aside>

        <section className="catalog-main">
          {isLoading && (
            <div className="catalog-grid" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => <div key={i} className="catalog-placeholder" />)}
            </div>
          )}
          {items.length > 0 && (
            <div className="catalog-grid">
              {items.map((item, index) => <ContentCard key={item.id} item={item} eager={index < 6} />)}
            </div>
          )}
          {error && (
            <div className="catalog-message" role="alert">
              <p>Could not load {items.length ? 'more titles' : 'titles'}. Please try again.</p>
              <button type="button" className="catalog-button" onClick={() => items.length ? fetchNextPage() : refetch()}>Try again</button>
            </div>
          )}
          {!isLoading && !error && items.length === 0 && (
            <div className="catalog-message">
              <p>No titles found.</p>
              {hasFilters && <button type="button" className="catalog-button" onClick={resetFilters}>Clear filters</button>}
            </div>
          )}
          {hasNextPage && !error && (
            <div className="catalog-more">
              <button
                type="button"
                className="catalog-button"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
