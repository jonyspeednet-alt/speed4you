import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBreakpoint, useTVMode } from '../../../hooks';
import StarRating from '../../../components/ui/StarRating';
import WatchlistButton from '../../../components/ui/WatchlistButton';
import styles from './HeroCarousel.module.css';

const AUTO_PLAY_DURATION = 3200;
const AUTO_PLAY_RESUME_DELAY = 1200;

function normalizeCarouselItem(item) {
    if (!item) return null;
    return {
        ...item,
        title: item.title || 'Featured Spotlight',
        description: item.description || 'Freshly highlighted content.',
        backdrop: item.backdrop || item.poster || null,
        poster: item.poster || null,
        genre: item.genre || '',
        language: item.language || item.originalLanguage || 'Mixed',
        year: item.year || '',
        rating: item.rating || null,
        type: item.type || 'movie',
        isPlaceholder: item.isPlaceholder || false,
    };
}

function HeroCarousel({ content, items }) {
    const rawItems = Array.isArray(content) ? content : Array.isArray(items) ? items : [];
    const contentItems = rawItems.map(normalizeCarouselItem).filter(Boolean);
    const { isMobile, isTablet } = useBreakpoint();
    const isTVMode = useTVMode();
    const sectionRef = useRef(null);
    const bgRef = useRef(null);
    const resumeTimerRef = useRef(null);
    const touchStartRef = useRef(0);

    const [activeIndex, setActiveIndex] = useState(0);
    const [backdropVisible, setBackdropVisible] = useState(true);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const slideTimerRef = useRef(null);

    useEffect(() => () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    }, []);

    // Reset index if content items change
    useEffect(() => {
        setActiveIndex(prev => Math.min(prev, contentItems.length - 1 || 0));
    }, [contentItems.length]);

    // Reset backdrop visibility for crossfade on src change
    useEffect(() => {
        setBackdropVisible(false);
    }, [contentItems[activeIndex]?.backdrop]);

    const moveToSlide = useCallback((index) => {
        if (contentItems.length === 0) return;
        const normalizedIndex = (index + contentItems.length) % contentItems.length;
        setActiveIndex(normalizedIndex);

        if (isPaused) return;

        setIsAutoPlay(false);
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => setIsAutoPlay(true), AUTO_PLAY_RESUME_DELAY);
    }, [contentItems.length, isPaused]);

    const handleTogglePause = useCallback(() => {
        setIsPaused((prev) => {
            if (prev) {
                setIsAutoPlay(true);
            }
            return !prev;
        });
    }, []);

    useEffect(() => {
        if (!isAutoPlay || contentItems.length <= 1 || isPaused) {
            if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
            return;
        }

        slideTimerRef.current = setTimeout(() => {
            moveToSlide(activeIndex + 1);
        }, AUTO_PLAY_DURATION);

        return () => {
            if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
        };
    }, [isAutoPlay, contentItems.length, activeIndex, moveToSlide, isPaused]);

    // Parallax scroll effect for the background
    useEffect(() => {
        if (isMobile || isTablet) return;

        const handleScroll = () => {
            if (!bgRef.current) return;
            const y = window.scrollY;
            bgRef.current.style.transform = `scale(1.08) translateY(${y * 0.12}px)`;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobile, isTablet]);

    // Keyboard navigation (desktop arrows only; remote spatial nav should manage TV mode)
    useEffect(() => {
        if (isTVMode) return undefined;

        const handleKeyDown = (event) => {
            if (contentItems.length <= 1) return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveToSlide(activeIndex - 1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveToSlide(activeIndex + 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, contentItems.length, moveToSlide, isTVMode]);

    // Touch swipe navigation
    const handleTouchStart = (event) => {
        touchStartRef.current = event.changedTouches[0].clientX;
    };

    const handleTouchEnd = (event) => {
        const touchEnd = event.changedTouches[0].clientX;
        const delta = touchStartRef.current - touchEnd;
        if (Math.abs(delta) > 50) {
            moveToSlide(activeIndex + (delta > 0 ? 1 : -1));
        }
    };

    if (!contentItems.length) return null;

    const activeItem = contentItems[activeIndex] || {};
    const {
        id, title = 'Featured Spotlight', description = 'Freshly highlighted content.',
        backdrop, poster, type, genre, language, year, rating, isPlaceholder
    } = activeItem;

    const isSeries = type === 'series';
    const eyebrow = isPlaceholder ? 'CURATED DROP' : (isSeries ? 'SERIES SPOTLIGHT' : 'MOVIE PREMIERE');
    // Handle genre as string or array, deduplicate, limit count
    const genreChips = Array.isArray(genre)
        ? genre.filter(Boolean)
        : typeof genre === 'string'
            ? genre.split(',').map(g => g.trim()).filter(Boolean)
            : [];
    const heroChips = [...genreChips, language, year].filter(Boolean).slice(0, 4);

    const insightItems = [
        { label: 'Format', value: isPlaceholder ? 'Spotlight' : (isSeries ? 'Series' : 'Movie') },
        { label: 'Rating', value: rating || 'N/A', isRating: true },
        { label: 'Language', value: language || 'Mixed' },
    ];

    const getAriaLabel = (item, index) => `${item.title || 'Untitled'} - Slide ${index + 1} of ${contentItems.length}`;

    const previewItems = Array.from({ length: Math.min(4, contentItems.length) }, (_, offset) => {
        const index = (activeIndex + offset) % contentItems.length;
        return { item: contentItems[index], index };
    });
    
    const heroClasses = [
        styles.hero,
        isTVMode ? styles.heroTv : ''
    ].join(' ');

    return (
        <section
            ref={sectionRef}
            className={heroClasses}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-roledescription="carousel"
            aria-label="Featured content"
        >
            <div className={styles.background}>
                <div className={styles.bgFallback} />
                {backdrop ? (
                    <img
                        ref={bgRef}
                        src={backdrop.includes('image.tmdb.org') ? backdrop.replace(/\/t\/p\/[^/]+\//, '/t/p/w1280/') : backdrop}
                        srcSet={backdrop.includes('image.tmdb.org') ? backdrop.replace(/\/t\/p\/[^/]+\//, '/t/p/w780/') + ' 780w, ' + backdrop.replace(/\/t\/p\/[^/]+\//, '/t/p/w1280/') + ' 1280w' : undefined}
                        alt={title}
                        className={`${styles.bgImage} ${backdropVisible ? styles.bgImageVisible : ''}`}
                        loading="eager" fetchPriority="high" decoding="async" sizes="100vw"
                        onLoad={() => setBackdropVisible(true)}
                    />
                ) : null}
                <div className={`${styles.auroraOrb} ${styles.orb1}`} />
                <div className={`${styles.auroraOrb} ${styles.orb2}`} />
                <div className={styles.backdropWash} />
                <div className={styles.overlay} />
                <div className={styles.bottomFade} />
            </div>

            <div className={`${styles.layout} ${isTVMode ? styles.layoutTv : ''}`}>
                <div className={`${styles.copyPanel} ${isTVMode ? styles.copyPanelTv : ''}`}>
                    <div className={styles.kickerRow}>
                        <span className={styles.liveBadge}>{eyebrow}</span>
                        {type && <span className={styles.genre}>{isSeries ? 'Series' : 'Movie'}</span>}
                    </div>

                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.description}>{description}</p>

                    <div className={styles.chipRow}>
                        {heroChips.map((chip) => <span key={chip} className={styles.heroChip}>{chip}</span>)}
                    </div>

                    <div className={styles.metricRow}>
                        {insightItems.map((item) => (
                            <div key={item.label} className={styles.metricStat}>
                                <span className={styles.metricLabel}>{item.label}</span>
                                {item.isRating && rating ? (
                                    <StarRating rating={rating} size="sm" showNumber />
                                ) : (
                                    <strong className={styles.metricValue}>{item.value}</strong>
                                )}
                            </div>
                        ))}
                    </div>

                    {contentItems.length > 1 && (
                        <div className={styles.dotsRow}>
                            {contentItems.slice(0, 12).map((item, i) => (
                                <button
                                    key={item.id || i}
                                    onClick={() => moveToSlide(i)}
                                    className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                                    aria-label={`Go to slide ${i + 1}: ${item.title || 'Untitled'}`}
                                    type="button"
                                />
                            ))}
                            {contentItems.length > 12 ? (
                                <span className={styles.dotsMore}>+{contentItems.length - 12}</span>
                            ) : null}
                        </div>
                    )}

                    <div className={styles.actions}>
                        {!isPlaceholder && id ? (
                            <>
                                <Link
                                    to={isSeries ? `/series/${id}` : `/movies/${id}`}
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                >
                                    <span className={styles.buttonIcon}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </span>
                                    Watch Now
                                </Link>
                                <WatchlistButton
                                    contentType={isSeries ? 'series' : 'movie'}
                                    contentId={id}
                                    title={title}
                                />
                            </>
                        ) : (
                            <Link
                                to="/browse"
                                className={`${styles.button} ${styles.buttonPrimary}`}
                            >
                                <span className={styles.buttonIcon}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                                    </svg>
                                </span>
                                Browse Library
                            </Link>
                        )}
                    </div>
                </div>

                {!isTVMode && (
                    <div className={styles.showcasePanel}>
                        <div className={styles.posterFrame}>
                            {poster ? (
                                <img src={poster?.includes('image.tmdb.org/t/p/') ? poster.replace(/\/t\/p\/[^/]+\//, '/t/p/w342/') : poster} alt={title} className={styles.posterImage} loading="eager" fetchPriority="high" decoding="async" />
                            ) : (
                                <div className={styles.posterPlaceholder} />
                            )}
                            <div className={styles.posterShine} />
                        </div>
                        <div className={styles.queueCard}>
                            <div className={styles.queueHeader}>
                                <span className={styles.queueLabel}>Up next</span>
                            </div>
                            <div className={styles.thumbnailRow}>
                                {previewItems.map(({ item, index }) => (
                                    <button
                                        key={item.id || index}
                                        onClick={() => moveToSlide(index)}
                                        className={`${styles.thumbnailItem} ${index === activeIndex ? styles.thumbnailActive : ''}`}
                                        aria-label={getAriaLabel(item, index)}
                                        aria-current={index === activeIndex}
                                    >
                                        {item.poster ? <img src={item.poster?.includes('image.tmdb.org/t/p/') ? item.poster.replace(/\/t\/p\/[^/]+\//, '/t/p/w185/') : item.poster} alt={item.title} className={styles.thumbnailImage} loading="lazy" decoding="async" /> : <div className={styles.thumbnailPlaceholder} />}
                                        <div className={styles.thumbnailOverlay} />
                                        <span className={styles.thumbnailTitle}>{item.title || 'Featured item'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {contentItems.length > 1 && (
                <>
                    {!isMobile && !isTVMode && (
                        <>
                            <button
                                onClick={() => moveToSlide(activeIndex - 1)}
                                className={styles.navArrowLeft}
                                style={{ opacity: isHovering ? 1 : 0 }}
                                aria-label="Previous slide"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button
                                onClick={() => moveToSlide(activeIndex + 1)}
                                className={styles.navArrowRight}
                                style={{ opacity: isHovering ? 1 : 0 }}
                                aria-label="Next slide"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </>
                    )}
                    {isTVMode && !isMobile && (
                       <div className={styles.navigationArrows} style={{ opacity: isHovering || isTVMode ? 1 : 0 }}>
                            <button onClick={() => moveToSlide(activeIndex - 1)} className={styles.arrowBtn} aria-label="Previous slide">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                            </button>
                            <button onClick={() => moveToSlide(activeIndex + 1)} className={styles.arrowBtn} aria-label="Next slide">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                        </div>
                    )}

                    <div className={`${styles.progressBarContainer} ${isPaused ? styles.progressBarPaused : ''}`}>
                        <div className={styles.progressBar} style={{ animationDuration: `${AUTO_PLAY_DURATION}ms`, animationPlayState: isAutoPlay && !isPaused ? 'running' : 'paused' }} />
                        <div className={styles.progressControls}>
                            <button
                                onClick={handleTogglePause}
                                className={styles.pauseBtn}
                                aria-label={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
                                type="button"
                            >
                                {isPaused ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <rect x="6" y="4" width="4" height="16" />
                                        <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                )}
                            </button>
                            <span className={styles.slideCounter}>{activeIndex + 1} / {contentItems.length}</span>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

export default HeroCarousel;
