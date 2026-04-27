# Hero Carousel Architecture

## 🏗️ Component Structure

```
HeroCarousel (Main Component)
│
├── State Management
│   ├── activeIndex
│   ├── isAutoPlay
│   ├── progress
│   └── isHovering
│
├── Effects
│   ├── useEffect (Auto-play with progress)
│   ├── useEffect (Parallax scroll)
│   ├── useEffect (Keyboard navigation)
│   └── useEffect (Touch/Swipe)
│
├── Event Handlers
│   ├── handleNext()
│   ├── handlePrevious()
│   ├── handleDotClick()
│   ├── handleTouchStart()
│   ├── handleTouchEnd()
│   └── handleSwipe()
│
├── Rendering
│   ├── Background Section
│   │   ├── Background Image
│   │   ├── Backdrop Wash
│   │   └── Overlay
│   │
│   ├── Content Section
│   │   ├── Mobile Poster (Mobile only)
│   │   └── Copy Panel
│   │       ├── Kicker Row
│   │       ├── Title
│   │       ├── Description
│   │       ├── Chip Row
│   │       ├── Metric Row
│   │       └── Actions
│   │
│   └── Controls Section
│       ├── Navigation Arrows (Desktop)
│       ├── Progress Bar (Desktop)
│       ├── Carousel Dots (All)
│       ├── Slide Counter (Desktop)
│       └── Thumbnail Preview (Desktop)
│
└── Styles
    └── CSS-in-JS Object
```

## 🔄 Data Flow

```
contentItems (Props)
    ↓
activeIndex (State)
    ↓
content = contentItems[activeIndex]
    ↓
Render Content
    ↓
User Interaction
    ↓
Update activeIndex
    ↓
Re-render
```

## 🎯 Feature Architecture

### Auto-Play System
```
useEffect (Auto-play)
    ↓
setInterval (50ms)
    ↓
Update Progress
    ↓
Check if Duration Reached
    ↓
Yes → Update activeIndex → Reset Progress
    ↓
No → Continue
```

### Navigation System
```
User Input (Keyboard/Touch/Click)
    ↓
Event Handler
    ↓
Calculate New Index
    ↓
Reset Progress
    ↓
Pause Auto-play
    ↓
Update activeIndex
    ↓
Resume Auto-play (10s delay)
```

### Parallax System
```
Window Scroll Event
    ↓
Calculate Scroll Position
    ↓
Apply Transform
    ↓
scale(1.04) translateY(y * 0.28)
```

## 📱 Responsive Architecture

```
Desktop (1024px+)
├── Full Features
├── Navigation Arrows
├── Progress Bar
├── Slide Counter
├── Thumbnail Preview
└── Parallax Effect

Tablet (768px - 1023px)
├── Core Features
├── Carousel Dots
├── Simplified Layout
└── No Parallax

Mobile (< 768px)
├── Essential Features
├── Carousel Dots
├── Touch Swipe
├── Poster Image
└── Compact Controls
```

## 🎨 Styling Architecture

```
Styles Object
├── Layout Styles
│   ├── hero
│   ├── background
│   ├── contentWrap
│   └── copyPanel
│
├── Typography Styles
│   ├── title
│   ├── description
│   ├── metricLabel
│   └── metricValue
│
├── Component Styles
│   ├── playBtn
│   ├── infoBtn
│   ├── arrowBtn
│   ├── dot
│   └── dotActive
│
├── Responsive Styles
│   ├── heroMobile
│   ├── heroTablet
│   ├── contentWrapMobile
│   └── contentWrapTablet
│
└── Animation Styles
    ├── bgImage (animation)
    ├── progressBar (transition)
    └── dot (transition)
```

## 🔌 Hook Architecture

```
useCarouselConfig
├── Default Config
└── Merge with Overrides

useCarouselState
├── activeIndex
├── isAutoPlay
├── progress
├── isHovering
├── Handlers (Next, Previous, DotClick)
└── Setters

useKeyboardNavigation
├── Listen for Arrow Keys
├── Call Handlers
└── Prevent Default

useSwipeNavigation
├── Track Touch Start
├── Track Touch End
├── Calculate Swipe
└── Call Handlers

useParallaxEffect
├── Listen for Scroll
├── Calculate Position
├── Apply Transform
└── Cleanup

useAutoPlay
├── Track Elapsed Time
├── Update Progress
├── Check Duration
└── Call Complete Handler
```

## 🧪 Testing Architecture

```
Test Suite
├── Rendering Tests
│   ├── Component renders
│   ├── Content displays
│   └── Controls render
│
├── Navigation Tests
│   ├── Next button
│   ├── Previous button
│   ├── Dot click
│   ├── Keyboard
│   └── Touch swipe
│
├── Content Tests
│   ├── Title display
│   ├── Description display
│   ├── Metadata display
│   └── Rating display
│
├── Responsive Tests
│   ├── Desktop layout
│   ├── Tablet layout
│   └── Mobile layout
│
└── Edge Case Tests
    ├── Empty content
    ├── Single item
    ├── Placeholder content
    └── Missing data
```

## 📊 State Management Flow

```
Initial State
├── activeIndex: 0
├── isAutoPlay: true
├── progress: 0
└── isHovering: false

User Interaction
├── Click Next → activeIndex++
├── Click Previous → activeIndex--
├── Click Dot → activeIndex = index
├── Keyboard → activeIndex ± 1
└── Swipe → activeIndex ± 1

Auto-play
├── Every 50ms → progress++
├── When progress >= 100 → activeIndex++
└── Reset progress

Hover
├── Mouse Enter → isHovering = true
├── Mouse Leave → isHovering = false
└── Show/Hide Controls
```

## 🔐 Error Handling

```
Input Validation
├── Check if content is array
├── Check if content is not empty
├── Check if activeIndex is valid
└── Check if content[activeIndex] exists

Fallback Handling
├── No backdrop → Use fallback gradient
├── No poster → Hide poster section
├── No rating → Show "N/A"
├── No description → Show empty
└── No genre → Skip chip

Edge Cases
├── Single item → No carousel controls
├── Empty array → Return null
├── Null content → Return null
└── Invalid index → Reset to 0
```

## 🚀 Performance Optimization

```
Rendering Optimization
├── Memoization (if needed)
├── Conditional rendering
├── Lazy loading images
└── Efficient re-renders

Event Optimization
├── Passive listeners
├── Debounced scroll
├── Cleanup on unmount
└── Ref-based updates

Animation Optimization
├── CSS transitions
├── Transform-based animations
├── GPU acceleration
└── Minimal repaints
```

## 📦 Dependencies

```
React
├── useState
├── useEffect
├── useRef
└── useCallback (optional)

React Router
└── Link

Custom Hooks
├── useBreakpoint
└── useCarouselConfig (optional)

Custom Components
├── StarRating
└── WatchlistButton

CSS
└── CSS-in-JS (inline styles)
```

## 🔄 Lifecycle

```
Mount
├── Initialize state
├── Set up event listeners
└── Start auto-play

Update
├── Check dependencies
├── Update state
├── Re-render
└── Update DOM

Unmount
├── Clear intervals
├── Remove listeners
├── Cleanup refs
└── Cleanup state
```

## 🎯 Key Design Decisions

### 1. CSS-in-JS
- ✅ Scoped styles
- ✅ Dynamic styling
- ✅ No CSS file needed
- ✅ Easy customization

### 2. Inline State Management
- ✅ Simple and lightweight
- ✅ No Redux needed
- ✅ Easy to understand
- ✅ Good performance

### 3. Responsive Design
- ✅ Mobile-first approach
- ✅ Breakpoint-based
- ✅ Flexible layout
- ✅ Touch-optimized

### 4. Accessibility
- ✅ ARIA labels
- ✅ Semantic HTML
- ✅ Keyboard support
- ✅ Screen reader friendly

### 5. Performance
- ✅ Lazy loading
- ✅ Passive listeners
- ✅ Efficient renders
- ✅ Cleanup on unmount

## 📈 Scalability

### Current Capacity
- ✅ Up to 100+ items
- ✅ Large images
- ✅ Multiple instances
- ✅ High traffic

### Future Improvements
- [ ] Virtual scrolling (for 1000+ items)
- [ ] Image optimization
- [ ] Caching strategy
- [ ] Analytics integration

---

**Architecture Version**: 1.0
**Last Updated**: April 27, 2026
**Status**: Production Ready ✅
