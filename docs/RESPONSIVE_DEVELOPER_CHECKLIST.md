# ✅ Responsive Component Development Checklist

> Use this checklist when creating new components or updating existing ones

---

## 📋 Before You Start

- [ ] Understand the component's purpose and use cases
- [ ] Identify all breakpoints where UI will change
- [ ] Plan content priorities for mobile-first approach
- [ ] Check if TV mode variant is needed
- [ ] Review similar components for consistency

---

## 🎯 Mobile-First Development

### Structure

- [ ] Start with mobile layout (< 480px)
- [ ] Use flexbox/grid for flexibility
- [ ] Avoid fixed widths, use min/max-width instead
- [ ] Test with actual mobile devices if possible
- [ ] Use `calc()` for responsive sizing

```javascript
// Good
width: 'calc(100vw - 1rem)'
padding: 'clamp(1rem, 2vw, 2rem)'

// Bad
width: '100%'
padding: '20px'
```

### Touch Interactions

- [ ] All touch targets ≥ 44px (min 40x40px)
- [ ] Adequate spacing between touch targets (8px minimum)
- [ ] No hover-only interactions on mobile
- [ ] Tap feedback visible (0.1-0.3s)
- [ ] Swipe gestures clearly discoverable

```javascript
import { useResponsive } from '@/hooks';

const { isMobile, touchTarget } = useResponsive();

<button style={{
  minWidth: touchTarget,
  minHeight: touchTarget,
  // Avoid hover effects on mobile
  '&:hover': isMobile ? {} : { background: '#ccc' }
}}>
```

### Text Sizing

- [ ] Use `clamp()` for fluid typography
- [ ] Min font: 12px on mobile, 14px preferred
- [ ] Max font: Doesn't exceed 140% of mobile size
- [ ] Line height ≥ 1.5 for readability
- [ ] Letter spacing: 0 or positive values only

```css
/* Good */
font-size: clamp(0.875rem, 2vw, 1.125rem);
line-height: 1.6;

/* Bad */
font-size: 12px;
line-height: 1.2;
```

### Images & Media

- [ ] Use ResponsiveImage component
- [ ] Provide WebP alternatives when possible
- [ ] Use appropriate aspect ratios (16:9, 3:4, 1:1)
- [ ] Implement lazy loading
- [ ] Compress images for mobile

```javascript
<ResponsiveImage
  src="image.jpg"
  srcWebP="image.webp"
  alt="Description"
  lazy={true}
  aspectRatio="16 / 9"
/>
```

---

## 📱 Tablet Optimization (768-1023px)

### Layout Changes

- [ ] Switch to 2-3 column grid if applicable
- [ ] Increase spacing proportionally
- [ ] Ensure readability in landscape
- [ ] Use horizontal space efficiently
- [ ] Consider split-view layouts

```css
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}
```

### Interactions

- [ ] Maintain touch-friendly targets
- [ ] Support both touch and mouse
- [ ] Hover effects subtle on tablet
- [ ] Consider keyboard navigation

---

## 🖥️ Desktop Implementation (1024px+)

### Layout

- [ ] Full 3-4 column grids
- [ ] Maximum content width: 1440px
- [ ] Hover effects and animations
- [ ] Multi-column sidebars possible
- [ ] Rich information density

```css
@media (min-width: 1024px) {
  .container {
    max-width: 1440px;
    margin: 0 auto;
  }
}
```

### Interactions

- [ ] Hover states: subtle color/scale changes
- [ ] Cursor feedback (pointer, grab, text)
- [ ] Smooth transitions (200-300ms)
- [ ] Tooltips on hover
- [ ] Keyboard shortcuts possible

```javascript
const { isDesktop } = useResponsive();

<div
  onMouseEnter={() => isDesktop && setShowTooltip(true)}
  onMouseLeave={() => setShowTooltip(false)}
>
```

---

## 📺 TV Mode (1600px+)

### Layout

- [ ] Use 5-6 column grids
- [ ] Increase all padding/margins by 1.5-2x
- [ ] Large, clear cards (min 320px)
- [ ] Generous spacing between elements
- [ ] Center-aligned content for TV

```css
@media (min-width: 1600px) {
  .container {
    padding: 4rem;
  }
  .grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 2rem;
  }
}
```

### Text & Controls

- [ ] Base font size: 18px minimum
- [ ] Headings: 20px+ (can be 40px+ for main titles)
- [ ] Buttons: 56px+ minimum
- [ ] Button text: 16px+ font size
- [ ] Line height: 1.8-2 for comfort

```javascript
import { useTVMode } from '@/hooks';

const isTVMode = useTVMode();

<h1 style={{
  fontSize: isTVMode ? '3rem' : '2rem',
  lineHeight: isTVMode ? 1.2 : 1.1,
}}>
```

### Focus States

- [ ] Visible focus outline: 6px minimum
- [ ] Bright color (cyan is good)
- [ ] Glow effect: `box-shadow: 0 0 60px rgba(0, 255, 255, 0.4)`
- [ ] Scale effect: `transform: scale(1.08)`
- [ ] Smooth transition: 200-300ms

```css
.tv-mode :focus-visible {
  outline: 6px solid var(--accent-cyan);
  outline-offset: 8px;
  box-shadow: 0 0 80px rgba(0, 255, 255, 0.4);
  transform: scale(1.08);
}
```

### Navigation

- [ ] Arrow key navigation (useTVMode hook handles this)
- [ ] Tab order logical and visible
- [ ] No time-based auto-dismiss (TV can't interact quickly)
- [ ] Spacious click targets: 56px+ minimum
- [ ] Clear visual hierarchy

---

## 🎨 4K TV (2500px+)

### Scaling

- [ ] All sizes increased by 1.5-2x compared to regular TV
- [ ] Typography: 24px+ body, 48px+ headings
- [ ] Buttons: 64px+ minimum
- [ ] Padding/margins: 5rem+ for large sections
- [ ] Grid: 6 columns, 3rem+ gap

```css
@media (min-width: 2500px) {
  html { font-size: 20px; }
  h1 { font-size: 4rem; }
  button { padding: 24px 48px; font-size: 1.25rem; }
}
```

---

## 📦 Using Responsive Components

### ResponsiveGrid

```javascript
import { ResponsiveGrid } from '@/components/ui/ResponsiveLayout';

<ResponsiveGrid
  cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 5 }}
  gap="md"
  minColWidth={280}
>
  {/* Items */}
</ResponsiveGrid>
```

### ResponsiveContainer

```javascript
import { ResponsiveContainer } from '@/components/ui/ResponsiveLayout';

<ResponsiveContainer maxWidth="lg" padding="md">
  {/* Content auto-responsive */}
</ResponsiveContainer>
```

### useResponsive Hook

```javascript
import { useResponsive } from '@/hooks';

const { isMobile, isTablet, isDesktop, isTV, touchTarget } = useResponsive();

// Conditional rendering
{isMobile && <MobileVersion />}
{!isMobile && <DesktopVersion />}
```

---

## 🧪 Testing Checklist

### Visual Testing

- [ ] Screenshot at 375px (mobile)
- [ ] Screenshot at 480px (small phone)
- [ ] Screenshot at 768px (tablet)
- [ ] Screenshot at 1024px (desktop)
- [ ] Screenshot at 1600px (TV)
- [ ] Screenshot at 2560px (4K)
- [ ] Test portrait and landscape orientations

### Functional Testing

- [ ] Touch interactions work smoothly
- [ ] Buttons respond to click/tap
- [ ] Forms are easy to fill on mobile
- [ ] Images load quickly and display correctly
- [ ] Videos play at appropriate quality
- [ ] Scrolling is smooth
- [ ] No horizontal scroll on mobile

### Keyboard Testing

- [ ] Tab navigation works (desktop)
- [ ] Arrow keys work (TV mode)
- [ ] Enter activates buttons
- [ ] Escape closes modals
- [ ] Focus order is logical

### Accessibility Testing

- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Focus indicator always visible
- [ ] Alt text on all images
- [ ] Semantic HTML (buttons not divs)
- [ ] ARIA labels where needed
- [ ] No keyboard traps

### Performance Testing

- [ ] Page loads < 3s on mobile 3G
- [ ] Images optimized for size
- [ ] CSS/JS minified
- [ ] No layout shifts
- [ ] Lighthouse score > 80

---

## 🚀 Common Pitfalls to Avoid

❌ **Don't:**
- Use fixed widths
- Assume mouse-only input
- Skip mobile optimization
- Ignore touch target sizing
- Assume viewport = 16:9 ratio
- Forget about safe areas (notches)
- Use hover-only interactions
- Set font sizes too small (< 12px)
- Forget to test on real devices

✅ **Do:**
- Use fluid sizing with `clamp()`
- Design for touch first
- Optimize images aggressively
- Ensure 44px+ touch targets
- Support multiple input methods
- Test on real devices
- Provide keyboard alternatives
- Use semantic HTML
- Validate accessibility

---

## 📚 Component Template

Use this template when creating new responsive components:

```javascript
import { useResponsive } from '@/hooks';
import { ResponsiveContainer } from '@/components/ui/ResponsiveLayout';

export default function MyComponent({ title, items, ...props }) {
  const { isMobile, isTablet, isDesktop, isTV } = useResponsive();

  return (
    <ResponsiveContainer maxWidth="lg" padding="md">
      {/* Responsive title */}
      <h2 style={{
        fontSize: isMobile ? '1.5rem' : isTV ? '3rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
      }}>
        {title}
      </h2>

      {/* Responsive layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' :
                            isTablet ? 'repeat(2, 1fr)' :
                            isTV ? 'repeat(5, 1fr)' :
                            'repeat(3, 1fr)',
        gap: isMobile ? '1rem' : '2rem',
      }}>
        {items.map(item => (
          <div key={item.id}>
            {/* Card content */}
          </div>
        ))}
      </div>
    </ResponsiveContainer>
  );
}
```

---

## 📞 Need Help?

- Check the [RESPONSIVE_DESIGN_GUIDE.md](./RESPONSIVE_DESIGN_GUIDE.md)
- Review existing components: `src/components/`
- Test with DevTools breakpoint simulator
- Use Lighthouse for accessibility audit
- Ask in team chat!

---

**Last Updated:** May 19, 2026
**Responsive System Version:** 2.0
