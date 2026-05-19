# 📌 Responsive Design - Quick Reference Card

> Cheat sheet for responsive development

## Breakpoints

| Device | Range | Hook | CSS |
|--------|-------|------|-----|
| XS Phone | <480px | `isExtraSmall` | `@media (max-width: 479px)` |
| S Phone | 480-639px | `isSmall` | `@media (min-width: 480px)` |
| Mobile | <768px | `isMobile` | `@media (max-width: 767px)` |
| Tablet | 768-1023px | `isTablet` | `@media (min-width: 768px)` |
| Desktop | 1024-1599px | `isDesktop` | `@media (min-width: 1024px)` |
| TV | 1600-2499px | `isTV` | `@media (min-width: 1600px)` |
| 4K | 2500px+ | `is4K` | `@media (min-width: 2500px)` |

## Hooks (One-Liners)

```javascript
import { useResponsive, useIsMobile, useIsTV, useScreenSize } from '@/hooks';

// Full info
const { width, isMobile, isTV, touchTarget, gridCols } = useResponsive();

// Quick checks
const mobile = useIsMobile();
const tv = useIsTV();
const size = useScreenSize(); // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
```

## CSS Classes

### Display
```html
<!-- Hide on mobile, show on desktop -->
<div class="hide-mobile show-desktop">Desktop only</div>

<!-- Show on TV -->
<div class="show-tv hide-desktop">TV mode</div>
```

### Text Sizing
```html
<p class="text-sm">Small text</p>
<p class="text-base">Base text</p>
<p class="text-lg">Large text</p>
<p class="text-3xl">Extra large</p>
```

### Spacing
```html
<div class="p-md">Padding all sides</div>
<div class="px-lg">Horizontal padding</div>
<div class="py-sm">Vertical padding</div>
<div class="gap-xl">Large gap</div>
```

### Grid
```html
<div class="grid grid-4">4 columns</div>
<div class="grid grid-auto-md">Auto-fit (280px min)</div>
```

## Components (Most Used)

### ResponsiveGrid
```javascript
<ResponsiveGrid cols={{ xs: 1, lg: 3 }} gap="md">
  <Item />
</ResponsiveGrid>
```

### ResponsiveContainer
```javascript
<ResponsiveContainer maxWidth="lg" padding="md">
  Your content
</ResponsiveContainer>
```

### ResponsiveImage
```javascript
<ResponsiveImage
  src="image.jpg"
  alt="Description"
  aspectRatio="16 / 9"
  lazy
/>
```

## CSS Custom Properties

```css
/* Fonts */
--font-scale-xs: clamp(0.75rem, 2vw, 0.875rem);
--font-scale-lg: clamp(1.125rem, 3vw, 1.5rem);

/* Spacing */
--pad-md: clamp(1.5rem, 4vw, 2rem);
--gap-lg: clamp(1.5rem, 3vw, 2rem);

/* Containers */
--container-lg: min(1440px, calc(100vw - 6rem));
--touch-target: 44px; /* 56px on TV */
```

## Common Patterns

### 1. Responsive Text
```css
/* Good */
h1 { font-size: clamp(2rem, 5vw, 3.5rem); }

/* Bad */
h1 { font-size: 2rem; }
```

### 2. Responsive Layout
```javascript
// Column grid that adapts
<ResponsiveGrid
  cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 5 }}
>
```

### 3. Conditional Rendering
```javascript
const { isMobile } = useResponsive();
{isMobile && <MobileNav />}
{!isMobile && <DesktopNav />}
```

### 4. Touch Targets
```javascript
const { touchTarget } = useResponsive();
<button style={{ minWidth: touchTarget, minHeight: touchTarget }}>
```

### 5. TV Mode
```javascript
const isTVMode = useTVMode();
// Automatically handles arrow key navigation
<button style={{
  padding: isTVMode ? '20px 40px' : '10px 20px',
  fontSize: isTVMode ? '1.1rem' : '0.95rem',
}}>
```

## CSS Media Queries

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

## Utility Classes Cheat Sheet

| Class | Purpose |
|-------|---------|
| `.hide-mobile` | Hide on mobile |
| `.show-mobile` | Show only mobile |
| `.hide-desktop` | Hide on desktop |
| `.show-tv` | Show only TV |
| `.text-lg` | Large text |
| `.p-md` | Medium padding |
| `.gap-xl` | Extra large gap |
| `.grid-4` | 4 columns |
| `.touch-safe` | 44px+ touch target |
| `.container-wide` | Wide container |

## Screen-Specific Features

| Mobile | Tablet | Desktop | TV |
|--------|--------|---------|-----|
| 1 column | 2-3 columns | 3-4 columns | 5-6 columns |
| Touch only | Touch + Mouse | Mouse + KB | Remote |
| 44px targets | 44px targets | 40px targets | 56px targets |
| No hover | Subtle hover | Full hover | Focus only |
| 14px text | 15-16px text | 16px text | 18px+ text |
| Compact | Normal | Optimal | Spacious |

## Color Variables

```css
--accent-primary: #ff0080
--accent-cyan: #00ffff
--accent-violet: #8a2be2
--text-primary: #ffffff
--bg-primary: #050c16
--border-color: rgba(255, 255, 255, 0.12)
```

## Animation Timings

```javascript
--transition-fast: 160ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 280ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring: 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

## Accessibility Reminders

- [ ] Touch targets ≥ 44px
- [ ] Focus outline always visible
- [ ] Color contrast ≥ 4.5:1
- [ ] Alt text on images
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Support reduced motion

## Testing Sizes

Test your component at:
- 375px (mobile)
- 480px (small phone)
- 768px (tablet)
- 1024px (desktop)
- 1440px (large desktop)
- 1600px (TV)
- 2560px (4K)

## TV Mode Shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Navigate |
| Enter | Activate |
| Escape | Go back |
| Backspace | Go back |

## Font Sizing

```javascript
// Mobile: 14-16px
// Tablet: 15-16px
// Desktop: 16-17px
// TV: 18px
// 4K: 20px+
```

## Responsive Grid Columns

| Screen | Cols |
|--------|------|
| Mobile | 1-2 |
| Tablet | 2-3 |
| Desktop | 3-4 |
| TV | 5 |
| 4K | 6 |

## Responsive Container Max-Width

| Size | Value |
|------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

**💡 Pro Tip:** Use `useResponsive()` hook for most needs. Use CSS only when you need static styling.

**⚡ Quick Start:**
1. Import `useResponsive` hook
2. Get `isMobile`, `isTV`, etc.
3. Use `ResponsiveGrid` for layouts
4. Use `ResponsiveImage` for images
5. Test at all breakpoints

---

Last Updated: May 19, 2026
