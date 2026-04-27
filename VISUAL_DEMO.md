# 🎬 Hero Carousel - Visual Demo

## 🎨 **What You'll See**

### Hero Carousel Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ◄ [Prev]                                                [Next] ►│
│                                                                 │
│                    [Background Image]                           │
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │ 🔴 Featured Tonight                  │                      │
│  │                                      │                      │
│  │ [ACTION] [ENGLISH] [2024]            │                      │
│  │                                      │                      │
│  │ Band of Brothers                     │                      │
│  │ (2001)                               │                      │
│  │                                      │                      │
│  │ An epic adventure film filled        │                      │
│  │ with action and mystery.             │                      │
│  │                                      │                      │
│  │ RATING    LANGUAGE    FORMAT         │                      │
│  │ ⭐ 8.2    English     Movie          │                      │
│  │                                      │                      │
│  │ [▶ Play Now]  [ℹ Details]           │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│                                                                 │
│              ● ○ ○ ○ ○                              [1/5]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **Interactive Elements**

### 1. **Navigation Arrows** (Desktop Only)
```
◄ [Prev]                                                [Next] ►
```
- Click to manually navigate
- Hover for scale effect
- Hidden on mobile

### 2. **Progress Dots** (All Devices)
```
● ○ ○ ○ ○
```
- Active dot is red and larger
- Click to jump to slide
- Animated progress ring on active dot
- Hover for scale effect

### 3. **Slide Counter** (All Devices)
```
[1/5]
```
- Shows current slide / total slides
- Updates on navigation
- Bottom-right corner

### 4. **Featured Badge**
```
🔴 Featured Tonight
```
- Red pulsing dot
- Uppercase text
- Glassmorphic background

### 5. **Category Pills**
```
[ACTION] [ENGLISH] [2024]
```
- Genre, Language, Year
- Glassmorphic style
- Uppercase text

### 6. **Action Buttons**
```
[▶ Play Now]  [ℹ Details]
```
- Primary: Red gradient with glow
- Secondary: Glass with border
- Hover: Lift + enhanced glow

---

## 🎬 **Animation Sequence**

### Auto-Rotation (Every 6 seconds):

```
Slide 1 (6s) → Slide 2 (6s) → Slide 3 (6s) → Slide 4 (6s) → Slide 5 (6s) → Slide 1...
   ●              ●              ●              ●              ●              ●
   ○              ○              ○              ○              ○              ○
   ○              ○              ○              ○              ○              ○
   ○              ○              ○              ○              ○              ○
   ○              ○              ○              ○              ○              ○
```

### Transition Effect:
```
Current Slide                    Next Slide
┌──────────┐                    ┌──────────┐
│          │  Fade Out (800ms)  │          │
│ Slide 1  │ ─────────────────> │ Slide 2  │
│ Opacity: │  Slide (800ms)     │ Opacity: │
│   1 → 0  │                    │   0 → 1  │
└──────────┘                    └──────────┘
```

---

## 🖱️ **User Interactions**

### 1. **Hover on Carousel**
```
Action: Mouse enters carousel area
Result: ⏸️ Auto-rotation pauses
Visual: No change (seamless)

Action: Mouse leaves carousel area
Result: ▶️ Auto-rotation resumes
Visual: Continues from current slide
```

### 2. **Click Navigation Arrow**
```
Action: Click ◄ Prev
Result: Go to previous slide
Visual: Smooth transition (800ms)
       Progress dot updates
       Counter updates

Action: Click Next ►
Result: Go to next slide
Visual: Smooth transition (800ms)
       Progress dot updates
       Counter updates
```

### 3. **Click Progress Dot**
```
Action: Click dot #3 (○)
Result: Jump to slide 3
Visual: Smooth transition (800ms)
       Dot becomes active (●)
       Counter shows 3/5
```

### 4. **Keyboard Navigation**
```
Action: Press ← (Left Arrow)
Result: Go to previous slide
Visual: Same as clicking ◄ Prev

Action: Press → (Right Arrow)
Result: Go to next slide
Visual: Same as clicking Next ►
```

### 5. **Hover on Buttons**
```
Action: Hover on [▶ Play Now]
Result: Button lifts up
Visual: translateY(-2px)
       Enhanced red glow
       Brighter appearance

Action: Hover on [ℹ Details]
Result: Button lifts up
Visual: translateY(-2px)
       Brighter glass effect
       Stronger border
```

---

## 📱 **Responsive Layouts**

### Desktop (1024px+):
```
┌─────────────────────────────────────────────────────────────────┐
│  ◄                    [Full Hero Image]                       ► │
│                                                                 │
│  ┌─────────────────────────────┐                               │
│  │ 🔴 Featured Tonight         │                               │
│  │ [ACTION] [ENGLISH] [2024]   │                               │
│  │                             │                               │
│  │ Band of Brothers (2001)     │                               │
│  │                             │                               │
│  │ An epic adventure film...   │                               │
│  │                             │                               │
│  │ RATING  LANGUAGE  FORMAT    │                               │
│  │ ⭐ 8.2  English   Movie     │                               │
│  │                             │                               │
│  │ [▶ Play Now] [ℹ Details]   │                               │
│  └─────────────────────────────┘                               │
│                                                                 │
│                    ● ○ ○ ○ ○                         [1/5]     │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet (640px - 1023px):
```
┌───────────────────────────────────────────┐
│        [Full Hero Image]                  │
│                                           │
│  ┌──────────────────────────┐            │
│  │ 🔴 Featured Tonight      │            │
│  │ [ACTION] [2024]          │            │
│  │                          │            │
│  │ Band of Brothers         │            │
│  │                          │            │
│  │ An epic adventure...     │            │
│  │                          │            │
│  │ ⭐ 8.2  Movie            │            │
│  │                          │            │
│  │ [▶ Play] [ℹ Details]    │            │
│  └──────────────────────────┘            │
│                                           │
│          ● ○ ○ ○ ○              [1/5]    │
└───────────────────────────────────────────┘
```

### Mobile (<640px):
```
┌─────────────────────────┐
│   [Hero Image]          │
│                         │
│                         │
│                         │
│                         │
│  ┌──────────────────┐   │
│  │ 🔴 Featured      │   │
│  │ [ACTION] [2024]  │   │
│  │                  │   │
│  │ Band of Brothers │   │
│  │                  │   │
│  │ An epic...       │   │
│  │                  │   │
│  │ ⭐ 8.2  Movie    │   │
│  │                  │   │
│  │ [▶ Play Now]     │   │
│  │ [ℹ Details]      │   │
│  └──────────────────┘   │
│                         │
│    ● ○ ○ ○ ○    [1/5]  │
└─────────────────────────┘
```

---

## 🎨 **Color Scheme**

### Featured Badge:
```
Background: rgba(255,62,78,0.15)  [Red with transparency]
Border:     rgba(255,62,78,0.3)   [Red border]
Text:       #ff3e4e                [Bright red]
Dot:        #ff3e4e                [Pulsing red dot]
```

### Category Pills:
```
Background: rgba(255,255,255,0.1)  [White with transparency]
Border:     rgba(255,255,255,0.15) [White border]
Text:       #ffffff                 [White]
```

### Play Now Button:
```
Background: linear-gradient(135deg, #ff3e4e, #ff6b4a) [Red gradient]
Text:       #ffffff                                     [White]
Shadow:     0 8px 24px rgba(255,62,78,0.4)            [Red glow]
Hover:      0 12px 32px rgba(255,62,78,0.6)           [Enhanced glow]
```

### Details Button:
```
Background: rgba(255,255,255,0.12) [Glass effect]
Border:     rgba(255,255,255,0.2)  [White border]
Text:       #ffffff                 [White]
Hover:      rgba(255,255,255,0.18) [Brighter glass]
```

### Progress Dots:
```
Inactive:   rgba(255,255,255,0.3)  [Dim white]
Active:     #ff3e4e                 [Bright red]
Hover:      rgba(255,255,255,0.5)  [Brighter white]
```

---

## ⏱️ **Timing & Animations**

### Auto-Rotation:
```
Interval: 6000ms (6 seconds)
Pause:    On hover
Resume:   On mouse leave
```

### Slide Transition:
```
Duration: 800ms
Easing:   cubic-bezier(0.4, 0, 0.2, 1)
Properties: opacity, transform
```

### Button Hover:
```
Duration: 200ms
Easing:   ease
Properties: transform, box-shadow
```

### Dot Progress Animation:
```
Duration: 6000ms (matches auto-rotation)
Easing:   linear
Effect:   Scale from 0 to 1, fade out
```

### Navigation Button Hover:
```
Duration: 200ms
Easing:   ease
Properties: background, transform, box-shadow
```

---

## 🎯 **User Flow Example**

### Scenario: User visits homepage

```
1. Page loads
   └─> Hero carousel appears
       └─> Slide 1 is active
           └─> Progress dot animates (6s)

2. After 6 seconds
   └─> Auto-transition to Slide 2
       └─> Smooth fade + slide animation (800ms)
           └─> Progress dot animates (6s)

3. User hovers on carousel
   └─> Auto-rotation pauses
       └─> User can read content

4. User clicks "Play Now"
   └─> Button lifts with glow effect
       └─> Navigates to player page

OR

4. User clicks Next arrow
   └─> Manually advances to Slide 3
       └─> Auto-rotation resumes after 6s

OR

4. User clicks dot #4
   └─> Jumps directly to Slide 4
       └─> Auto-rotation resumes after 6s

OR

4. User presses → key
   └─> Advances to next slide
       └─> Auto-rotation resumes after 6s
```

---

## 🎬 **Example Slides**

### Slide 1:
```
┌─────────────────────────────────────────┐
│ Background: Band of Brothers poster     │
│                                         │
│ 🔴 Featured Tonight                     │
│ [ACTION] [ENGLISH] [2001]               │
│                                         │
│ Band of Brothers                        │
│ (2001)                                  │
│                                         │
│ An epic adventure film filled with      │
│ action and mystery.                     │
│                                         │
│ ⭐ 8.2  English  Movie                  │
│                                         │
│ [▶ Play Now]  [ℹ Details]              │
└─────────────────────────────────────────┘
```

### Slide 2:
```
┌─────────────────────────────────────────┐
│ Background: Kajolrekha poster           │
│                                         │
│ 🔴 Featured Tonight                     │
│ [FANTASY] [BENGALI] [2024]              │
│                                         │
│ Kajolrekha [Bengali]-1080P              │
│                                         │
│ A beautiful Bengali fantasy romance     │
│ drama with stunning visuals.            │
│                                         │
│ ⭐ 10  Bengali  Movie                   │
│                                         │
│ [▶ Play Now]  [ℹ Details]              │
└─────────────────────────────────────────┘
```

### Slide 3:
```
┌─────────────────────────────────────────┐
│ Background: Better Call Saul poster     │
│                                         │
│ 🔴 Featured Tonight                     │
│ [CRIME] [ENGLISH] [2015]                │
│                                         │
│ Better Call Saul                        │
│                                         │
│ The rise of Jimmy McGill to Saul       │
│ Goodman, criminal lawyer.               │
│                                         │
│ ⭐ 8.7  English  Series                 │
│                                         │
│ [▶ Play Now]  [ℹ Details]              │
└─────────────────────────────────────────┘
```

---

## 🎊 **Final Result**

### What You Get:
✅ **Professional carousel** like Netflix
✅ **Auto-rotating** featured content
✅ **Interactive controls** (arrows, dots, keyboard)
✅ **Smooth animations** (800ms transitions)
✅ **Responsive design** (mobile/tablet/desktop)
✅ **Full accessibility** (ARIA, keyboard nav)
✅ **Beautiful UI** (glassmorphism, gradients, glows)

### User Experience:
✅ **Engaging** - Auto-rotation keeps content fresh
✅ **Intuitive** - Clear navigation controls
✅ **Smooth** - Polished animations
✅ **Accessible** - Works with keyboard and screen readers
✅ **Responsive** - Perfect on all devices

---

## 🚀 **Ready to See It Live?**

### Run the development server:
```bash
cd frontend
npm run dev
```

### Open in browser:
```
http://localhost:5173
```

### Watch the magic happen! ✨

---

**Your portal now has a world-class hero carousel! 🎉**
