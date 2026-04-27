/**
 * Example usage of HeroCarousel with customization
 * This file demonstrates various ways to use and customize the carousel
 */

import HeroCarousel from './HeroCarousel';

/**
 * Basic Example - Default configuration
 */
export function BasicHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'The Last Kingdom',
            description: 'A historical drama series following the journey of a Saxon warrior.',
            genre: 'Drama',
            language: 'English',
            year: 2024,
            rating: 8.5,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=The+Last+Kingdom',
            poster: 'https://via.placeholder.com/400x600?text=The+Last+Kingdom',
        },
        {
            id: '2',
            title: 'Cosmic Adventure',
            description: 'An epic space exploration film with stunning visuals.',
            genre: 'Sci-Fi',
            language: 'English',
            year: 2024,
            rating: 9.0,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Cosmic+Adventure',
            poster: 'https://via.placeholder.com/400x600?text=Cosmic+Adventure',
        },
        {
            id: '3',
            title: 'Mystery Manor',
            description: 'A thrilling mystery series set in an old English manor.',
            genre: 'Mystery',
            language: 'English',
            year: 2024,
            rating: 8.2,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Mystery+Manor',
            poster: 'https://via.placeholder.com/400x600?text=Mystery+Manor',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

/**
 * Advanced Example - With custom styling wrapper
 */
export function AdvancedHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'Premium Content',
            description: 'Experience premium entertainment with our exclusive collection.',
            genre: 'Premium',
            language: 'Multi',
            year: 2024,
            rating: 9.5,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Premium',
            poster: 'https://via.placeholder.com/400x600?text=Premium',
        },
        {
            id: '2',
            title: 'New Releases',
            description: 'Check out the latest releases from around the world.',
            genre: 'Various',
            language: 'Multi',
            year: 2024,
            rating: 8.8,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=New+Releases',
            poster: 'https://via.placeholder.com/400x600?text=New+Releases',
        },
    ];

    return (
        <div style={{ position: 'relative', zIndex: 1 }}>
            <HeroCarousel content={heroContent} />
        </div>
    );
}

/**
 * Minimal Example - Single item (no carousel)
 */
export function MinimalHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'Featured Tonight',
            description: 'Your featured content for tonight.',
            genre: 'Featured',
            language: 'English',
            year: 2024,
            rating: 8.5,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Featured',
            poster: 'https://via.placeholder.com/400x600?text=Featured',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

/**
 * Placeholder Example - For loading states
 */
export function PlaceholderHeroCarousel() {
    const heroContent = [
        {
            id: 'placeholder-1',
            title: 'Explore Our Collection',
            description: 'Browse through our extensive library of content.',
            genre: 'Browse',
            language: 'All',
            year: 2024,
            rating: 0,
            type: 'movie',
            isPlaceholder: true,
            backdrop: 'https://via.placeholder.com/1920x1080?text=Browse',
            poster: 'https://via.placeholder.com/400x600?text=Browse',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

/**
 * Multi-language Example
 */
export function MultiLanguageHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'আমাদের সংগ্রহ',
            description: 'আমাদের বিস্তৃত সংগ্রহ থেকে আপনার পছন্দের কন্টেন্ট খুঁজে নিন।',
            genre: 'নাটক',
            language: 'বাংলা',
            year: 2024,
            rating: 8.5,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Bengali',
            poster: 'https://via.placeholder.com/400x600?text=Bengali',
        },
        {
            id: '2',
            title: 'আমাদের নতুন রিলিজ',
            description: 'সর্বশেষ এবং সবচেয়ে জনপ্রিয় কন্টেন্ট দেখুন।',
            genre: 'অ্যাকশন',
            language: 'বাংলা',
            year: 2024,
            rating: 9.0,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Bengali+Action',
            poster: 'https://via.placeholder.com/400x600?text=Bengali+Action',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

/**
 * High-Rating Example - Premium content showcase
 */
export function PremiumHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'Award-Winning Series',
            description: 'Critically acclaimed series that won multiple international awards.',
            genre: 'Drama',
            language: 'English',
            year: 2024,
            rating: 9.8,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Award+Winning',
            poster: 'https://via.placeholder.com/400x600?text=Award+Winning',
        },
        {
            id: '2',
            title: 'Masterpiece Film',
            description: 'A cinematic masterpiece that redefined the genre.',
            genre: 'Drama',
            language: 'English',
            year: 2024,
            rating: 9.7,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Masterpiece',
            poster: 'https://via.placeholder.com/400x600?text=Masterpiece',
        },
        {
            id: '3',
            title: 'Epic Adventure',
            description: 'An epic adventure that captivated audiences worldwide.',
            genre: 'Adventure',
            language: 'English',
            year: 2024,
            rating: 9.6,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Epic+Adventure',
            poster: 'https://via.placeholder.com/400x600?text=Epic+Adventure',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

/**
 * Mixed Content Example - Movies and Series
 */
export function MixedContentHeroCarousel() {
    const heroContent = [
        {
            id: '1',
            title: 'Movie Night',
            description: 'A thrilling movie perfect for movie night.',
            genre: 'Thriller',
            language: 'English',
            year: 2024,
            rating: 8.3,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Movie+Night',
            poster: 'https://via.placeholder.com/400x600?text=Movie+Night',
        },
        {
            id: '2',
            title: 'Binge-Worthy Series',
            description: 'A series that will keep you hooked for hours.',
            genre: 'Drama',
            language: 'English',
            year: 2024,
            rating: 8.9,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Binge+Worthy',
            poster: 'https://via.placeholder.com/400x600?text=Binge+Worthy',
        },
        {
            id: '3',
            title: 'Action Packed',
            description: 'Non-stop action and adventure.',
            genre: 'Action',
            language: 'English',
            year: 2024,
            rating: 8.6,
            type: 'movie',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Action+Packed',
            poster: 'https://via.placeholder.com/400x600?text=Action+Packed',
        },
        {
            id: '4',
            title: 'Comedy Series',
            description: 'Laugh out loud with this hilarious series.',
            genre: 'Comedy',
            language: 'English',
            year: 2024,
            rating: 8.4,
            type: 'series',
            backdrop: 'https://via.placeholder.com/1920x1080?text=Comedy+Series',
            poster: 'https://via.placeholder.com/400x600?text=Comedy+Series',
        },
    ];

    return <HeroCarousel content={heroContent} />;
}

export default BasicHeroCarousel;
