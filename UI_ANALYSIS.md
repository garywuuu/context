# UI Analysis Report

## Current State Overview

### Pages
| Page | Path | Theme | Status |
|------|------|-------|--------|
| Dashboard | `/` | Dark (gray-950) | Functional, basic |
| Login | `/login` | Light (gray-50) | Functional, plain |
| Test | `/test` | None | Debug only |

### Current Issues

## 1. Inconsistent Design Language

**Problem:** Dashboard uses dark theme, login uses light theme.

```
Dashboard: bg-gray-950, text-gray-100
Login:     bg-gray-50, text-gray-900
```

**Impact:** Jarring user experience when transitioning between pages.

## 2. No Navigation Structure

**Problem:** No persistent navigation. Users can't:
- Access settings
- Manage API keys
- View their organization
- Log out

**Current:** Only tab navigation within the dashboard (decisions/search/policies)

**Needed:**
- Sidebar or top navigation
- User menu with logout
- Settings page
- API keys management

## 3. No User Context

**Problem:** After login, user sees dashboard but:
- No indication of who's logged in
- No organization name displayed
- No way to log out
- No account settings

## 4. Missing Critical Pages

| Page | Purpose | Status |
|------|---------|--------|
| Settings | Account & org settings | Missing |
| API Keys | Generate/revoke keys | Missing |
| Team | Invite members | Missing |
| Analytics | Usage stats | Missing |

## 5. Visual Design Issues

### Typography
- Uses Geist fonts but inconsistently
- No clear hierarchy in some areas
- Login form text is small

### Colors
- Dashboard: Dark theme is OK but monotonous
- Login: Generic light theme, no brand identity
- No accent colors beyond blue

### Spacing
- Generally OK but inconsistent padding
- Cards could breathe more

### Components
- Basic form inputs, no polish
- Plain buttons
- No hover/focus states beyond color change
- No animations or transitions

## 6. Specific Page Issues

### Dashboard (`/`)
**Good:**
- Clean tab structure
- Decision cards are readable
- Search is functional

**Bad:**
- No loading states
- API Reference section feels out of place in dashboard
- Empty states are plain
- No quick actions or stats

### Login (`/login`)
**Good:**
- Form works
- Toggle between signup/signin

**Bad:**
- Generic styling
- No branding/logo
- Plain white box on gray
- No visual interest

## 7. Responsive Design

- Basic responsive with max-w-6xl
- Not tested on mobile
- Likely breaks on small screens

## 8. Accessibility

- Basic labels present
- Missing: focus rings on some elements
- Missing: aria labels
- Missing: keyboard navigation

---

## Recommended Improvements

### Phase 1: Foundation (Highest Priority)
1. **Unified theme** - Pick dark or light, be consistent
2. **Navigation shell** - Sidebar with user menu
3. **Logout functionality** - Add sign out button

### Phase 2: Core Pages
4. **Settings page** - Basic account/org settings
5. **API Keys page** - Generate, view, revoke keys
6. **Polish login** - Add logo, match theme

### Phase 3: Polish
7. **Loading states** - Skeletons and spinners
8. **Empty states** - Better illustrations/copy
9. **Animations** - Subtle transitions
10. **Analytics dashboard** - Stats and charts

---

## Proposed Design System

### Theme: Dark Mode First
Modern SaaS apps (Linear, Vercel, Raycast) use dark themes effectively.

### Colors
```css
/* Primary */
--primary: #3b82f6;      /* Blue-500 */
--primary-hover: #2563eb; /* Blue-600 */

/* Background */
--bg-base: #09090b;       /* Zinc-950 */
--bg-card: #18181b;       /* Zinc-900 */
--bg-elevated: #27272a;   /* Zinc-800 */

/* Text */
--text-primary: #fafafa;   /* Zinc-50 */
--text-secondary: #a1a1aa; /* Zinc-400 */
--text-muted: #71717a;     /* Zinc-500 */

/* Borders */
--border: #27272a;         /* Zinc-800 */
--border-hover: #3f3f46;   /* Zinc-700 */

/* Accents */
--success: #22c55e;        /* Green-500 */
--warning: #eab308;        /* Yellow-500 */
--error: #ef4444;          /* Red-500 */
```

### Typography
- Headings: Geist Sans, Bold
- Body: Geist Sans, Regular
- Code: Geist Mono

### Components
- Cards: Rounded-xl, subtle border
- Buttons: Rounded-lg, clear states
- Inputs: Dark background, visible focus

### Layout
```
┌────────────────────────────────────────────┐
│  Logo        Nav                User Menu  │
├────────┬───────────────────────────────────┤
│        │                                   │
│  Side  │         Main Content              │
│  bar   │                                   │
│        │                                   │
│        │                                   │
└────────┴───────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Create Layout Shell (1 hour)
- Sidebar navigation
- Top bar with user menu
- Logout functionality

### Step 2: Unify Theme (30 min)
- Update globals.css with design tokens
- Make login page dark

### Step 3: Create Settings & API Keys Pages (2 hours)
- Settings page with org info
- API keys management with generate/revoke

### Step 4: Polish Existing Pages (1 hour)
- Improve dashboard cards
- Better empty states
- Loading skeletons

### Step 5: Add Analytics (1-2 hours)
- Key metrics cards
- Simple charts if time permits

**Total estimated time: 5-6 hours**
