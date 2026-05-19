# Hero Carousel — Usage Guide

> Quick reference for integrating and customizing the HeroCarousel component.

---

## Quick Start

```jsx
import HeroCarousel from './features/home/components/HeroCarousel';

function MyPage() {
  const featuredContent = [
    {
      id: '1',
      title: 'Inception',
      description: 'A thief who steals corporate ***REMOVED***s through dream-sharing technology.',
      backdrop: '/images/inception-backdrop.jpg',
      poster: '/images/inception-poster.jpg',
      type: 'movie',
      genre: 'Sci-Fi',
      language: 'English',
      year: 2010,
      rating: 8.8,
    },
    // ... more items
  ];

  return <HeroCarousel content={featuredContent} />;
}
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `Array<ContentItem>` | `[]` | Array of content items to display. Alias: `items` |
| `items` | `Array<ContentItem>` | `[]` | Alternative to `content` — same array |

### ContentItem Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique content identifier |
| `title` | `string` | No | Display title (fallback: "Featured spotlight") |
| `description` | `string` | No | Short description (fallback: "Freshly highlighted content from your portal.") |
| `backdrop` | `string` | No | Backdrop image URL — used as hero background |
| `poster` | `string` | No | Poster image URL — used in showcase panel and thumbnails |
| `type` | `'movie' \| 'series'` | No | Content type — affects eyebrow text and button labels |
| `genre` | `string` | No | Genre label displayed in kicker row and chip row |
| `language` | `string` | No | Language displayed in chip row and metrics |
| `year` | `string \| number` | No | Year displayed in kicker row |
| `rating` | `number` | No | Star rating (1-10) — shown with StarRating component |
| `isPlaceholder` | `boolean` | No | If true, shows "Browse Latest" instead of "Play Now" |

---

## Keyboard Shortcuts

| Key | Action | Condition |
|-----|--------|-----------|
| `ArrowLeft` | Previous slide | Carousel section has focus or body is focused |
| `ArrowRight` | Next slide | Carousel section has focus or body is focused |

---

## Auto-Play Behavior

| Constant | Value | Description |
|----------|-------|-------------|
| `AUTO_PLAY_DURATION` | `3200ms` | Time each slide is displayed before auto-advancing |
| `AUTO_PLAY_RESUME_DELAY` | `1200ms` | Pause duration after any manual interaction |
| `PROGRESS_INTERVAL` | `50ms` | How often the progress bar updates |

- Auto-play starts immediately when the carousel loads with 2+ items
- Any manual interaction (click, swipe, keyboard) pauses auto-play temporarily
- Auto-play resumes after `AUTO_PLAY_RESUME_DELAY`
- Hovering does NOT pause auto-play (only manual navigation does)

---

## Responsive Behavior

| Breakpoint | Layout | Showcase | Navigation |
|------------|--------|----------|------------|
| Desktop (>= 1024px) | 2-column: copy panel + showcase panel | Poster + "Up next" thumbnails | Arrows + dots |
| Tablet (768-1023px) | 2-column: narrower | Poster + thumbnails (280px) | Arrows + dots |
| Mobile (< 768px) | Single column: copy only | Hidden | Dots only |
| TV Mode | Single column: centered copy | Hidden | Arrows + dots |

---

## Visual Elements

### Copy Panel (Left Side)
- **Eyebrow badge** — Shows "MOVIE PREMIERE", "SERIES SPOTLIGHT", or "CURATED DROP"
- **Title** — Large, bold text with text-shadow
- **Description** — Truncated to 3 lines (2 on mobile)
- **Chip row** — Genre, language, year as pill badges
- **Metric row** — Format, Rating (with star component), Language in stat cards
- **Action buttons** — Primary (Play/Browse) + Secondary (Details/Search) + Watchlist

### Showcase Panel (Right Side, Desktop/Tablet Only)
- **Poster frame** — Large poster image with shine overlay
- **Queue card** — "Up next" label with 4 thumbnail previews of upcoming slides

### Navigation
- **Arrow buttons** — Top-right, semi-transparent with backdrop blur
- **Progress bar** — Bottom, gradient fill (cyan to secondary accent)
- **Dot indicators** — Bottom center, active dot is elongated with glow

---

## Customization

### Changing Auto-Play Duration

Edit the constant in `HeroCarousel.jsx`:

```javascript
const AUTO_PLAY_DURATION = 5000; // Change from 3200ms to 5000ms
```

### Using the Config Hook

The `useCarouselConfig` hook provides a customizable configuration system. While `HeroCarousel` currently uses hardcoded constants, the hook is available for future enhancements:

```jsx
import { useCarouselConfig, useCarouselState, useKeyboardNavigation } from '../hooks/useCarouselConfig';

function CustomCarousel({ items }) {
  const config = useCarouselConfig({
    autoPlayDuration: 5000,
    enableParallax: false,
    maxThumbnails: 3,
  });

  const { activeIndex, handleNext, handlePrevious } = useCarouselState(items, config);
  useKeyboardNavigation(config.enableKeyboardNavigation, handleNext, handlePrevious);

  // ... custom rendering
}
```

### CSS Custom Properties

The carousel uses these CSS variables that you can override:

| Variable | Usage |
|----------|-------|
| `--accent-cyan` | Primary accent (progress bar, thumbnails, badges) |
| `--accent-pink` | Secondary accent (eyebrow badge border, aurora orb) |
| `--accent-secondary` | Gradient endpoint (progress bar, play button) |
| `--bg-primary` | Background color (#050c16) |
| `--text-primary` | Primary text color |
| `--text-muted` | Muted label text |
| `--nav-occupied-desktop` | Top offset for navigation bar |

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Images not loading | Missing `backdrop` or `poster` URLs | Ensure content items have valid image URLs |
| Carousel not rotating | Only 1 item or `isAutoPlay` is false | Carousel requires 2+ items for auto-play |
| Parallax janky on mobile | Parallax is computationally expensive | Parallax is auto-disabled on mobile/tablet |
| Keyboard not responding | Focus is inside an input or modal | Keyboard only works when carousel section or body has focus |
| Thumbnails not showing | On mobile or TV mode | Showcase panel is hidden on mobile and TV mode by design |
| Progress bar stuck | Auto-play was paused by interaction | Resumes after 1200ms delay |

---

## File Locations

| File | Path |
|------|------|
| HeroCarousel component | `frontend/src/features/home/components/HeroCarousel.jsx` |
| HeroBanner component | `frontend/src/features/home/components/HeroBanner.jsx` |
| Carousel config hooks | `frontend/src/features/home/hooks/useCarouselConfig.js` |
| Carousel tests | `frontend/src/features/home/components/HeroCarousel.test.jsx` |
| Architecture doc | `frontend/src/features/home/ARCHITECTURE.md` |
