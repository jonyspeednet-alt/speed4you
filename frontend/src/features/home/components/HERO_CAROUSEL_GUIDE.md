# Hero Carousel Component Guide

## Overview
একটি আধুনিক, ফিচার-সমৃদ্ধ ক্যারোসেল কম্পোনেন্ট যা মাল্টিপল কন্টেন্ট আইটেম প্রদর্শন করে।

## Features

### 🎬 Core Features
- **Auto-play**: 7 সেকেন্ডের ব্যবধানে স্বয়ংক্রিয় স্লাইড পরিবর্তন
- **Progress Bar**: বর্তমান স্লাইডের অগ্রগতি দেখায় (ডেস্কটপ)
- **Keyboard Navigation**: ← → তীর কী দিয়ে নেভিগেট করুন
- **Touch/Swipe Support**: মোবাইলে সোয়াইপ করে নেভিগেট করুন
- **Parallax Effect**: ডেস্কটপে স্ক্রল করার সময় ব্যাকগ্রাউন্ড মুভ করে

### 🎨 UI Controls
- **Navigation Arrows**: পূর্ববর্তী/পরবর্তী বাটন (ডেস্কটপ)
- **Carousel Dots**: ইন্টারঅ্যাক্টিভ ডট নেভিগেশন
- **Slide Counter**: বর্তমান স্লাইড নম্বর (01 / 05)
- **Thumbnail Preview**: প্রথম 5 স্লাইডের থাম্বনেইল (ডেস্কটপ)

### 📱 Responsive Design
- **Desktop**: সম্পূর্ণ ফিচার সহ
- **Tablet**: সরলীকৃত লেআউট
- **Mobile**: টাচ-অপ্টিমাইজড, কম্প্যাক্ট কন্ট্রোল

## Usage

### Basic Implementation
```jsx
import HeroCarousel from './HeroCarousel';

function HomePage() {
  const heroContent = [
    {
      id: '1',
      title: 'Movie Title',
      description: 'Movie description...',
      genre: 'Action',
      language: 'English',
      year: 2024,
      rating: 8.5,
      type: 'movie',
      backdrop: 'https://...',
      poster: 'https://...',
    },
    // More items...
  ];

  return <HeroCarousel content={heroContent} />;
}
```

### Props
```typescript
interface HeroCarouselProps {
  content: ContentItem[];
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  genre?: string;
  language?: string;
  year?: number;
  rating?: number;
  type: 'movie' | 'series';
  backdrop?: string;  // Background image
  poster?: string;    // Poster image
  isPlaceholder?: boolean;
}
```

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| ← | Previous slide |
| → | Next slide |

## Touch Gestures
| Gesture | Action |
|---------|--------|
| Swipe Left | Next slide |
| Swipe Right | Previous slide |

## Styling Customization

### CSS Variables Used
```css
--nav-height-desktop: Navigation height
--nav-height-mobile: Mobile nav height
--spacing-*: Spacing values
--radius-*: Border radius values
--bg-primary: Primary background
--text-primary: Primary text color
--text-secondary: Secondary text color
--text-muted: Muted text color
--accent-red: Red accent color
--accent-cyan: Cyan accent color
--accent-amber: Amber accent color
```

### Customizing Colors
সব রঙ CSS variables এর মাধ্যমে কাস্টমাইজ করা যায়। আপনার root CSS এ এগুলো ওভাররাইড করুন:

```css
:root {
  --accent-red: #ff5a5f;
  --accent-cyan: #00f5d4;
  --accent-amber: #ffc857;
}
```

## Animation Timings
- **Auto-play Duration**: 7000ms
- **Progress Update**: 50ms
- **Transition**: 0.3s ease
- **Parallax**: 20s infinite

## Accessibility
- ✅ ARIA labels সব বাটনে
- ✅ Keyboard navigation সাপোর্ট
- ✅ Semantic HTML
- ✅ Focus management
- ✅ Screen reader friendly

## Performance Considerations
- Lazy loading images
- Passive event listeners
- Efficient re-renders
- Cleanup on unmount

## Browser Support
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Common Issues & Solutions

### Issue: Carousel not auto-playing
**Solution**: নিশ্চিত করুন `content` array এ কমপক্ষে 2 আইটেম আছে।

### Issue: Images not loading
**Solution**: `backdrop` এবং `poster` URLs সঠিক কিনা চেক করুন।

### Issue: Keyboard navigation not working
**Solution**: নিশ্চিত করুন section focused আছে বা body active element।

## Future Enhancements
- [ ] Keyboard shortcuts customization
- [ ] Custom animation speeds
- [ ] Video support
- [ ] Analytics tracking
- [ ] Accessibility improvements
- [ ] Performance optimizations

## Dependencies
- React 16.8+
- react-router-dom
- Custom hooks: `useBreakpoint`
- Custom components: `StarRating`, `WatchlistButton`

## License
Part of the main application
