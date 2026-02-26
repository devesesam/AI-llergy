# Design System

## Overview

AI-llergy uses a "Lush Light Theme" design system with warm cream backgrounds, gold/amber accents, and serif headings. This directive documents the visual language and patterns.

## Color Palette

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#f4c025` | Gold/amber brand color, CTAs, active states |
| `--color-primary-hover` | `#e0ac1a` | Hover state for primary |

### Neutrals

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#FDFCF8` | Page background (cream) |
| `--color-surface` | `#FFFFFF` | Cards, modals, panels |
| `--color-surface-hover` | `#F9F9F9` | Hover state for surfaces |
| `--color-text` | `#1F2937` | Primary text (dark gray) |
| `--color-text-muted` | `#6B7280` | Secondary/helper text |
| `--color-text-inverse` | `#FFFFFF` | Text on dark backgrounds |

### Severity Colors (Allergen System)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-severity-preference` | `#22c55e` | Green - dietary preference |
| `--color-severity-allergy` | `#f97316` | Orange - allergy |
| `--color-severity-critical` | `#ef4444` | Red - life-threatening |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `rgba(0,0,0,0.05)` | Very light dividers |
| `--border-light` | `rgba(0,0,0,0.1)` | Card borders, inputs |

## Typography

### Fonts

| Token | Value | Usage |
|-------|-------|-------|
| `--font-heading` | Bogart, Georgia, serif | Headings, large numbers |
| `--font-body` | Manrope, Helvetica Neue, sans-serif | Body text, UI |

### Classes

```css
font-heading  /* Use for h1, h2, h3, stat numbers */
font-body     /* Default, rarely needed explicitly */
```

### Heading Styles

```tsx
<h1 className="text-3xl font-heading text-gray-900">Page Title</h1>
<h2 className="text-xl font-heading text-gray-900">Section Title</h2>
<h3 className="text-lg font-heading text-gray-900">Card Title</h3>
```

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 0.5rem (8px) | Tight gaps |
| `--spacing-sm` | 1rem (16px) | Standard gaps |
| `--spacing-md` | 1.5rem (24px) | Section padding |
| `--spacing-lg` | 2rem (32px) | Large sections |
| `--spacing-xl` | 3rem (48px) | Page-level spacing |

Tailwind equivalents: `gap-2`, `gap-4`, `gap-6`, `p-4`, `p-6`, `p-8`, `mb-6`, `mb-12`

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Inputs, small buttons |
| `--radius-md` | 12px | Cards, dropdowns |
| `--radius-lg` | 24px | Large cards, modals |
| `--radius-btn` | 100px | Pill-shaped buttons |

Tailwind equivalents: `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`

## Shadow System

Modern layered shadows for depth and hierarchy:

| Class | Effect | Usage |
|-------|--------|-------|
| `shadow-card` | Subtle depth | Cards at rest |
| `shadow-card-hover` | Elevated depth | Cards on hover |

```css
.shadow-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
}
.shadow-card-hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

## Component Patterns

### Cards

```tsx
<div className="bg-white p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
  {/* Card content */}
</div>
```

### Button System

Use the `btn-base` class with size modifiers:

| Class | Padding | Font Size | Radius |
|-------|---------|-----------|--------|
| `btn-sm` | 0.625rem 1rem | 0.875rem | 0.5rem |
| `btn-md` | 0.875rem 1.5rem | 0.9375rem | 0.625rem |
| `btn-lg` | 1rem 2rem | 1rem | 0.75rem |

```tsx
// Primary button
<button className="btn-base btn-md bg-primary text-white hover:bg-primary/90 shadow-sm">
  <Plus className="w-5 h-5" />
  Button Text
</button>

// Secondary button
<button className="btn-base btn-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
  <Filter className="w-4 h-4" />
  Filter
</button>

// Ghost button
<button className="btn-base btn-sm btn-ghost text-gray-500 hover:text-primary">
  <Pencil className="w-4 h-4" />
  Edit
</button>
```

### Badge System

Status badges with semantic colors:

| Class | Background | Text Color | Usage |
|-------|------------|------------|-------|
| `badge-success` | Green 10% | Green | Positive states, Low risk |
| `badge-warning` | Amber 10% | Amber | Caution, Medium risk |
| `badge-danger` | Red 10% | Red | Alerts, High risk |
| `badge-neutral` | Gray 10% | Gray | Informational, roles |

```tsx
<span className="badge badge-success">Low Risk</span>
<span className="badge badge-warning">Medium Risk</span>
<span className="badge badge-danger">High Risk</span>
<span className="badge badge-neutral">owner</span>
```

### Tag/Pill System

For allergen tags and labels:

```tsx
<span className="tag">Dairy</span>

// Or inline amber style for allergens in tables:
<span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
  Gluten
</span>
```

### Inputs

```tsx
<input
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
  type="text"
/>
```

Or using BEM class:
```tsx
<input className="dashboard-form__input" type="text" />
```

### Icon Accent Containers

```tsx
// Square (stats cards)
<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
  <Icon className="w-6 h-6 text-primary" />
</div>

// Circle (empty states)
<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
  <Icon className="w-8 h-8 text-primary" />
</div>
```

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | Mobile-first | Base styles |
| `md:` | 768px | Tablet/desktop |
| `lg:` | 1024px | Large screens |

Dashboard-specific:
- Sidebar: Fixed on desktop, slide-out drawer on mobile
- Mobile header appears below 768px
- Content padding: `p-4` mobile, `p-8` desktop

## Styling Approach

The codebase uses a **hybrid system**:

1. **Tailwind CSS v4** - Primary utility classes
2. **CSS Custom Properties** - Theme tokens in `globals.css`
3. **BEM Classes** - Complex components (`.dashboard-sidebar__link`)

### When to use what

| Scenario | Approach |
|----------|----------|
| Layout, spacing, responsive | Tailwind utilities |
| Colors, typography | CSS custom properties via Tailwind (`text-primary`, `font-heading`) |
| Complex multi-state components | BEM classes in globals.css |
| One-off overrides | Tailwind utilities |

## Files Reference

| File | Contains |
|------|----------|
| `src/app/globals.css` | All CSS variables, BEM classes, font imports |
| `postcss.config.mjs` | Tailwind CSS plugin config |
| `tailwind.config.ts` | Extended theme (if exists) |

## Anti-Patterns (Avoid)

- Inline styles except for truly dynamic values
- Dashed borders for empty states (looks unfinished)
- Emoji icons (use Lucide React)
- Hardcoded color values (use tokens)
- Creating new BEM classes when Tailwind suffices
