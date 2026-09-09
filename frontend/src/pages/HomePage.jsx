import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentService } from '../services';
import ContentCard from '../components/media/ContentCard';
import { useRecentlyViewed } from '../hooks';

function CategorySection({ title, subtitle, items, viewAllLink, eager = false, themeClass = 'theme-cyan', icon }) {
  if (!items || items.length === 0) return null;
  const displayItems = items.slice(0, 6);

  return (
    <section className={`catalog-section ${themeClass}`}>
      <div className="catalog-section-heading">
        <div>
          <h2>
            {icon && <span className="section-title-icon">{icon}</span>}
            {title}
          </h2>
          {subtitle && <p className="catalog-section-subtitle">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="catalog-view-all">
            View all <span>&rarr;</span>
          </Link>
        )}
      </div>
      <div className="catalog-grid">
        {displayItems.map((item, index) => (
          <ContentCard key={item.id} item={item} eager={eager && index < 6} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { items: recentlyViewed } = useRecentlyViewed();

  const { data: homepageData, isLoading, error, refetch } = useQuery({
    queryKey: ['homepage-content'],
    queryFn: () => contentService.getHomepage(18),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    document.title = 'Speed4You — Stream Movies, Series & Live TV';
  }, []);

  const content = homepageData || {};

  return (
    <div className="homepage-wrapper">
      {/* Recently Viewed */}
      {recentlyViewed && recentlyViewed.length > 0 && (
        <CategorySection
          title="Recently Viewed"
          subtitle="Continue watching from where you left off"
          items={recentlyViewed}
          themeClass="theme-violet"
          icon="🕒"
          eager
        />
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="catalog-section theme-cyan">
          <div className="catalog-section-heading">
            <h2>Latest Releases</h2>
          </div>
          <div className="catalog-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="catalog-placeholder" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="catalog-message" role="alert">
          <p>Could not load homepage content. Please try again.</p>
          <button type="button" className="catalog-button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {/* Latest Releases */}
      <CategorySection
        title="Latest Releases"
        subtitle="Recently added movies & series"
        items={content.latest}
        viewAllLink="/browse?sort=latest"
        themeClass="theme-cyan"
        icon="✨"
        eager
      />

      {/* Trending / Popular */}
      <CategorySection
        title="Trending & Popular"
        subtitle="Most watched titles this week"
        items={content.popular || content.trending}
        viewAllLink="/browse?sort=popular"
        themeClass="theme-magenta"
        icon="🔥"
      />

      {/* Movies */}
      <CategorySection
        title="Movies"
        subtitle="Feature films and blockbusters"
        items={content.movies}
        viewAllLink="/movies"
        themeClass="theme-blue"
        icon="🎬"
      />

      {/* Series */}
      <CategorySection
        title="Series"
        subtitle="Binge-worthy shows and episodes"
        items={content.series}
        viewAllLink="/series"
        themeClass="theme-purple"
        icon="📺"
      />

      {/* Action Hits */}
      <CategorySection
        title="Action Hits"
        subtitle="High-octane thrillers and adventures"
        items={content.action}
        viewAllLink="/browse?genre=Action"
        themeClass="theme-orange"
        icon="⚡"
      />

      {/* Comedy Spotlight */}
      <CategorySection
        title="Comedy Spotlight"
        subtitle="Laughs and lighthearted entertainment"
        items={content.comedy}
        viewAllLink="/browse?genre=Comedy"
        themeClass="theme-amber"
        icon="😄"
      />

      {/* Thriller Zone */}
      <CategorySection
        title="Thriller Zone"
        subtitle="Edge-of-your-seat suspense"
        items={content.thriller}
        viewAllLink="/browse?genre=Thriller"
        themeClass="theme-crimson"
        icon="🎯"
      />

      {/* Horror Hits */}
      <CategorySection
        title="Horror Hits"
        subtitle="Chills and spooky tales"
        items={content.horror}
        viewAllLink="/browse?genre=Horror"
        themeClass="theme-red"
        icon="👻"
      />

      {/* Drama Central */}
      <CategorySection
        title="Drama Central"
        subtitle="Captivating stories and emotions"
        items={content.drama}
        viewAllLink="/browse?genre=Drama"
        themeClass="theme-rose"
        icon="🎭"
      />

      {/* Hindi Picks */}
      <CategorySection
        title="Hindi Picks"
        subtitle="Bollywood and Hindi dubbed hits"
        items={content.hindi}
        viewAllLink="/browse?language=Hindi"
        themeClass="theme-gold"
        icon="🇮🇳"
      />

      {/* English Picks */}
      <CategorySection
        title="English Picks"
        subtitle="Hollywood and international cinema"
        items={content.english}
        viewAllLink="/browse?language=English"
        themeClass="theme-indigo"
        icon="🍿"
      />

      {/* Bengali Picks */}
      <CategorySection
        title="Bengali Picks"
        subtitle="Local cinema and regional favorites"
        items={content.bengali}
        viewAllLink="/browse?language=Bengali"
        themeClass="theme-emerald"
        icon="🇧🇩"
      />
    </div>
  );
}
