# Context Graph - UI Design Improvement Prompt

## Project Overview

Context Graph is a B2B SaaS platform that provides decision tracking and organizational memory for AI agents. It allows companies to:
- Log decisions made by their AI agents
- Search for similar past decisions using semantic search
- Capture human overrides and automatically extract policies
- Build institutional knowledge from agent behavior

**Target Users:** Technical teams at AI-first companies (developers, ML engineers, product managers)

**Competitive Inspiration:** Linear, Vercel, Raycast, Supabase dashboards - modern, dark, developer-focused tools

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Fonts:** Geist Sans + Geist Mono
- **Components:** Custom (no component library)
- **Icons:** Inline SVGs (Heroicons style)

---

## Current Design System

### Colors (Zinc-based dark theme)
```css
/* Primary */
--primary: #3b82f6;        /* Blue-500 */
--primary-hover: #2563eb;  /* Blue-600 */

/* Background */
--bg-base: #09090b;        /* Zinc-950 */
--bg-card: #18181b;        /* Zinc-900 */
--bg-elevated: #27272a;    /* Zinc-800 */

/* Text */
--text-primary: #fafafa;   /* Zinc-50 */
--text-secondary: #a1a1aa; /* Zinc-400 */
--text-muted: #71717a;     /* Zinc-500 */

/* Borders */
--border: #27272a;         /* Zinc-800 */
--border-hover: #3f3f46;   /* Zinc-700 */

/* Accents */
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
```

### Typography
- Headings: Geist Sans, semibold/bold
- Body: Geist Sans, regular
- Code/monospace: Geist Mono

### Components
- Cards: `rounded-xl`, subtle border, hover effects
- Buttons: `rounded-lg`, blue-600 primary
- Inputs: Dark background (zinc-800), zinc-700 border
- Badges/Pills: `rounded-full`, semi-transparent backgrounds

---

## Pages & Current State

### 1. Login (`/login`)
- Centered card on dark background
- Logo + app name
- Email/password form
- Toggle between sign in/sign up
- Success message for email confirmation

**Needs:** Could be more visually interesting, add subtle background pattern or gradient

### 2. Dashboard (`/`)
- Stats cards (Total Decisions, Extracted Policies, Active Agents)
- Quick action cards (Semantic Search, API Keys)
- Active agents list
- Getting started guide when empty

**Needs:** More visual hierarchy, better empty states, possibly charts/graphs for analytics

### 3. Decisions (`/decisions`)
- List of decision cards
- Each card shows: agent ID, action taken, confidence %, timestamp
- Loading skeleton states

**Needs:** Filtering, sorting, pagination, decision detail view

### 4. Search (`/search`)
- Large search input
- Results with similarity percentage badges
- Empty/initial state

**Needs:** Search suggestions, filters, better result cards

### 5. Policies (`/policies`)
- List of extracted policies
- Each shows: policy text, human explanation, date
- Info card explaining how policies work

**Needs:** Policy categories/tags, search, better visual treatment

### 6. Settings (`/settings`)
- Account section (email, role)
- Organization section (editable name, org ID)
- Sign out button

**Needs:** More settings options, better section separation

### 7. API Keys (`/settings/api-keys`)
- Create key form
- Keys table (name, prefix, created, last used)
- Revoke functionality
- Usage code example

**Needs:** Key permissions/scopes UI, usage stats per key

---

## Navigation Structure

**Sidebar (fixed, 256px wide):**
```
┌─────────────────────────┐
│ [Logo] Context Graph    │
├─────────────────────────┤
│ Dashboard               │
│ Decisions               │
│ Search                  │
│ Policies                │
├─────────────────────────┤
│ API Keys                │
│ Settings                │
├─────────────────────────┤
│ [Avatar] user@email.com │
│          Organization   │
└─────────────────────────┘
```

---

## Design Goals

### Aesthetic Direction
1. **Modern & Minimal** - Clean lines, generous whitespace, no clutter
2. **Developer-Focused** - Monospace fonts for IDs/code, dark theme, technical feel
3. **Premium SaaS** - Polished, professional, enterprise-ready appearance
4. **Subtle Depth** - Layered cards, soft shadows, micro-interactions

### Specific Improvements Wanted

1. **Visual Interest**
   - Add subtle background patterns or gradients
   - More color accents beyond just blue
   - Better use of the success/warning/error palette

2. **Data Visualization**
   - Charts for decision trends over time
   - Confidence distribution visualization
   - Agent activity heatmaps

3. **Micro-interactions**
   - Smooth transitions between pages
   - Hover state animations
   - Loading state improvements
   - Success/error feedback animations

4. **Empty States**
   - Illustrated empty states (not just icons)
   - Clearer CTAs
   - Onboarding guidance

5. **Information Hierarchy**
   - Better section headers
   - Clearer visual grouping
   - Improved scanability

6. **Mobile Responsiveness**
   - Collapsible sidebar
   - Mobile-optimized layouts
   - Touch-friendly interactions

---

## Component Patterns to Improve

### Cards
Current: Simple border + background
Wanted: Subtle gradients, better shadows, accent borders on hover

### Tables
Current: Basic with dividers
Wanted: Row hover states, better header styling, sortable columns

### Forms
Current: Functional but plain
Wanted: Better focus states, inline validation, helper text styling

### Buttons
Current: Solid colors
Wanted: Subtle gradients, better disabled states, icon alignment

### Navigation
Current: Simple active states
Wanted: Animated indicators, better hover previews

---

## Brand Elements

- **Logo:** Lightning bolt icon in blue square (represents speed/decisions)
- **Name:** Context Graph
- **Tagline:** "Decision traces and organizational memory for AI agents"
- **Brand Color:** Blue (#3b82f6) - represents trust, technology

---

## Files to Reference

Key UI files in the codebase:
- `src/app/globals.css` - Design tokens and base styles
- `src/components/Sidebar.tsx` - Navigation component
- `src/components/DashboardLayout.tsx` - Layout wrapper
- `src/app/page.tsx` - Dashboard
- `src/app/login/page.tsx` - Auth page
- `src/app/decisions/page.tsx` - Decisions list
- `src/app/search/page.tsx` - Search interface
- `src/app/policies/page.tsx` - Policies list
- `src/app/settings/page.tsx` - Settings
- `src/app/settings/api-keys/page.tsx` - API key management

---

## Output Expected

Please provide:
1. Updated color palette recommendations
2. Component design improvements (with Tailwind classes)
3. New UI patterns for data visualization
4. Animation/transition specifications
5. Mobile responsive breakpoint strategies
6. Any new components that would enhance the UX

Focus on making the UI feel more polished, premium, and visually engaging while maintaining the developer-focused, dark theme aesthetic.
