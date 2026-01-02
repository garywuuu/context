# Context Graph Design System

## Product Philosophy

Context Graph is **infrastructure for AI agent accountability**. It helps organizations understand, audit, and improve how their AI agents make decisions.

### Core Values
1. **Clarity** - Complex data presented simply
2. **Trust** - Professional, reliable, enterprise-ready
3. **Efficiency** - Dense information without overwhelm
4. **Technical** - Built for developers and ML engineers

### Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Data-First** | Information hierarchy over decoration | Minimal chrome, maximum content |
| **Scannable** | Quick visual parsing | Consistent patterns, clear typography |
| **Precise** | Technical accuracy | Monospace for IDs, exact numbers |
| **Calm** | Reduce cognitive load | Muted palette, subtle interactions |
| **Fast** | Performance matters | Minimal animations, instant feedback |

---

## Color System

### Philosophy
Dark theme optimized for extended use. High contrast for readability. Color reserved for meaning.

### Palette

```
┌─────────────────────────────────────────────────────────────┐
│  BACKGROUNDS                                                 │
├─────────────────────────────────────────────────────────────┤
│  Base        #09090b  zinc-950   Page background            │
│  Raised      #18181b  zinc-900   Cards, panels              │
│  Elevated    #27272a  zinc-800   Hover states, inputs       │
│  Overlay     #3f3f46  zinc-700   Dropdowns, modals          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TEXT                                                        │
├─────────────────────────────────────────────────────────────┤
│  Primary     #fafafa  zinc-50    Headings, important text   │
│  Secondary   #a1a1aa  zinc-400   Body text, descriptions    │
│  Tertiary    #71717a  zinc-500   Labels, placeholders       │
│  Muted       #52525b  zinc-600   Disabled, timestamps       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BORDERS                                                     │
├─────────────────────────────────────────────────────────────┤
│  Default     #27272a  zinc-800   Card borders               │
│  Subtle      #3f3f46  zinc-700   Dividers, hover borders    │
│  Focus       #3b82f6  blue-500   Focus rings                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PRIMARY (Interactive)                                       │
├─────────────────────────────────────────────────────────────┤
│  Default     #3b82f6  blue-500   Buttons, links, focus      │
│  Hover       #2563eb  blue-600   Hover state                │
│  Active      #1d4ed8  blue-700   Pressed state              │
│  Subtle      #1e3a5f  blue-900   Backgrounds, badges        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SEMANTIC                                                    │
├─────────────────────────────────────────────────────────────┤
│  Success     #22c55e  green-500  Positive states            │
│  Success/bg  #14532d  green-900  Success backgrounds        │
│  Warning     #f59e0b  amber-500  Caution states             │
│  Warning/bg  #78350f  amber-900  Warning backgrounds        │
│  Error       #ef4444  red-500    Error states               │
│  Error/bg    #7f1d1d  red-900    Error backgrounds          │
│  Info        #3b82f6  blue-500   Informational              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DATA VISUALIZATION                                          │
├─────────────────────────────────────────────────────────────┤
│  Agent       #8b5cf6  violet-500 Agent-related data         │
│  Decision    #06b6d4  cyan-500   Decision metrics           │
│  Policy      #f59e0b  amber-500  Policy highlights          │
│  Context     #ec4899  pink-500   Context information        │
└─────────────────────────────────────────────────────────────┘
```

### Usage Rules
1. **Blue** = Interactive (buttons, links, selections)
2. **Green** = Success/High confidence (>80%)
3. **Amber** = Warning/Medium confidence (50-80%)
4. **Red** = Error/Low confidence (<50%)
5. **Violet** = Agent-related information
6. **Cyan** = Decision/Data metrics

---

## Typography

### Font Stack
```css
--font-sans: "Geist", system-ui, sans-serif;
--font-mono: "Geist Mono", ui-monospace, monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 30px | 700 | 1.2 | Page titles (rare) |
| Heading 1 | 24px | 700 | 1.3 | Page headers |
| Heading 2 | 18px | 600 | 1.4 | Section headers |
| Heading 3 | 16px | 600 | 1.4 | Card headers |
| Body | 14px | 400 | 1.5 | Default text |
| Body Small | 13px | 400 | 1.5 | Secondary text |
| Caption | 12px | 500 | 1.4 | Labels, badges |
| Tiny | 11px | 400 | 1.3 | Timestamps, metadata |

### Tailwind Classes
```
text-3xl font-bold     → Display
text-2xl font-bold     → Heading 1
text-lg font-semibold  → Heading 2
text-base font-semibold → Heading 3
text-sm                → Body
text-[13px]            → Body Small
text-xs font-medium    → Caption
text-[11px]            → Tiny
```

### Monospace Usage
Use `font-mono` for:
- Agent IDs
- Decision IDs
- API keys (prefix)
- Code snippets
- Timestamps (optional)
- Numeric data

---

## Spacing System

### Base Unit
4px base unit, 8px primary increment.

### Scale
```
--space-0: 0px
--space-1: 4px    (0.25rem)  - Inline spacing
--space-2: 8px    (0.5rem)   - Tight spacing
--space-3: 12px   (0.75rem)  - Compact elements
--space-4: 16px   (1rem)     - Default gap
--space-5: 20px   (1.25rem)  - Comfortable
--space-6: 24px   (1.5rem)   - Component padding
--space-8: 32px   (2rem)     - Section spacing
--space-10: 40px  (2.5rem)   - Large sections
--space-12: 48px  (3rem)     - Page sections
--space-16: 64px  (4rem)     - Major divisions
--space-20: 80px  (5rem)     - Empty states
```

### Component Spacing

| Component | Internal Padding | External Gap |
|-----------|------------------|--------------|
| Page | 32px | - |
| Section | - | 40px below |
| Card | 20-24px | 12-16px between |
| Card header | - | 12px below |
| Form field | 10-12px vertical | 16-20px between |
| Button | 10px vertical, 16-20px horizontal | 12px between |
| Badge | 4-6px vertical, 8-10px horizontal | 8px between |

### Layout Constants
```
--sidebar-width: 256px
--page-max-width: 1200px
--content-max-width: 896px (max-w-4xl)
```

---

## Border Radius

```
--radius-sm: 6px    - Small elements, badges
--radius-md: 8px    - Buttons, inputs
--radius-lg: 12px   - Cards, panels
--radius-xl: 16px   - Modals, large cards
--radius-full: 9999px - Pills, avatars
```

### Usage
```
rounded-md  → Buttons, inputs, small cards
rounded-lg  → Standard cards
rounded-xl  → Feature cards, modals
rounded-full → Badges, avatars, pills
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
--shadow-glow: 0 0 20px -5px rgb(59 130 246 / 0.5);
```

### Usage
- Cards at rest: No shadow (border only)
- Cards on hover: `shadow-md`
- Modals/Dropdowns: `shadow-lg`
- Focus states: `shadow-glow` (blue)

---

## Components

### Buttons

**Primary** (main actions)
```html
<button class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white
               font-medium rounded-lg transition-colors">
```

**Secondary** (supporting actions)
```html
<button class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white
               border border-zinc-700 font-medium rounded-lg transition-colors">
```

**Ghost** (tertiary actions)
```html
<button class="px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800
               font-medium rounded-lg transition-colors">
```

**Danger** (destructive actions)
```html
<button class="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white
               font-medium rounded-lg transition-colors">
```

### Cards

**Standard Card**
```html
<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5
            hover:border-zinc-700 transition-colors">
```

**Interactive Card** (clickable)
```html
<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5
            hover:border-zinc-700 hover:bg-zinc-800/50
            transition-all cursor-pointer">
```

**Stat Card**
```html
<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
  <div class="flex items-center gap-3 mb-3">
    <div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400
                flex items-center justify-center">
      <!-- Icon -->
    </div>
    <span class="text-sm text-zinc-400">Label</span>
  </div>
  <div class="text-3xl font-bold text-white">Value</div>
</div>
```

### Badges

**Status Badge**
```html
<span class="inline-flex items-center px-2.5 py-1 rounded-full
             text-xs font-medium bg-green-500/10 text-green-400">
  Active
</span>
```

**Confidence Badge**
```html
<!-- High: >80% -->
<span class="text-xs font-medium px-2 py-1 rounded-full
             bg-green-500/10 text-green-400">95%</span>

<!-- Medium: 50-80% -->
<span class="text-xs font-medium px-2 py-1 rounded-full
             bg-amber-500/10 text-amber-400">72%</span>

<!-- Low: <50% -->
<span class="text-xs font-medium px-2 py-1 rounded-full
             bg-red-500/10 text-red-400">35%</span>
```

**Match/Similarity Badge**
```html
<span class="text-xs font-medium px-2.5 py-1 rounded-full
             bg-cyan-500/10 text-cyan-400">92% match</span>
```

### Inputs

**Text Input**
```html
<input type="text"
       class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700
              rounded-lg text-white placeholder-zinc-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent transition-colors" />
```

**Search Input**
```html
<div class="relative">
  <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500">
    <!-- Search icon -->
  </svg>
  <input type="text"
         class="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700
                rounded-xl text-white placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-transparent" />
</div>
```

### Empty States

```html
<div class="text-center py-16">
  <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800
              flex items-center justify-center">
    <!-- Icon in zinc-600 -->
  </div>
  <h3 class="text-lg font-medium text-zinc-300 mb-2">No decisions yet</h3>
  <p class="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
    Description text here
  </p>
  <button class="...">CTA Button</button>
</div>
```

### Data Rows

```html
<div class="divide-y divide-zinc-800">
  <div class="px-5 py-4 flex items-center gap-4 hover:bg-zinc-800/50
              transition-colors">
    <div class="flex-shrink-0"><!-- Icon/Avatar --></div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-white truncate">Title</p>
      <p class="text-xs text-zinc-500">Subtitle</p>
    </div>
    <div class="flex-shrink-0"><!-- Actions/Status --></div>
  </div>
</div>
```

---

## Page Layout

### Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (256px fixed)   │  Main Content                    │
│                         │  ┌─────────────────────────────┐ │
│ ┌─────────────────────┐ │  │ Page Header (mb-10)         │ │
│ │ Logo                │ │  │ - Title (text-2xl bold)     │ │
│ └─────────────────────┘ │  │ - Description (text-sm)     │ │
│                         │  └─────────────────────────────┘ │
│ ┌─────────────────────┐ │                                  │
│ │ Nav Items           │ │  ┌─────────────────────────────┐ │
│ │ - Dashboard         │ │  │ Section (mb-10)             │ │
│ │ - Decisions         │ │  │ - Section header (mb-4)     │ │
│ │ - Search            │ │  │ - Content                   │ │
│ │ - Policies          │ │  └─────────────────────────────┘ │
│ └─────────────────────┘ │                                  │
│                         │  ┌─────────────────────────────┐ │
│ ┌─────────────────────┐ │  │ Section                     │ │
│ │ Settings            │ │  └─────────────────────────────┘ │
│ │ - API Keys          │ │                                  │
│ │ - Settings          │ │                                  │
│ └─────────────────────┘ │                                  │
│                         │                                  │
│ ┌─────────────────────┐ │                                  │
│ │ User Info           │ │                                  │
│ └─────────────────────┘ │                                  │
└─────────────────────────────────────────────────────────────┘
```

### Page Template
```html
<DashboardLayout>
  <div class="p-8">
    <div class="max-w-4xl">
      <!-- Page Header -->
      <div class="mb-10">
        <h1 class="text-2xl font-bold text-white mb-2">Page Title</h1>
        <p class="text-sm text-zinc-400">Page description</p>
      </div>

      <!-- Section -->
      <section class="mb-10">
        <h2 class="text-base font-semibold text-white mb-4">Section Title</h2>
        <!-- Content -->
      </section>
    </div>
  </div>
</DashboardLayout>
```

---

## Motion

### Principles
1. **Subtle** - Motion should not distract
2. **Fast** - 150-200ms for most transitions
3. **Purposeful** - Only animate meaningful changes

### Durations
```css
--duration-fast: 100ms    /* Micro-interactions */
--duration-normal: 150ms  /* Default transitions */
--duration-slow: 200ms    /* Larger elements */
--duration-enter: 200ms   /* Elements entering */
--duration-exit: 150ms    /* Elements exiting */
```

### Easing
```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1)  /* Smooth */
--ease-in: cubic-bezier(0.4, 0, 1, 1)         /* Accelerate */
--ease-out: cubic-bezier(0, 0, 0.2, 1)        /* Decelerate */
```

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Pulse (for loading) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Iconography

### Style
- Stroke width: 1.5px (default) or 2px (bold)
- Size: 16px (small), 20px (default), 24px (large)
- Color: Inherits from text color

### Common Icons (Heroicons Outline)
```
Dashboard:  HomeIcon / Squares2X2Icon
Decisions:  ClipboardDocumentCheckIcon
Search:     MagnifyingGlassIcon
Policies:   DocumentTextIcon
Settings:   Cog6ToothIcon
API Keys:   KeyIcon
User:       UserCircleIcon
Agent:      CpuChipIcon / CommandLineIcon
Success:    CheckCircleIcon
Warning:    ExclamationTriangleIcon
Error:      XCircleIcon
Info:       InformationCircleIcon
```

---

## Accessibility

### Focus States
All interactive elements must have visible focus:
```css
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
focus:ring-offset-zinc-900
```

### Color Contrast
- Text on backgrounds: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- UI components: Minimum 3:1 ratio

### ARIA
- Use proper semantic HTML
- Include aria-labels for icon buttons
- Use aria-live for dynamic content

---

## Responsive Breakpoints

```css
sm:  640px   /* Large phones */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large screens */
```

### Mobile Considerations
- Sidebar collapses to hamburger menu below `lg`
- Cards stack vertically below `md`
- Touch targets minimum 44x44px

---

## File Structure

```
src/
├── app/
│   ├── globals.css          # Design tokens & base styles
│   └── ...pages
├── components/
│   ├── ui/                   # Primitive components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── layout/               # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── PageHeader.tsx
│   └── features/             # Feature-specific components
│       ├── DecisionCard.tsx
│       ├── PolicyCard.tsx
│       └── ...
└── lib/
    └── utils.ts              # cn() helper, etc.
```
