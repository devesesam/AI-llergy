# Dashboard UI Components

## Overview

The dashboard (`/dashboard`) is the main interface for venue owners to manage their venues, menus, and allergen information. This directive documents the component patterns, styling approach, and common modifications.

## Architecture

### Layout Structure

```
/dashboard (layout.tsx wraps all routes)
├── DashboardNav (sidebar + mobile header)
└── Main content area
    ├── /dashboard/page.tsx (overview)
    ├── /dashboard/venues/*
    └── /dashboard/profile
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/layout.tsx` | Root layout, renders DashboardNav |
| `src/app/dashboard/page.tsx` | Main dashboard with stats + venue list |
| `src/components/dashboard/DashboardNav.tsx` | Sidebar navigation |
| `src/components/dashboard/VenueTabs.tsx` | Tab navigation for venue detail pages |
| `src/components/dashboard/MenuTable.tsx` | Menu items table with allergen tags |
| `src/components/dashboard/EquipmentList.tsx` | Kitchen equipment cards (empty by default) |
| `src/components/dashboard/VenueSettings.tsx` | Venue settings form (name, slug) |
| `src/app/api/venues/[venueId]/route.ts` | API for updating venue settings |
| `src/app/globals.css` | BEM-style dashboard classes + modern utilities |

## Component Patterns

### Stats Cards

Location: [dashboard/page.tsx:63-84](../src/app/dashboard/page.tsx#L63-L84)

Stats cards display key metrics (venue count, menu item count). Pattern:

```tsx
import { Building2 } from 'lucide-react'

<div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
    <Building2 className="w-6 h-6 text-primary" />
  </div>
  <div>
    <span className="block text-3xl font-heading text-gray-900">{count}</span>
    <span className="text-sm text-gray-500">Label</span>
  </div>
</div>
```

**Key styles:**
- `bg-primary/10` - 10% opacity of brand gold for icon background
- `rounded-xl` on icon container, `rounded-2xl` on card
- `font-heading` for the number (Bogart serif)
- `flex-shrink-0` on icon container prevents squishing

### Empty States

Location: [dashboard/page.tsx:96-108](../src/app/dashboard/page.tsx#L96-L108)

Empty states should be inviting, not discouraging. Pattern:

```tsx
import { Store } from 'lucide-react'

<div className="text-center py-16 px-4 bg-white border border-gray-100 rounded-2xl">
  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
    <Store className="w-8 h-8 text-primary" />
  </div>
  <h3 className="text-xl font-heading text-gray-900 mb-2">Title</h3>
  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
    Helpful description text.
  </p>
  <Link href="..." className="inline-block px-6 py-3 bg-primary text-white ...">
    Call to Action
  </Link>
</div>
```

**DO NOT use:**
- Dashed borders (`border-dashed`) - looks unfinished
- Plain text without visual hierarchy
- Missing icons or illustrations

### Section Headers

Pattern for section headers with action buttons:

```tsx
import { Plus } from 'lucide-react'

<div className="flex justify-between items-center mb-6">
  <h2 className="text-xl font-heading text-gray-900">Section Title</h2>
  <Link href="..." className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
    <Plus className="w-4 h-4" />
    Action
  </Link>
</div>
```

**Key points:**
- `items-center` (not `items-end`) for proper vertical alignment
- Button includes icon for visual weight
- `text-sm` on button keeps it secondary to the heading

### Sidebar Navigation

Location: [DashboardNav.tsx](../src/components/dashboard/DashboardNav.tsx)

The sidebar uses Lucide icons (not emojis). Navigation items:

```tsx
import { LayoutDashboard, Building2, LogOut, type LucideIcon } from 'lucide-react'

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/venues', label: 'Venues', icon: Building2 },
]

// Render:
<item.icon className="w-5 h-5" />
```

## Styling Approach

The dashboard uses a **hybrid styling system**:

1. **Tailwind utilities** - For layout, spacing, responsive behavior
2. **CSS custom properties** - For colors, typography (defined in globals.css)
3. **BEM classes** - For complex dashboard components (`.dashboard-sidebar__link`)

### Color Tokens

```css
--color-primary: #f4c025;      /* Gold/amber brand color */
--color-primary-hover: #e0ac1a;
--color-background: #FDFCF8;   /* Cream background */
--color-surface: #FFFFFF;       /* Card backgrounds */
--color-text: #1F2937;          /* Dark gray text */
--color-text-muted: #6B7280;    /* Secondary text */
```

### Typography

- Headings: `font-heading` (Bogart serif)
- Body: `font-body` (Manrope sans-serif)

## Common Modifications

### Adding a new stat card

1. Import appropriate Lucide icon
2. Copy existing stat card pattern
3. Update icon, count source, and label

### Adding a new nav item

1. Add entry to `navItems` array in DashboardNav.tsx
2. Import Lucide icon
3. Create corresponding page in `/dashboard/`

### Modifying empty states

Always include:
- Centered icon in `bg-primary/10` circular container
- Clear heading with `font-heading`
- Helpful description (max-width constrained)
- Primary action button

### Menu Table (Inline Spreadsheet)

Location: [MenuTable.tsx](../src/components/dashboard/MenuTable.tsx)

The menu table is a spreadsheet-style inline editor for managing menu items:

```
| Dish Name | Ingredients | 🥗 | 🥦 | 🥜 | ... (23 allergen columns) | 🗑️ |
|-----------|-------------|----|----|----|-----------------------------|-----|
| [editable]| [editable]  | ☐  | ☑  | ☐  | toggle buttons              | del |
|-----------|-------------|----|----|----|-----------------------------|-----|
|           + Add new dish                                               |
```

**Key features:**
- **Inline editing**: Click any cell to edit dish name or ingredients
- **23 allergen columns**: All allergens from `lib/allergens.ts` as toggle buttons
- **Add row**: "+" button at bottom adds new row without page navigation
- **Delete row**: Trash icon appears on hover
- **Save button**: Shows "Unsaved changes" indicator, saves all changes at once
- **Browser warning**: `beforeunload` event prevents accidental navigation with unsaved changes
- **Horizontal scroll**: Table scrolls for all allergen columns

**API endpoint:** `PUT /api/venues/[venueId]/menu`
- Bulk saves all items (insert/update/delete in one request)
- Returns items with server-assigned IDs

**State management:**
- Tracks original items vs current items for dirty detection
- New rows get temporary IDs (`new_timestamp`)
- Server returns real IDs after save

### Venue Settings

Location: [VenueSettings.tsx](../src/components/dashboard/VenueSettings.tsx)

Settings tab allows venue owners/admins to:
- Update venue name
- Update public URL slug
- **Delete venue** (owners only, with confirmation)

```tsx
<VenueSettings venueId={venueId} venueName={venueName} venueSlug={venueSlug} />
```

**API endpoints:**
- `PATCH /api/venues/[venueId]` - Update settings (owners/admins)
- `DELETE /api/venues/[venueId]` - Delete venue (owners only)

**Delete Venue Safety:**
- "Danger Zone" section with red styling
- Two-step confirmation: click → type venue name → confirm
- Only owners can delete (not admins)
- TODO: Consider hiding in production

### Venue Information Tab

Location: [EquipmentList.tsx](../src/components/dashboard/EquipmentList.tsx)

Despite the filename, this is now a general "Venue Information" section:
- Header: "Venue Information"
- Button: "Add Venue Information" (links to `/dashboard/venues/[venueId]/info/new`)
- Placeholder page exists for future form

### VenueTabs

Location: [VenueTabs.tsx](../src/components/dashboard/VenueTabs.tsx)

Three tabs for venue management:
1. **Venue Information** - Equipment list (currently empty, future feature)
2. **Menu & Ingredients** - Menu table with allergen tags
3. **Settings** - Venue name and slug configuration

## Issues Fixed (February 2026)

| Issue | Fix | PR/Commit |
|-------|-----|-----------|
| Stats cards lacked visual weight | Added icons + accent backgrounds | - |
| Empty state used dashed border | Switched to solid card with icon | - |
| Emoji icons in sidebar | Replaced with Lucide React icons | - |
| Section header misalignment | Changed `items-end` to `items-center` | - |
| Menu table only showed 3 allergen columns | Switched to single column with tags (supports all 23) | - |
| Mock equipment data showing | Removed mock data, shows empty state by default | - |
| No settings tab | Added Settings tab with venue name/slug editing | - |
| Add Item button only in empty state | Added to table header (always visible) | - |
| Add Equipment button not working | Changed to Link, renamed to "Add Venue Information" | - |
| No way to delete venues | Added Danger Zone with typed confirmation | - |

## Dependencies

- `lucide-react` - Icon library (added Feb 2026)
- `framer-motion` - Animations (used in VenueTabs, EquipmentList)
