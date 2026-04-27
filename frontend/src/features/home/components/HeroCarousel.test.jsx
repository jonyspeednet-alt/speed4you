/**
 * Tests for HeroCarousel component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HeroCarousel from './HeroCarousel';

vi.mock('../../../hooks', () => ({
    useBreakpoint: () => ({
        isMobile: false,
        isTablet: false,
    }),
}));

vi.mock('../../../components/ui/StarRating', () => ({
    default: ({ rating }) => <div data-testid="star-rating">{rating}</div>,
}));

vi.mock('../../../components/ui/WatchlistButton', () => ({
    default: () => <button data-testid="watchlist-button">Add to Watchlist</button>,
}));

const mockContent = [
    {
        id: '1',
        title: 'Test Movie 1',
        description: 'Test description 1',
        genre: 'Action',
        language: 'English',
        year: 2024,
        rating: 8.5,
        type: 'movie',
        backdrop: 'https://via.placeholder.com/1920x1080',
        poster: 'https://via.placeholder.com/400x600',
    },
    {
        id: '2',
        title: 'Test Movie 2',
        description: 'Test description 2',
        genre: 'Drama',
        language: 'English',
        year: 2024,
        rating: 9.0,
        type: 'series',
        backdrop: 'https://via.placeholder.com/1920x1080',
        poster: 'https://via.placeholder.com/400x600',
    },
];

const renderWithRouter = (component) => render(<BrowserRouter>{component}</BrowserRouter>);

describe('HeroCarousel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
    });

    it('displays the first item by default', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        expect(screen.getByText('Test description 1')).toBeInTheDocument();
    });

    it('renders nothing when content is empty', () => {
        const { container } = renderWithRouter(<HeroCarousel content={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when content is not an array', () => {
        const { container } = renderWithRouter(<HeroCarousel content={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('accepts items prop used by the homepage', () => {
        renderWithRouter(<HeroCarousel items={mockContent} />);
        expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
    });

    it('displays carousel dots when multiple items', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        const dots = screen.getAllByRole('button', { name: /Go to slide/ });
        expect(dots.length).toBeGreaterThanOrEqual(mockContent.length);
    });

    it('navigates to next slide on next button click', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        fireEvent.click(screen.getByTitle('Next (right arrow key)'));

        await waitFor(() => {
            expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
        });
    });

    it('navigates to previous slide on previous button click', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        fireEvent.click(screen.getByTitle('Next (right arrow key)'));

        await waitFor(() => {
            expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTitle('Previous (left arrow key)'));

        await waitFor(() => {
            expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
        });
    });

    it('navigates to specific slide on dot click', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        const dots = screen.getAllByRole('button', { name: /Go to slide/ });
        fireEvent.click(dots[dots.length - 1]);

        await waitFor(() => {
            expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
        });
    });

    it('displays correct content type badge', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Movie')).toBeInTheDocument();
    });

    it('displays series type correctly', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        fireEvent.click(screen.getByTitle('Next (right arrow key)'));

        await waitFor(() => {
            expect(screen.getByText('Series')).toBeInTheDocument();
        });
    });

    it('displays rating when available', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByTestId('star-rating')).toBeInTheDocument();
    });

    it('displays watchlist button for non-placeholder content', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByTestId('watchlist-button')).toBeInTheDocument();
    });

    it('handles placeholder content correctly', () => {
        renderWithRouter(<HeroCarousel content={[{ ...mockContent[0], isPlaceholder: true }]} />);
        expect(screen.getByText('Browse Latest')).toBeInTheDocument();
        expect(screen.queryByTestId('watchlist-button')).not.toBeInTheDocument();
    });

    it('displays action buttons', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Play Now')).toBeInTheDocument();
        expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('displays series-specific button text', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        fireEvent.click(screen.getByTitle('Next (right arrow key)'));

        await waitFor(() => {
            expect(screen.getByText('Start Watching')).toBeInTheDocument();
        });
    });

    it('displays content metadata', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Action')).toBeInTheDocument();
        expect(screen.getByText('2024')).toBeInTheDocument();
        expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('handles keyboard navigation', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        fireEvent.keyDown(window, { key: 'ArrowRight' });

        await waitFor(() => {
            expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
        });
    });

    it('handles touch swipe', async () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        const section = screen.getByLabelText('Featured content carousel');

        fireEvent.touchStart(section, { changedTouches: [{ clientX: 100 }] });
        fireEvent.touchEnd(section, { changedTouches: [{ clientX: 30 }] });

        await waitFor(() => {
            expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
        });
    });

    it('renders with single item without navigation dots', () => {
        renderWithRouter(<HeroCarousel content={[mockContent[0]]} />);
        expect(screen.queryAllByRole('button', { name: /Go to slide/ })).toHaveLength(0);
    });

    it('displays images with correct attributes', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        const images = screen.getAllByRole('img');

        images.forEach((image) => {
            expect(image).toHaveAttribute('loading', 'eager');
        });
    });

    it('displays genre chips', () => {
        renderWithRouter(<HeroCarousel content={mockContent} />);
        expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('wraps long titles correctly', () => {
        renderWithRouter(
            <HeroCarousel
                content={[
                    {
                        ...mockContent[0],
                        title: 'This is a very long title that should wrap properly in the carousel',
                    },
                ]}
            />,
        );

        expect(screen.getByText(/This is a very long title/)).toBeInTheDocument();
    });
});
