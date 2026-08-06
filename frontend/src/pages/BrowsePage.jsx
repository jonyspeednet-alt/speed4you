import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { contentService, searchService } from "../services";
import { useBreakpoint, useTVMode } from "../hooks";
import { CardSkeleton } from "../components/feedback/Skeleton";
import ContentCard from "../components/media/ContentCard";

const QUICK_GENRES = [
  "All",
  "Action",
  "Drama",
  "Comedy",
  "Horror",
  "Romance",
  "Thriller",
  "Crime",
];
const QUICK_LANGUAGES = [
  "All",
  "English",
  "Bengali",
  "Hindi",
  "Korean",
  "Japanese",
];
const TRENDING_SEARCHES = [
  "Action",
  "Bangla Dubbed",
  "Korean",
  "Thriller",
  "2025",
  "Crime",
];
const YEAR_OPTIONS = [
  "All",
  "2026",
  "2025",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "Pre-1990s",
];
const PAGE_SIZE = 24;
const posterFallback = `${import.meta.env.BASE_URL}assets/poster-placeholder.svg`;

function normalizeItem(item) {
  return {
    ...item,
    poster: item.poster || posterFallback,
    backdrop: item.backdrop || item.poster || posterFallback,
    year: item.year || "Unknown",
    releasedAt: item.releasedAt || null,
    rating: item.rating || "N/A",
    genre: item.genre || "Uncategorized",
    language: item.language || "Unknown",
    runtime: item.runtime || null,
    metadataStatus: item.metadataStatus || "matched",
  };
}

function normalizeQuery(value, fallback = "All") {
  if (!value || value === "undefined" || value === "null") return fallback;
  return value;
}

function resolveBrowseType(routeType, searchParams) {
  if (routeType) return routeType;
  return normalizeQuery(searchParams.get("type"), "All");
}

function filterParamsMatch(searchParams, nextParams) {
  const current = Object.fromEntries(searchParams.entries());
  const keys = new Set([...Object.keys(current), ...Object.keys(nextParams)]);
  for (const key of keys) {
    if ((current[key] ?? "") !== (nextParams[key] ?? "")) return false;
  }
  return true;
}

function BrowseCard({ item, index, isMobile, isTablet, isTVMode }) {
  return (
    <ContentCard
      item={item}
      index={index}
      compact={isMobile}
      tablet={isTablet}
      tv={isTVMode}
      cardWidth="100%"
      showReviewBadge
    />
  );
}

function BrowsePage({ type }) {
  const { isMobile, isTablet, isSmallMobile } = useBreakpoint();
  const isTVMode = useTVMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGenre, setSelectedGenre] = useState(() =>
    normalizeQuery(searchParams.get("genre")),
  );
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    normalizeQuery(searchParams.get("language")),
  );
  const [sortBy, setSortBy] = useState(() =>
    normalizeQuery(searchParams.get("sort"), "latest"),
  );
  const [selectedCollection, setSelectedCollection] = useState(() =>
    normalizeQuery(searchParams.get("collection")),
  );
  const [selectedType, setSelectedType] = useState(() =>
    resolveBrowseType(type, searchParams),
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    normalizeQuery(searchParams.get("year")),
  );
  const [searchText, setSearchText] = useState(
    () => searchParams.get("q") || "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const loadMoreRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const deferredSearchText = useDeferredValue(searchText);

  const prevTypeRef = useRef(type);
  useEffect(() => {
    if (prevTypeRef.current === type) return;
    prevTypeRef.current = type;
    setSelectedGenre("All");
    setSelectedLanguage("All");
    setSortBy("latest");
    setSelectedCollection("All");
    setSearchText("");
    setSelectedType(type || "All");
    setSelectedYear("All");
  }, [type]);

  // Sync filter state when the URL params change (e.g. back/forward or a
  // same-route navigation like `/browse?q=...` from the search modal).
  useEffect(() => {
    setSelectedGenre(normalizeQuery(searchParams.get("genre")));
    setSelectedLanguage(normalizeQuery(searchParams.get("language")));
    setSortBy(normalizeQuery(searchParams.get("sort"), "latest"));
    setSelectedCollection(normalizeQuery(searchParams.get("collection")));
    setSelectedType(resolveBrowseType(type, searchParams));
    setSelectedYear(normalizeQuery(searchParams.get("year")));
    setSearchText(searchParams.get("q") || "");
  }, [searchParams, type]);

  // Clear type parameter from URL when on dedicated routes
  useEffect(() => {
    if (type && searchParams.has("type")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("type");
      setSearchParams(newParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const nextParams = {};
    if (selectedGenre !== "All") nextParams.genre = selectedGenre;
    if (selectedLanguage !== "All") nextParams.language = selectedLanguage;
    if (sortBy !== "latest") nextParams.sort = sortBy;
    if (selectedCollection !== "All")
      nextParams.collection = selectedCollection;
    // Dedicated /movies and /series routes already encode the content type.
    // Only add type parameter for /browse route
    if (!type && selectedType !== "All") nextParams.type = selectedType;
    if (selectedYear !== "All") nextParams.year = selectedYear;
    if (deferredSearchText.trim()) nextParams.q = deferredSearchText.trim();
    if (!filterParamsMatch(searchParams, nextParams)) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    deferredSearchText,
    searchParams,
    selectedCollection,
    selectedGenre,
    selectedLanguage,
    setSearchParams,
    sortBy,
    selectedType,
    selectedYear,
    type,
  ]);

  const effectiveType = type || (selectedType !== "All" ? selectedType : undefined);

  const params = useMemo(
    () => ({
      type: effectiveType,
      genre: selectedGenre !== "All" ? selectedGenre : undefined,
      language: selectedLanguage !== "All" ? selectedLanguage : undefined,
      collection: selectedCollection !== "All" ? selectedCollection : undefined,
      year: selectedYear !== "All" ? selectedYear : undefined,
      q: deferredSearchText.trim() || undefined,
      sort: sortBy,
      limit: PAGE_SIZE,
    }),
    [
      effectiveType,
      selectedGenre,
      selectedLanguage,
      selectedCollection,
      selectedYear,
      deferredSearchText,
      sortBy,
    ],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["browse", params],
    queryFn: ({ pageParam = 1 }) =>
      contentService.fetchBrowsePage({ pageParam, ...params }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const content = useMemo(
    () =>
      data?.pages.flatMap((page) => page.items || [])?.map(normalizeItem) || [],
    [data],
  );
  const total = data?.pages[0]?.total || 0;

  useEffect(() => {
    let cancelled = false;

    async function fetchSuggestions() {
      const query = deferredSearchText.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const result = await searchService.getSuggestions(query);
        if (!cancelled)
          setSuggestions(
            Array.isArray(result.items) ? result.items.slice(0, 6) : [],
          );
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [deferredSearchText]);

  const collectionOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(content.map((item) => item.collection).filter(Boolean)),
      ),
    ],
    [content],
  );
  const languageOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set([
          ...QUICK_LANGUAGES.slice(1),
          ...content.map((item) => item.language).filter(Boolean),
        ]),
      ),
    ],
    [content],
  );
  const genreOptions = useMemo(() => {
    const dynamicGenres = Array.from(
      new Set(
        content
          .flatMap((item) => String(item.genre || "").split(","))
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
    return [
      "All",
      ...Array.from(new Set([...QUICK_GENRES.slice(1), ...dynamicGenres])),
    ];
  }, [content]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return undefined;
    if (typeof IntersectionObserver !== "function") {
      fetchNextPage();
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const currentType = effectiveType || "All";
  const pageTitle =
    type === "movie"
      ? "Movies"
      : type === "series"
        ? "Series"
        : "Browse";
  const pageDescription =
    type === "movie"
      ? "A sharper movie shelf with stronger filtering, calmer spacing, and better scan rhythm."
      : type === "series"
        ? "Track longer stories with tighter discovery, clearer metadata, and cleaner results."
        : "Explore the full catalog with a redesigned discovery workspace built for speed.";

  const activeFilterCount = [
    selectedGenre !== "All",
    selectedLanguage !== "All",
    selectedCollection !== "All",
    sortBy !== "latest",
    selectedType !== "All" && !type,
    selectedYear !== "All",
  ].filter(Boolean).length;

  function resetFilters() {
    setSelectedGenre("All");
    setSelectedLanguage("All");
    setSelectedCollection("All");
    setSortBy("latest");
    setSearchText("");
    setSelectedType(type || "All");
    setSelectedYear("All");
    setFiltersOpen(false);
  }

  return (
    <div
      style={{
        ...styles.page,
        ...(isTVMode ? styles.pageTV : {}),
        ...(isMobile ? styles.pageMobile : {}),
      }}
    >
      <section
        style={{
          ...styles.hero,
          ...(isMobile ? styles.heroMobile : isTablet ? styles.heroTablet : {}),
        }}
      >
        <div style={styles.heroContent}>
          <div style={styles.heroHeader}>
            <h1 style={styles.heroTitle}>{pageTitle}</h1>
            <div
              style={{
                ...styles.searchBar,
                ...(isMobile ? styles.searchBarMobile : {}),
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={styles.searchIcon}
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by title, genre, year..."
                style={styles.searchInput}
                aria-label="Search titles, genres, and years"
              />
            </div>
          </div>

          <p
            style={{
              ...styles.heroDescription,
              ...(isMobile ? styles.heroDescriptionMobile : {}),
            }}
          >
            {pageDescription}
          </p>

          <div
            style={{
              ...styles.actionsRow,
              ...(isMobile ? styles.actionsRowMobile : {}),
            }}
          >
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              style={styles.filterTrigger}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span style={styles.filterCountBadge}>{activeFilterCount}</span>
              )}
            </button>
            <div
              style={{
                ...styles.chipRow,
                ...(isMobile ? styles.chipRowMobile : {}),
              }}
            >
              {genreOptions.slice(0, 8).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  style={{
                    ...styles.genreChip,
                    ...(selectedGenre === genre ? styles.genreChipActive : {}),
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              ...styles.actionsRow,
              marginTop: "4px",
              ...(isMobile ? styles.actionsRowMobile : {}),
            }}
          >
            <div
              style={{
                ...styles.yearRowLabel,
                ...(isMobile ? styles.yearRowLabelMobile : {}),
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ opacity: 0.8 }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Release Year</span>
            </div>
            <div
              style={{
                ...styles.chipRow,
                ...(isMobile ? styles.chipRowMobile : {}),
              }}
            >
              {YEAR_OPTIONS.map((yearOption) => (
                <button
                  key={yearOption}
                  type="button"
                  onClick={() => setSelectedYear(yearOption)}
                  style={{
                    ...styles.genreChip,
                    ...(selectedYear === yearOption
                      ? styles.genreChipActive
                      : {}),
                  }}
                >
                  {yearOption}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FilterDrawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <h2 style={styles.drawerTitle}>Filters</h2>
        <FilterField
          label="Genre"
          value={selectedGenre}
          onChange={setSelectedGenre}
          options={genreOptions}
        />
        <FilterField
          label="Language"
          value={selectedLanguage}
          onChange={setSelectedLanguage}
          options={languageOptions}
        />
        <FilterField
          label="Sort By"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { label: "Release Date", value: "latest" },
            { label: "Popular", value: "popular" },
            { label: "Trending", value: "trending" },
            { label: "Rating", value: "rating" },
            { label: "Featured", value: "featured" },
          ]}
        />
        <FilterField
          label="Collection"
          value={selectedCollection}
          onChange={setSelectedCollection}
          options={collectionOptions}
        />
        {!type && (
          <FilterField
            label="Content Type"
            value={selectedType}
            onChange={setSelectedType}
            options={["All", "movie", "series"]}
          />
        )}
        <FilterField
          label="Release Year"
          value={selectedYear}
          onChange={setSelectedYear}
          options={YEAR_OPTIONS}
        />
        <div style={styles.filterFooter}>
          <button
            type="button"
            onClick={resetFilters}
            style={styles.resetButton}
          >
            Reset Filters
          </button>
          <span style={styles.filterStatus}>{total} titles visible</span>
        </div>
      </FilterDrawer>

      <section
        style={{
          ...styles.summaryPanel,
          ...(isMobile ? styles.summaryPanelMobile : {}),
        }}
      >
        <div style={styles.summaryText}>
          <span style={styles.summaryLabel}>Results</span>
          <strong style={styles.summaryValue}>
            {isFetching && !isFetchingNextPage
              ? "Refreshing results..."
              : deferredSearchText.trim()
                ? `${total} matches for "${deferredSearchText.trim()}"`
                : `${content.length} visible from ${total} titles`}
          </strong>
        </div>
        <div style={styles.summaryStats}>
          {selectedType !== "All" && (
            <span style={styles.statPill}>{selectedType}</span>
          )}
          {selectedYear !== "All" && (
            <span style={styles.statPill}>{selectedYear}</span>
          )}
          <span style={styles.statPill}>
            {selectedLanguage === "All" ? "All languages" : selectedLanguage}
          </span>
          <span style={styles.statPill}>{sortBy === "latest" ? "Release Date" : sortBy}</span>
        </div>
      </section>

      {isLoading ? (
        <div
          style={{
            ...styles.grid,
            ...(isMobile
              ? styles.gridMobile
              : isTablet
                ? styles.gridTablet
                : {}),
          }}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>Error loading content</h2>
          <p style={styles.emptyText}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => refetch({ cancelRefetch: false })}
            style={styles.resetButton}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div
            className="browse-grid"
            style={{
              ...styles.grid,
              ...(isTVMode ? styles.gridTV : {}),
              ...(isMobile
                ? isSmallMobile
                  ? styles.gridSmallMobile
                  : styles.gridMobile
                : isTablet
                  ? styles.gridTablet
                  : {}),
            }}
          >
            {content.map((item, index) => (
              <BrowseCard
                key={item.id}
                item={item}
                index={index}
                isMobile={isMobile}
                isTablet={isTablet}
                isTVMode={isTVMode}
              />
            ))}
          </div>

          {hasNextPage ? (
            <div ref={loadMoreRef} style={styles.loadMoreWrap}>
              {isFetchingNextPage ? (
                <div style={styles.loader}>Loading more...</div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {!isLoading && !error && content.length === 0 ? (
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>No content matched this selection.</h2>
          <p style={styles.emptyText}>
            Try broader filters, another language, or a simpler search term.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            style={{ ...styles.resetButton, minWidth: 140 }}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterDrawer({ isOpen, onClose, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        style={{
          ...styles.drawerBackdrop,
          ...(isOpen ? styles.drawerBackdropOpen : {}),
        }}
        onClick={onClose}
      />
      <aside style={{ ...styles.drawer, ...(isOpen ? styles.drawerOpen : {}) }}>
        {children}
      </aside>
    </>
  );
}

function FilterField({ label, value, onChange, options }) {
  return (
    <label style={styles.filterField}>
      <span style={styles.filterLabel}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="browse-filter-button"
        style={styles.select}
      >
        {options.map((option) => {
          const optValue = typeof option === "object" ? option.value : option;
          const optLabel = typeof option === "object" ? option.label : option;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "104px 24px var(--spacing-3xl)",
  },
  pageTV: {
    paddingTop: "128px",
    paddingBottom: "120px",
  },
  pageMobile: {
    padding: "84px 12px var(--spacing-2xl)",
  },
  hero: {
    width: "min(1720px, calc(100vw - 96px))",
    margin: "0 auto 16px",
    padding: "24px",
    borderRadius: "34px",
    background: "rgba(13, 26, 45, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
  },
  heroTablet: {
    width: "min(1720px, calc(100vw - 48px))",
  },
  heroMobile: {
    width: "100%",
    padding: "16px",
    borderRadius: "26px",
  },
  heroContent: {
    display: "grid",
    gap: "16px",
    minWidth: 0,
  },
  heroHeader: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: "clamp(2rem, 4vw, 3.2rem)",
    fontWeight: "900",
    letterSpacing: "-0.02em",
  },
  heroDescription: {
    maxWidth: "70ch",
    fontSize: "0.96rem",
    lineHeight: "1.65",
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: "2px",
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  heroDescriptionMobile: {
    width: "min(100%, 32ch)",
    maxWidth: "32ch",
    fontSize: "0.9rem",
    lineHeight: "1.55",
    whiteSpace: "normal",
  },
  searchBar: {
    position: "relative",
    flexGrow: 1,
    maxWidth: 480,
    minHeight: "52px",
    display: "flex",
    alignItems: "center",
    padding: "0 18px 0 48px",
    borderRadius: "14px",
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  searchBarMobile: {
    width: "100%",
    maxWidth: "100%",
    minHeight: "48px",
    padding: "0 14px 0 42px",
    order: 2,
  },
  searchIcon: {
    position: "absolute",
    left: "18px",
    color: "var(--accent-cyan)",
  },
  searchInput: {
    width: "100%",
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "1rem",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  actionsRowMobile: {
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  filterTrigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "46px",
    padding: "0 18px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    fontWeight: "800",
    flexShrink: 0,
  },
  filterCountBadge: {
    display: "grid",
    placeItems: "center",
    minWidth: "20px",
    height: "20px",
    borderRadius: "99px",
    background: "var(--accent-cyan)",
    color: "#050c16",
    fontSize: "0.72rem",
    fontWeight: "900",
    lineHeight: 1,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    overflowX: "auto",
    flexGrow: 1,
    minWidth: 0,
    paddingBottom: "4px",
    scrollbarWidth: "none",
  },
  chipRowMobile: {
    width: "100%",
    flexWrap: "nowrap",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-x",
    paddingBottom: "8px",
    scrollSnapType: "x proximity",
  },
  genreChip: {
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    fontWeight: "800",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  genreChipActive: {
    background:
      "linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-secondary) 100%)",
    color: "#050c16",
    boxShadow: "0 0 15px rgba(0, 255, 255, 0.3)",
  },
  yearRowLabel: {
    fontSize: "0.72rem",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--accent-cyan)",
    opacity: 0.8,
    minWidth: "120px",
    display: "inline-flex",
    alignItems: "center",
    userSelect: "none",
    gap: "6px",
  },
  yearRowLabelMobile: {
    width: "100%",
    minWidth: 0,
  },
  drawerBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 1300,
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 300ms ease",
  },
  drawerBackdropOpen: {
    opacity: 1,
    pointerEvents: "auto",
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "min(420px, 90vw)",
    padding: "24px",
    background: "#0d1a2d",
    borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "-20px 0 50px rgba(0,0,0,0.5)",
    zIndex: 1310,
    transform: "translateX(100%)",
    transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
    display: "grid",
    gap: "16px",
    alignContent: "flex-start",
    overflowY: "auto",
    maxWidth: "100vw",
  },
  drawerOpen: {
    transform: "translateX(0)",
  },
  drawerTitle: {
    fontSize: "1.5rem",
    fontWeight: 800,
    marginBottom: "12px",
  },
  filterField: {
    display: "grid",
    gap: "8px",
  },
  filterLabel: {
    color: "var(--text-muted)",
    fontSize: "0.72rem",
    fontWeight: "800",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  select: {
    minHeight: "48px",
    padding: "0 14px",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.2)",
    color: "var(--text-primary)",
    fontSize: "1rem",
  },
  filterFooter: {
    marginTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  filterStatus: {
    color: "var(--text-muted)",
    fontSize: "0.82rem",
  },
  resetButton: {
    minHeight: "48px",
    padding: "0 24px",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-secondary) 100%)",
    color: "#050c16",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontSize: "0.76rem",
    boxShadow: "0 0 20px rgba(0, 255, 255, 0.25)",
  },
  summaryPanel: {
    width: "min(1720px, calc(100vw - 96px))",
    margin: "0 auto 16px",
    padding: "16px 18px",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  summaryPanelMobile: {
    width: "100%",
    padding: "14px",
    alignItems: "stretch",
  },
  summaryText: {
    display: "grid",
    gap: "4px",
    minWidth: 0,
  },
  summaryLabel: {
    color: "var(--text-muted)",
    fontSize: "0.72rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  },
  summaryValue: {
    color: "var(--text-primary)",
    fontSize: "0.96rem",
  },
  summaryStats: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    minWidth: 0,
  },
  statPill: {
    padding: "9px 12px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "var(--text-secondary)",
    fontSize: "0.76rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    overflowWrap: "anywhere",
  },
  grid: {
    width: "min(1720px, calc(100vw - 96px))",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "18px",
  },
  gridTablet: {
    width: "min(1720px, calc(100vw - 48px))",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "14px",
  },
  gridTV: {
    width: "min(1720px, calc(100vw - 96px))",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "22px",
  },
  gridMobile: {
    width: "100%",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  gridSmallMobile: {
    width: "100%",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },
  loadMoreWrap: {
    width: "min(1720px, calc(100vw - 96px))",
    minHeight: "56px",
    margin: "22px auto 0",
    display: "grid",
    placeItems: "center",
  },
  loader: {
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  emptyState: {
    width: "min(900px, calc(100vw - 48px))",
    margin: "0 auto",
    padding: "48px 24px",
    borderRadius: "32px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    textAlign: "center",
  },
  emptyTitle: {
    marginBottom: "10px",
    color: "var(--text-primary)",
  },
  emptyText: {
    marginBottom: "18px",
  },
};

export default BrowsePage;
