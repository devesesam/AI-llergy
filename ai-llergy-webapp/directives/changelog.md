# Changelog

## Overview

This directive tracks significant changes, fixes, and improvements to the AI-llergy webapp. Use this as a reference for understanding what was changed and why.

---

## February 2026 - Dashboard Modernization (Phase 2)

### Visual Design Overhaul

**Problem:** Dashboard looked dated ("90s style") with poor button proportions, flat design, and cramped elements.

**Solution:** Comprehensive CSS utility system and component updates.

#### CSS Additions (globals.css)

| Utility | Purpose |
|---------|---------|
| `.shadow-card` | Layered shadow for cards at rest |
| `.shadow-card-hover` | Elevated shadow for hover states |
| `.btn-base` | Base button styles (flex, gap, transitions) |
| `.btn-sm`, `.btn-md`, `.btn-lg` | Button size variants |
| `.badge` | Pill-shaped status badges |
| `.badge-success/warning/danger/neutral` | Badge color variants |
| `.tag` | Allergen tag styling |

#### Files Modified

| File | Changes |
|------|---------|
| `src/app/globals.css` | Added shadow system, button system, badge system |
| `src/app/dashboard/page.tsx` | Stats cards with gradients, venue cards with icons/badges |
| `src/components/dashboard/DashboardNav.tsx` | Emoji icons → Lucide React |
| `src/components/dashboard/EquipmentList.tsx` | Modern cards, proper badges, empty state |
| `src/components/dashboard/MenuTable.tsx` | Proper button sizing, allergen tags column |

### Functionality Improvements

#### Settings Tab Added

**Problem:** No way to edit venue settings from dashboard.

**Solution:**
- Created `VenueSettings.tsx` component
- Added Settings tab to `VenueTabs.tsx`
- Created `PATCH /api/venues/[venueId]` endpoint

**Files Created:**
- `src/components/dashboard/VenueSettings.tsx`
- `src/app/api/venues/[venueId]/route.ts`

**Files Modified:**
- `src/components/dashboard/VenueTabs.tsx`
- `src/app/dashboard/venues/[venueId]/page.tsx`

#### Menu Table Allergen Display

**Problem:** Menu table only showed 3 allergen columns (Dairy, Gluten, Nuts) as toggles.

**Solution:**
- Replaced individual toggle columns with single "Allergens" column
- Display allergens as amber-colored tags
- Scalable for all 23 allergens

**Before:**
```
| Dish | Ingredients | Dairy | Gluten | Nuts | Actions |
```

**After:**
```
| Dish | Ingredients | Allergens (tags) | Actions |
```

#### Add Item Button

**Problem:** "Add Menu Item" button only appeared in empty state.

**Solution:** Added persistent "Add Item" button to table header next to Filter/Export.

#### Mock Data Removed

**Problem:** Equipment list showed hardcoded mock data.

**Solution:**
- Removed mock equipment array
- Shows clean empty state by default
- Added `// TODO: Fetch from Supabase` comment

### Bug Fixes

| Bug | Fix | File |
|-----|-----|------|
| Back button invisible on venue detail page | Changed `text-white/50` to `text-gray-500` | `[venueId]/page.tsx` |
| Button text not fitting | Created proper button sizing system | `globals.css` |
| Empty state layout broken | Added `flex flex-col items-center justify-center` | Multiple files |

---

## Directives Created/Updated

| Directive | Status | Purpose |
|-----------|--------|---------|
| `dashboard-ui-components.md` | Updated | Component patterns, file reference |
| `design-system.md` | Updated | Shadow, button, badge systems |
| `icon-system.md` | Existing | Lucide React usage |
| `api-endpoints.md` | Created | API route documentation |
| `changelog.md` | Created | This file |

---

## February 2026 - Functionality Updates (Phase 3)

### Add Venue Information Button Fixed

**Problem:** "Add Equipment" button didn't work and was too equipment-specific.

**Solution:**
- Renamed to "Add Venue Information" (more general)
- Changed from `<button>` to `<Link>` pointing to `/dashboard/venues/[venueId]/info/new`
- Created placeholder page for future venue information form
- Changed icon from ChefHat to Info

**Files Modified:**
- `src/components/dashboard/EquipmentList.tsx` - Renamed, added Link
- `src/app/dashboard/venues/[venueId]/info/new/page.tsx` - New placeholder page

### Delete Venue Functionality

**Problem:** No way to delete venues during testing.

**Solution:**
- Added "Danger Zone" section to VenueSettings component
- Two-step confirmation: click button, then type venue name to confirm
- Created `DELETE /api/venues/[venueId]` endpoint
- Only venue owners can delete (not admins)

**Files Modified:**
- `src/components/dashboard/VenueSettings.tsx` - Added danger zone UI
- `src/app/api/venues/[venueId]/route.ts` - Added DELETE handler

**Security Features:**
- Typed confirmation required (must type exact venue name)
- Only owners can delete (role check)
- TODO comment added to consider hiding in production

---

## February 2026 - Menu Table Redesign (Phase 4)

### Inline-Editable Spreadsheet Interface

**Problem:** Menu table required navigating to separate pages to add/edit items. Only showed 3 allergens as tags.

**Solution:** Complete redesign as spreadsheet-style inline editing:

**New Features:**
- All 23 allergens displayed as toggle columns (2 dietary + 21 allergens)
- Inline editing for dish name and ingredients (click to edit)
- Toggle buttons for each allergen per dish
- "Add new dish" button at bottom of table (+ row)
- Save Changes button with dirty state tracking
- Browser `beforeunload` warning for unsaved changes
- Delete row button (appears on hover)
- Horizontal scroll for all allergen columns
- Success/error messages on save

**Files Modified:**
- `src/components/dashboard/MenuTable.tsx` - Complete rewrite

**Files Created:**
- `src/app/api/venues/[venueId]/menu/route.ts` - PUT endpoint for bulk save

**API Behavior:**
- PUT request with all items
- Inserts new items (IDs starting with `new_`)
- Updates existing items
- Deletes items removed from the list
- Returns all items with server-assigned IDs

### Allergen Data Format Fix

**Problem:** Allergens showing "None listed" even though data existed in Supabase.

**Root Cause:** Data format mismatch:
- **Database stores**: `allergen_profile: {dairy_free: true, gluten_free: false, ...}` (JSONB object)
- **Component expected**: `allergens: ["dairy", "gluten", ...]` (array of IDs)

**Solution:** Added conversion utilities in MenuTable:
- `allergenIdToProfileKey()` - Maps "dairy" → "dairy_free"
- `profileKeyToAllergenId()` - Maps "dairy_free" → "dairy"
- `profileToArray()` - Converts JSONB object to array for UI
- `arrayToProfile()` - Converts array back to JSONB for saving

**Key mapping rules:**
| Allergen ID | Profile Key |
|-------------|-------------|
| `dairy` | `dairy_free` |
| `gluten` | `gluten_free` |
| `peanuts` | `peanut_free` |
| `treenuts` | `tree_nut_free` |

---

## Known TODOs

| Item | Priority | Notes |
|------|----------|-------|
| Venue information form | Medium | Placeholder page exists at `/info/new` |
| Import function (CSV/Sheets) | Low | User-requested, needs design |
| Hide/protect delete venue in production | Low | Currently visible for testing |

---

## Migration Notes for Future Agents

### When modifying dashboard components:
1. Use `btn-base` classes for all buttons (not inline padding)
2. Use `badge` classes for status indicators
3. Use `shadow-card` for card elevation
4. Use Lucide React icons (see `icon-system.md`)

### When adding new API endpoints:
1. Follow pattern in `api-endpoints.md`
2. Use `createServerClient` from `@supabase/ssr`
3. Check RLS policies if accessing protected tables
4. Add role checks for sensitive operations
