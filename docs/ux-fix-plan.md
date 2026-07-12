# Homepage UX Fix Plan

## Priority Legend
- **P0** — Critical (accessibility, broken UX)
- **P1** — High (noticeable UX issues)
- **P2** — Medium (polish improvements)
- **P3** — Low (nice-to-have)

---

## Phase 1: Accessibility & Critical Fixes (P0)

### 1.1 HeroCarousel — Pause/Play Button
- **File:** `frontend/src/features/home/components/HeroCarousel.jsx`
- **What:** Add a visible pause/play toggle button for auto-rotating carousel (WCAG requirement)
- **How:** New `isPaused` state, toggle button in progress bar area, pause on user interaction

### 1.2 HeroCarousel — Mobile Slide Indicators
- **File:** `frontend/src/features/home/components/HeroCarousel.jsx`
- **What:** Add dot indicators on mobile since "Up next" thumbnails are hidden
- **How:** Dot row below the title on mobile, show active/total count

### 1.3 HomePage — Empty State
- **File:** `frontend/src/pages/HomePage.jsx`
- **What:** When content loads with zero items, show a helpful empty state instead of blank page
- **How:** Check if all content arrays are empty, render EmptyState with browse CTA

### 1.4 ContentRail — Keyboard Navigation
- **File:** `frontend/src/features/home/components/ContentRail.jsx`
- **What:** Enable left/right arrow key scrolling when rail is focused
- **How:** Add `tabIndex`, `onKeyDown` handler for arrow keys

### 1.5 TrendingBento — < 5 Items Fallback
- **File:** `frontend/src/features/home/components/TrendingBento.jsx`
- **What:** Don't return null on desktop when < 5 items — fall back to ContentRail
- **How:** Return ContentRail style layout instead of null

### 1.6 ContentCard — Focus-visible Overlay
- **File:** `frontend/src/components/media/ContentCard.jsx`
- **What:** Show play overlay on keyboard focus, not just hover
- **How:** Track focus state via `:focus-visible` CSS or `onFocus`/`onBlur`

### 1.7 ContentRail — "Open shelf" → "View All"
- **File:** `frontend/src/features/home/components/ContentRail.jsx`
- **What:** Change confusing "Open shelf" label to "View All"
- **How:** Simple string change

---

## Phase 2: UX Polish (P1)

### 2.1 HeroCarousel — Mobile Swipe Hint
- **File:** `frontend/src/features/home/components/HeroCarousel.jsx` + CSS
- **What:** Subtle visual cue that carousel is swipeable on mobile
- **How:** Add a "Swipe →" or fade hint on first load

### 2.2 Cross-rail Deduplication
- **File:** `frontend/src/pages/HomePage.jsx`
- **What:** Remove duplicate items across different rails
- **How:** Pass an accumulated `seenIds` set through `buildRail()` calls

### 2.3 Page Title
- **File:** `frontend/src/pages/HomePage.jsx`
- **What:** Set document title dynamically
- **How:** `useEffect` to set `document.title`

### 2.4 ContentRail — "New" Badge
- **File:** `frontend/src/features/home/components/ContentRail.jsx` or `ContentCard.jsx`
- **What:** Show "New" indicator on recently added items
- **How:** Check `releasedAt` against current date, pass `isNew` prop to ContentCard

### 2.5 TrendingBento — Mobile Layout
- **File:** `frontend/src/features/home/components/TrendingBento.jsx`
- **What:** Show a mini bento-like grid instead of simple horizontal scroll on mobile
- **How:** 2-column grid layout for mobile

### 2.6 Back to Top Button
- **File:** `frontend/src/components/ui/BackToTop.jsx` (new)
- **What:** Floating button to scroll back to top
- **How:** New component, show after scrolling past hero

### 2.7 ContentRail — Drag-to-scroll
- **File:** `frontend/src/features/home/components/ContentRail.jsx`
- **What:** Allow click-drag scrolling on desktop
- **How:** Add mousedown/mousemove/mouseup handlers for drag scroll

---

## Phase 3: Enhancements (P2)

### 3.1 Cache TTL & Invalidation
- **File:** `frontend/src/pages/HomePage.jsx`
- **What:** Reduce cache TTL to 30 min; invalidate on login/logout
- **How:** Listen to auth state changes in cache check

### 3.2 HeroCarousel — Backdrop Fade Transition
- **File:** `frontend/src/features/home/components/HeroCarousel.jsx` + CSS
- **What:** Crossfade between backdrop images instead of hard cut
- **How:** Use two overlapping `<img>` elements with opacity transition

### 3.3 Broken Image Fallback
- **File:** `frontend/src/components/media/ContentCard.jsx`
- **What:** Show placeholder if image load fails
- **How:** `onError` handler to set fallback image

### 3.4 Guest User CTA
- **File:** `frontend/src/pages/HomePage.jsx`
- **What:** Show subtle login prompt for unlogged users after content rails
- **How:** Conditional `GuestPrompt` component if no token

---

## File Change Summary

| File | Changes |
|------|---------|
| `frontend/src/pages/HomePage.jsx` | Empty state, dedup, page title, cache TTL, guest CTA |
| `frontend/src/features/home/components/HeroCarousel.jsx` | Pause button, mobile dots, swipe hint, backdrop fade |
| `frontend/src/features/home/components/HeroCarousel.module.css` | Pause button, dots, swipe hint styles |
| `frontend/src/features/home/components/ContentRail.jsx` | Keyboard nav, "View All", drag-to-scroll |
| `frontend/src/features/home/components/TrendingBento.jsx` | < 5 fallback, mobile grid |
| `frontend/src/components/media/ContentCard.jsx` | Focus overlay, new badge, broken image |
| `frontend/src/components/ui/BackToTop.jsx` | New file |

---

## Implementation Order
1. Phase 1 (P0) — all 7 items
2. Phase 2 (P1) — all 7 items  
3. Phase 3 (P2) — all 4 items
