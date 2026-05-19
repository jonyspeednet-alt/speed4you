import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBreakpoint, useTVMode } from '../../../hooks';
import StarRating from '../../../components/ui/StarRating';
import WatchlistButton from '../../../components/ui/WatchlistButton';
import styles from './HeroCarousel.module.css'; // Import CSS module

const AUTO_PLAY_DURATION = 3200;
const MAX_VISIBLE_DOTS = 9;

// Returns the slice of dot indices to show in the sliding window
function getDotWindow(total, active, maxVisible) {
    if (total <= maxVisible) return { start: 0, end: total, showStartEllipsis: false, showEndEllipsis: false };
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, active - half);
    let end = start + maxVisible;
    if (end > total) {
        end = total;
        start = Math.max(0, end - maxVisible);
    }
    return {
        start,
        end,
        showStartEllipsis: start > 0,
        showEndEllipsis: end < total,
    };
}
const AUTO_PLAY_RESUME_DELAY = 1200;
const PROGRESS_INTERVAL = 50;

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
    const progressIntervalRef = useRef(null);
    const touchStartRef = useRef(0);

    const [activeIndex, setActiveIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [isHovering, setIsHovering] = useState(false);

    // Stop autoplay timer when component unmounts
    useEffect(() => () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }, []);

    // Reset index if content items change
    useEffect(() => {
        setActiveIndex(prev => Math.min(prev, contentItems.length - 1 || 0));
    }, [contentItems.length]);

    // Function to move to a specific slide
    const moveToSlide = useCallback((index) => {
        if (contentItems.length === 0) return;
        const normalizedIndex = (index + contentItems.length) % contentItems.length;
        setActiveIndex(normalizedIndex);
        setProgress(0);

        // Pause and resume autoplay
        setIsAutoPlay(false);
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => setIsAutoPlay(true), AUTO_PLAY_RESUME_DELAY);
    }, [contentItems.length]);

    // Autoplay logic
    useEffect(() => {
        if (!isAutoPlay || contentItems.length <= 1) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            return;
        }

        let elapsed = 0;
        progressIntervalRef.current = setInterval(() => {
            elapsed += PROGRESS_INTERVAL;
            setProgress(Math.min((elapsed / AUTO_PLAY_DURATION) * 100, 100));

            if (elapsed >= AUTO_PLAY_DURATION) {
                moveToSlide(activeIndex + 1);
            }
        }, PROGRESS_INTERVAL);

        return () => clearInterval(progressIntervalRef.current);
    }, [isAutoPlay, contentItems.length, activeIndex, moveToSlide]);

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

    // Keyboard navigation
    useEffect(() => {
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
    }, [activeIndex, contentItems.length, moveToSlide]);

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
                        key={activeIndex} // Force re-render for transition
                        src={backdrop}
                        alt={title}
                        className={styles.bgImage}
                        loading="eager" fetchPriority="high" decoding="async" sizes="100vw"
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

                    <div className={styles.actions}>
                        <Link className={`${styles.button} ${styles.buttonPrimary}`} to={isPlaceholder ? '/browse?sort=latest' : `/watch/${id}`}>
                            <svg className={styles.buttonIcon} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                {isPlaceholder ? <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" /> : <path d="M8 5v14l11-7z" />}
                            </svg>
                            <span>{isPlaceholder ? 'Browse Latest' : (isSeries ? 'Start Watching' : 'Play Now')}</span>
                        </Link>
                        <Link className={`${styles.button} ${styles.buttonSecondary}`} to={isPlaceholder ? '/search' : (isSeries ? `/series/${id}` : `/movies/${id}`)}>
                            <svg className={styles.buttonIcon} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                            </svg>
                            <span>{isPlaceholder ? 'Search Portal' : 'Details'}</span>
                        </Link>
                        {!isPlaceholder && (
                            <WatchlistButton contentType={isSeries ? 'series' : 'movie'} contentId={id} title={title} />
                        )}
                    </div>
                </div>

                {!isMobile && !isTVMode && (
                    <div className={styles.showcasePanel}>
                        <div className={styles.posterFrame}>
                            {poster ? (
                                <img src={poster} alt={title} className={styles.posterImage} loading="eager" fetchPriority="high" decoding="async" />
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
                                        {item.poster ? <img src={item.poster} alt={item.title} className={styles.thumbnailImage} loading="lazy" decoding="async" /> : <div className={styles.thumbnailPlaceholder} />}
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

                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                    </div>

                    <div className={styles.carouselDots}>
                        {(() => {
                            const { start, end, showStartEllipsis, showEndEllipsis } = getDotWindow(contentItems.length, activeIndex, MAX_VISIBLE_DOTS);
                            return (
                                <>
                                    {showStartEllipsis && <span className={styles.dotEllipsis}>…</span>}
                                    {contentItems.slice(start, end).map((_, i) => {
                                        const index = start + i;
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => moveToSlide(index)}
                                                className={index === activeIndex ? styles.dotActive : styles.dot}
                                                aria-label={`Go to slide ${index + 1}`}
                                                aria-current={index === activeIndex}
                                            />
                                        );
                                    })}
                                    {showEndEllipsis && <span className={styles.dotEllipsis}>…</span>}
                                    {contentItems.length > MAX_VISIBLE_DOTS && (
                                        <span className={styles.slideCounter}>{activeIndex + 1}&thinsp;/&thinsp;{contentItems.length}</span>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </>
            )}
        </section>
    );
}

export default HeroCarousel;
