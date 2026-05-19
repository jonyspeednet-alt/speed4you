# 📱 Comprehensive Responsive Design Guide

> Complete responsive design system for Mobile, Tablet, Desktop, TV, and 4K displays

## 📊 Table of Contents

1. [Breakpoints & Screen Sizes](#breakpoints--screen-sizes)
2. [Hooks & Utilities](#hooks--utilities)
3. [Components](#components)
4. [CSS Classes](#css-classes)
5. [TV Mode](#tv-mode)
6. [Best Practices](#best-practices)
7. [Testing Guide](#testing-guide)

---

## Breakpoints & Screen Sizes

### Standard Breakpoints

| Device | Range | CSS | Hook |
|--------|-------|-----|------|
| **Extra Small Phone** | < 480px | `@media (max-width: 479px)` | `isExtraSmall` |
| **Small Phone** | 480-639px | `@media (min-width: 480px) and (max-width: 639px)` | `isSmall` |
| **Mobile** | < 768px | `@media (max-width: 767px)` | `isMobile` |
| **Tablet** | 768-1023px | `@media (min-width: 768px) and (max-width: 1023px)` | `isTablet` |
| **Small Desktop** | 1024-1439px | `@media (min-width: 1024px) and (max-width: 1439px)` | `isSmallDesktop` |
| **Desktop** | 1440-1599px | `@media (min-width: 1440px) and (max-width: 1599px)` | `isDesktop`, `isLargeDesktop` |
| **TV** | 1600-2499px | `@media (min-width: 1600px) and (max-width: 2499px)` | `isTV` |
| **4K TV** | 2500px+ | `@media (min-width: 2500px)` | `is4K` |

---

## Hooks & Utilities

### useResponsive Hook

Complete hook for responsive information:

```javascript
import { useResponsive } from '@/hooks';

function MyComponent() {
  const {
    // Breakpoint checks
    width,
    height,
    isExtraSmall,
    isSmall,
    isMobile,
    isTablet,
    isDesktop,
    isTV,
    is4K,

    // Classifications
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isXLargeScreen,

    // Device info
    isTouchDevice,
    isPortrait,
    isLandscape,

    // Responsive values
    containerSize,    // 'extra-small' | 'small' | 'mobile' | ...
    gridCols,         // 1-6 columns
    spacingMultiplier, // 0.75-2.2
    fontMultiplier,   // 0.875-1.7
    touchTarget,      // 40-64px

    // Utility methods
    getContainerWidth,
    getPadding,
    getGap,
    getFontSize,
    getGridTemplate,
  } = useResponsive();

  return (
    <div style={{
      maxWidth: getContainerWidth(),
      padding: getPadding(1.5).all,
      gap: getGap(1),
    }}>
      {/* Your responsive content */}
    </div>
  );
}
```

### Other Responsive Hooks

```javascript
import {
  useMediaQuery,        // Custom media query
  useIsMobile,         // Boolean: is mobile?
  useIsTablet,         // Boolean: is tablet?
  useIsDesktop,        // Boolean: is desktop?
  useIsTV,             // Boolean: is TV?
  useScreenSize,       // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
} from '@/hooks';

// Example
const isMobile = useIsMobile();
const matches = useMediaQuery('(max-width: 768px)');
```

---

## Components

### ResponsiveGrid

Auto-adjusting grid component:

```javascript
import { ResponsiveGrid } from '@/components/ui/ResponsiveLayout';

<ResponsiveGrid
  cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 5 }}
  gap="md"
  minColWidth={280}
>
  <div>Item 1</div>
  <div>Item 2</div>
  {/* ... */}
</ResponsiveGrid>
```

### ResponsiveContainer

Wraps content with responsive padding and max-width:

```javascript
import { ResponsiveContainer } from '@/components/ui/ResponsiveLayout';

<ResponsiveContainer
  maxWidth="lg"    // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding="md"     // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
>
  Your content
</ResponsiveContainer>
```

### ResponsiveFlex

Flexible layout with responsive direction:

```javascript
import { ResponsiveFlex } from '@/components/ui/ResponsiveLayout';

<ResponsiveFlex
  direction={{ xs: 'column', lg: 'row' }}
  gap="md"
  align="center"
  justify="space-between"
>
  <div>Left</div>
  <div>Right</div>
</ResponsiveFlex>
```

### ResponsiveStack

Vertical stack with responsive spacing:

```javascript
import { ResponsiveStack } from '@/components/ui/ResponsiveLayout';

<ResponsiveStack
  spacing="lg"
  divide={true}
>
  <div>Item 1</div>
  <div>Item 2</div>
</ResponsiveStack>
```

### ResponsiveImage

Optimized responsive images:

```javascript
import ResponsiveImage from '@/components/media/ResponsiveImage';

<ResponsiveImage
  src="image.jpg"
  srcWebP="image.webp"
  alt="Description"
  objectFit="cover"
  aspectRatio="16 / 9"
  lazy={true}
  quality="auto"
/>
```

### ResponsiveVideo

Adaptive video playback:

```javascript
import { ResponsiveVideo } from '@/components/media/ResponsiveImage';

<ResponsiveVideo
  src="video.mp4"
  poster="poster.jpg"
  autoPlay={false}
  controls={true}
  muted={false}
/>
```

### ResponsiveSection

Section with responsive layout:

```javascript
import { ResponsiveSection } from '@/components/ui/ResponsiveLayout';

<ResponsiveSection
  title="Featured Movies"
  titleSize="lg"
  spacing="lg"
>
  {/* Content */}
</ResponsiveSection>
```

---

## CSS Classes

### Utility Classes

#### Display Classes

```css
.hide-mobile-xs    /* Hide on extra small phones */
.show-mobile-xs    /* Show on extra small phones */
.hide-mobile-sm    /* Hide on small phones */
.hide-mobile       /* Hide on all mobile */
.show-mobile       /* Show on mobile */
.hide-tablet       /* Hide on tablet */
.show-tablet       /* Show on tablet */
.hide-desktop      /* Hide on desktop */
.show-desktop      /* Show on desktop */
.hide-tv           /* Hide on TV */
.show-tv           /* Show on TV */
```

#### Responsive Text

```css
.text-sm      /* Small font */
.text-base    /* Base font */
.text-lg      /* Large font */
.text-xl      /* Extra large font */
.text-2xl     /* 2X large font */
.text-3xl     /* 3X large font */
```

#### Responsive Padding

```css
.p-xs    /* Padding all sides - extra small */
.p-sm    /* Padding all sides - small */
.p-md    /* Padding all sides - medium */
.p-lg    /* Padding all sides - large */
.p-xl    /* Padding all sides - extra large */

.px-md   /* Horizontal padding */
.py-md   /* Vertical padding */
```

#### Responsive Gap

```css
.gap-xs    /* Extra small gap */
.gap-sm    /* Small gap */
.gap-md    /* Medium gap */
.gap-lg    /* Large gap */
.gap-xl    /* Extra large gap */
```

#### Grid System

```css
.grid-1       /* 1 column */
.grid-2       /* 2 columns */
.grid-3       /* 3 columns */
.grid-4       /* 4 columns */
.grid-5       /* 5 columns */
.grid-6       /* 6 columns */

.grid-auto-sm /* Auto-fit with 200px min */
.grid-auto-md /* Auto-fit with 280px min */
.grid-auto-lg /* Auto-fit with 320px min */
```

#### Aspect Ratio

```css
.aspect-square    /* 1:1 */
.aspect-video     /* 16:9 */
.aspect-cinema    /* 21:9 */
.aspect-portrait  /* 3:4 */
```

---

## TV Mode

### Enabling TV Mode

TV mode is automatically enabled when screen width ≥ 1600px. Manual enable:

```javascript
// Add class to html element
document.documentElement.classList.add('tv-mode');

// Or use TV mode hook
import { useTVMode } from '@/hooks';

function Component() {
  const isTVMode = useTVMode();
  
  if (isTVMode) {
    // TV-specific code
  }
}
```

### TV Mode Features

#### 1. **Enhanced Focus States**
```css
.tv-mode :focus-visible {
  outline: 6px solid var(--accent-cyan);
  outline-offset: 8px;
  box-shadow: 0 0 80px rgba(0, 255, 255, 0.4);
  transform: scale(1.08);
}
```

#### 2. **Larger Touch Targets**
```css
.tv-mode button,
.tv-mode [role="button"] {
  min-height: 56px;
  padding: 18px 36px;
  font-size: 1.1rem;
}
```

#### 3. **Keyboard Navigation**
- **Arrow Keys**: Navigate between focusable elements
- **Enter**: Activate focused element
- **Escape**: Go back / close modal
- **Backspace**: Go back

#### 4. **Spatial Navigation**
Remote control navigation automatically focuses nearby elements:
```javascript
const isTVMode = useTVMode();
// Automatically handles arrow key navigation
```

### TV Mode Example

```javascript
import { useTVMode } from '@/hooks';

function TVComponent() {
  const isTVMode = useTVMode();

  return (
    <div className={isTVMode ? 'tv-mode' : ''}>
      {/* Larger buttons for TV */}
      <button style={{
        padding: isTVMode ? '20px 40px' : '10px 20px',
        fontSize: isTVMode ? '1.1rem' : '0.95rem',
      }}>
        Watch Now
      </button>

      {/* Larger text */}
      <h1 style={{
        fontSize: isTVMode ? '3rem' : '2rem',
      }}>
        Featured Content
      </h1>

      {/* Grid responsive to TV */}
      <ResponsiveGrid cols={{ lg: 4, '2xl': 5 }}>
        {/* Items */}
      </ResponsiveGrid>
    </div>
  );
}
```

---

## Best Practices

### 1. **Mobile First Approach**

```css
/* Mobile - Default */
.component {
  font-size: 1rem;
  padding: 1rem;
  grid-template-columns: 1fr;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    font-size: 1.1rem;
    padding: 1.5rem;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 2. **Use Responsive Utilities**

```javascript
// Bad
<div style={{ width: '1200px', padding: '20px' }}>

// Good
<ResponsiveContainer maxWidth="lg" padding="md">
  {/* Automatically responsive */}
</ResponsiveContainer>
```

### 3. **Fluid Typography**

```css
/* Bad - Fixed sizes */
h1 { font-size: 2rem; }

/* Good - Responsive scaling */
h1 { font-size: clamp(1.75rem, 5vw, 3.5rem); }
```

### 4. **Touch-Friendly Sizing**

```javascript
const { touchTarget } = useResponsive();

<button style={{ minWidth: touchTarget, minHeight: touchTarget }}>
  Click me
</button>
```

### 5. **Image Optimization**

```javascript
// Good - Responsive images
<ResponsiveImage
  src="image.jpg"
  srcWebP="image.webp"
  alt="Description"
  lazy={true}
/>

// Bad - Fixed size
<img src="image.jpg" width="100%" style={{ maxWidth: '1200px' }} />
```

---

## Testing Guide

### 1. **Test on All Breakpoints**

```javascript
// Use DevTools to test at:
// - 375px (Mobile)
// - 480px (Small phone)
// - 768px (Tablet)
// - 1024px (Desktop)
// - 1440px (Large Desktop)
// - 1600px (TV)
// - 2560px (4K TV)
```

### 2. **Test Touch Interactions**

```bash
# Mobile testing
- Test tap targets (min 44x44px)
- Test touch scroll
- Test overflow handling
- Test orientation change
```

### 3. **Test TV Mode**

```bash
# TV mode testing
- Test arrow key navigation
- Test focus states (must be visible)
- Test text readability from 10 feet
- Test large buttons/controls
```

### 4. **Performance Testing**

```javascript
// Check on slow devices
- Mobile 3G network
- Older TV hardware
- High latency

// Use:
- Lighthouse
- WebPageTest
- Chrome DevTools throttling
```

### 5. **Accessibility Testing**

```bash
# Test accessibility
- Keyboard navigation
- Screen reader support
- Color contrast (4.5:1 for text)
- Focus visibility

# Use tools:
- axe DevTools
- WAVE
- Lighthouse accessibility
```

---

## Responsive Values Reference

### CSS Custom Properties

```css
/* Font Scaling */
--font-scale-xs: clamp(0.75rem, 2vw, 0.875rem);
--font-scale-base: clamp(1rem, 2vw, 1.125rem);
--font-scale-xl: clamp(1.5rem, 4vw, 2rem);

/* Spacing */
--pad-xs: clamp(0.5rem, 2vw, 1rem);
--pad-md: clamp(1.5rem, 4vw, 2rem);
--pad-lg: clamp(2rem, 5vw, 3rem);

/* Containers */
--container-sm: min(100%, calc(100vw - 2rem));
--container-lg: min(1440px, calc(100vw - 6rem));

/* Touch Target */
--touch-target: 44px;
```

### Breakpoint Mixins

```css
/* Mobile */
@media (max-width: 767px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* TV */
@media (min-width: 1600px) { }

/* 4K */
@media (min-width: 2500px) { }
```

---

## Summary

✅ **Mobile (< 768px)**
- Touch-optimized (44px+ targets)
- Single column layouts
- Compact spacing

✅ **Tablet (768-1023px)**
- Multi-column grids
- Medium spacing
- Hybrid touch/mouse

✅ **Desktop (1024-1599px)**
- Full layouts
- Hover effects
- Optimal spacing

✅ **TV (1600px+)**
- 10-foot UI
- Remote navigation
- Large text/buttons

✅ **4K (2500px+)**
- Ultra-large text
- Extra-large buttons
- Maximum visibility

---

**Need help?** Check the component examples or create an issue!
