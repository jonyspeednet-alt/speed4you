# Hero Carousel & Banner — Architecture

> Last updated: May 2026

This document covers the architecture, state management, and design decisions for the hero section components used on the Speed4You homepage.

---

## Component Overview

The hero section has two components that serve different presentation needs:

| Component | Purpose | Auto-Play | Navigation |
|-----------|---------|-----------|------------|
| `HeroCarousel` | Full-featured carousel with thumbnails, progress bar, keyboard & touch support | 3200ms | Arrows, dots, thumbnails, keyboard, swipe |
| `HeroBanner` | Lightweight banner with basic rotation — used as a simpler fallback | 8000ms | Dots only |

`HeroCarousel` is the primary component used on the homepage. `HeroBanner` is a simpler alternative with fewer visual elements and a slower rotation cycle.

---

## HeroCarousel Architecture

### State Model

The carousel manages four pieces of internal state:

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `activeIndex` | `number` | `0` | Index of the currently displayed slide |
| `progress` | `number` | `0` | Progress percentage (0–100) of the current auto-play cycle |
| `isAutoPlay` | `boolean` | `true` | Whether auto-play is active |
| `isHovering` | `boolean` | `false` | Whether the user is hovering over the carousel |

### Auto-Play Behavior

The carousel uses an interval-based progress tracking system:

```
AUTO_PLAY_DURATION = 3200ms    // Time per slide before advancing
PROGRESS_INTERVAL = 50ms       // How often progress updates
AUTO_PLAY_RESUME_DELAY = 1200ms // Pause after manual interaction
```

**How it works:**
1. A `setInterval` runs every 50ms, incrementing an `elapsed` counter
2. Progress is calculated as `(elapsed / AUTO_PLAY_DURATION) * 100`
3. When `elapsed >= AUTO_PLAY_DURATION`, the slide advances, `elapsed` resets to 0
4. Manual interaction (arrow click, dot click, thumbnail click, keyboard, swipe) pauses auto-play
5. After `AUTO_PLAY_RESUME_DELAY`, auto-play resumes from progress 0

**Note:** The `useCarouselConfig` hook defines `autoPlayDuration: 7000ms` as a default configuration value, but the `HeroCarousel` component currently uses its own hardcoded `AUTO_PLAY_DURATION = 3200ms`. If you need to change the auto-play duration, update the constant in `HeroCarousel.jsx`.

### Navigation Methods

The carousel supports five navigation methods, all routed through a single `moveToSlide(index)` function:

| Method | Trigger | Behavior |
|--------|---------|----------|
| **Arrow buttons** | Click prev/next buttons | Moves to adjacent slide (wraps around) |
| **Dot indicators** | Click dot at bottom | Jumps to specific slide |
| **Thumbnails** | Click thumbnail in "Up next" queue | Jumps to specific slide |
| **Keyboard** | Left/Right arrow keys | Moves to adjacent slide (only when carousel has focus) |
| **Touch/Swipe** | Swipe left/right on mobile | Moves to adjacent slide (minimum 50px threshold) |

All navigation methods:
1. Normalize the index using modular arithmetic (wraps around)
2. Set `activeIndex` to the new index
3. Reset progress to 0
4. Pause auto-play and schedule resume after `AUTO_PLAY_RESUME_DELAY`

### Parallax Effect

On desktop (non-mobile, non-tablet), a scroll-driven parallax effect is applied to the background image:

```javascript
bgRef.current.style.transform = `scale(1.08) translate3d(0, ${y * 0.12}px, 0)`;
```

- Scale: `1.08` (slightly larger than viewport to allow parallax movement)
- Y offset: `scrollY * 0.12` (12% of scroll distance)
- Disabled on mobile and tablet for performance

### Responsive Breakpoints

The carousel adapts its layout across breakpoints using the `useBreakpoint` hook:

| Breakpoint | Hero Height | Layout | Showcase Panel | Navigation |
|------------|-------------|--------|----------------|------------|
| **Desktop** | `clamp(640px, 85vh, 880px)` | 2-column grid (copy + showcase) | Visible (poster + thumbnails) | Arrows + dots |
| **Tablet** | `clamp(540px, 70vh, 680px)` | 2-column grid (narrower) | Visible (280px) | Arrows + dots |
| **Mobile** | `clamp(480px, 65svh, 600px)` | Single column | Hidden | Dots only (no arrows) |
| **TV Mode** | `80vh` | Single column, centered | Hidden | Dots + arrows |

### Data Flow

```
HomePage
  └─ HeroCarousel
       ├── props.content / props.items  →  contentItems[]
       ├── useBreakpoint()              →  isMobile, isTablet
       ├── useTVMode()                  →  isTVMode
       ├── getPreviewItems()            →  previewItems[] (4 thumbnails)
       └── Internal state               →  activeIndex, progress, isAutoPlay, isHovering
```

**Content item shape:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Content identifier |
| `title` | `string` | Display title |
| `description` | `string` | Short description |
| `backdrop` | `string` | Backdrop image URL (used as hero background) |
| `poster` | `string` | Poster image URL (used in showcase panel) |
| `type` | `'movie' \| 'series'` | Content type |
| `genre` | `string` | Primary genre |
| `language` | `string` | Language |
| `year` | `string \| number` | Release year |
| `rating` | `number` | Star rating |
| `isPlaceholder` | `boolean` | If true, shows curated drop instead of play button |

### Visual Layers (Z-Index Stack)

The carousel background is composed of multiple layers for a cinematic look:

1. **Background fill** (`z:0`) — Solid dark fallback color `#050c16`
2. **Background image** (`z:0`) — Backdrop/poster with `scale(1.1)`, saturation & contrast boost
3. **Aurora orbs** (`z:1`) — Two blurred radial gradient circles (cyan & pink) for ambient glow
4. **Backdrop wash** (`z:2`) — Diagonal gradient overlay for text legibility
5. **Overlay** (`z:3`) — Vertical gradient (transparent top → dark bottom)
6. **Bottom fade** (`z:4`) — Fade to page background color

---

## HeroBanner Architecture

`HeroBanner` is a simpler component with:

- Single-column layout (no showcase panel)
- Basic auto-rotation at 8000ms intervals
- Dot navigation only (no arrows, thumbnails, or keyboard support)
- Mobile poster dock (shows poster above copy on mobile)
- Same parallax scroll effect as HeroCarousel

---

## useCarouselConfig Hook

Located at `features/home/hooks/useCarouselConfig.js`, this hook provides customizable carousel configuration. It exports several hooks:

| Hook | Purpose |
|------|---------|
| `useCarouselConfig` | Returns merged config with defaults + overrides |
| `useCarouselState` | Manages activeIndex, progress, isAutoPlay state |
| `useKeyboardNavigation` | Binds arrow keys to next/previous handlers |
| `useSwipeNavigation` | Binds touch events for swipe gestures |
| `useParallaxEffect` | Applies scroll-driven parallax to a ref |
| `useAutoPlay` | Manages auto-play interval with progress tracking |

**Default configuration:**

| Property | Default | Description |
|----------|---------|-------------|
| `autoPlayDuration` | `7000` | Time per slide (ms) — note: HeroCarousel uses its own 3200ms |
| `progressUpdateInterval` | `50` | Progress update frequency (ms) |
| `resumeAutoPlayDelay` | `10000` | Pause after interaction (ms) — note: HeroCarousel uses 1200ms |
| `enableAutoPlay` | `true` | Auto-play on/off |
| `enableKeyboardNavigation` | `true` | Keyboard arrow support |
| `enableTouchSwipe` | `true` | Touch swipe support |
| `enableParallax` | `true` | Parallax scroll effect |
| `swipeThreshold` | `50` | Minimum swipe distance (px) |
| `showProgressBar` | `true` | Show progress indicator |
| `showNavigationArrows` | `true` | Show prev/next arrows |
| `showDots` | `true` | Show dot indicators |
| `showThumbnails` | `true` | Show thumbnail queue |
| `maxThumbnails` | `5` | Maximum thumbnails shown |
| `parallaxStrength` | `0.28` | Parallax scroll multiplier |
| `parallaxScale` | `1.04` | Parallax base scale |
| `transitionDuration` | `300` | Slide transition (ms) |
| `imageAnimationDuration` | `800` | Image animation (ms) |

---

## Performance Considerations

1. **Eager loading** — Hero images use `loading="eager"` and `fetchPriority="high"` since they are above-the-fold
2. **Passive scroll listeners** — Parallax uses `{ passive: true }` to avoid blocking scroll
3. **Interval cleanup** — All intervals and timeouts are cleaned up on unmount
4. **Conditional rendering** — Mobile/tablet skip the showcase panel and parallax effect
5. **CSS containment** — The hero section uses `overflow: hidden` to contain repaints

---

## Testing

The carousel has a test file at `features/home/components/HeroCarousel.test.jsx` covering:
- Rendering with empty content
- Rendering with single and multiple items
- Auto-play advancement
- Manual navigation via dots, arrows, and keyboard
- Touch swipe navigation
- Progress bar behavior

Run tests with:
```bash
cd frontend && npm test -- --grep HeroCarousel
```
