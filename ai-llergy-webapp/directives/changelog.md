# Changelog

## Overview

This directive tracks significant changes, fixes, and improvements to the AI-llergy webapp. Use this as a reference for understanding what was changed and why.

---

## June 2026 — Kisa Menu + Chef Substitutions (v4.6)

**Substitutions / "Can be modified" feature.** Excluded dishes are rescued into a new results section
when the chef supplies a viable swap or removal. Read deterministically from a "Substitutions" tab in
the menu Google Sheet (`GOOGLE_SUBSTITUTIONS_GID`) — no LLM at request time. Safety guard: never
suggests a swap that introduces an allergen the diner also avoids.

| File | Change |
|------|--------|
| `src/lib/substitutions.ts` | **New.** Parse rows, viability/conflict logic, instruction text. Tolerant of `Introduces`/`Introduces allergy` headers. |
| `src/lib/google-sheets.ts` | Generic `fetchSheetTab(gid)`; `fetchSubstitutionsFromSheets()`; normalize `\r\n`. |
| `src/lib/menu-service.ts` | `getSubstitutions()` (10-min cache, dish-keyed map). **Name column accepts `Item` or `Dish`.** |
| `src/lib/filter-menu.ts` | `FilteredItem.modifications`, `FilterResult.modifiableItems`, rescue step. |
| `src/app/api/submit/route.ts` | Loads subs, passes to filter, returns `modifiedItems`. |
| `MenuResults.tsx` / `MenuItem.tsx` / `AccordionSection.tsx` | "Can be modified" accordion + per-dish instructions (`modified` variant). |
| `src/app/globals.css` | Seafoam "substitutions" styles; **ingredient box `max-height` 200→600px + `overflow-y:auto`** (long verbatim lists were clipping). |

**Bug fixes from the live sheet being actively edited** (full detail in `known_issues_and_fixes.md`):
- **BUG-010 (Critical)** — menu returned 0 results after the sheet's name column was renamed
  `Item`→`Dish`. Fixed: `name: raw.Item || raw.Dish`.
- **BUG-011 (Medium)** — verbatim ingredient lists clipped in the results card. Fixed in `globals.css`.
- **BUG-012 (High/safety)** — substitution "introduces" guard disabled after the subs tab renamed
  `Introduces`→`Introduces allergy`. Fixed: tolerant header matching.

**Data work**: Kisa's real menu onboarded from the chef's PDF (allergens inferred), then the
`Ingredients` column regenerated **verbatim** from the PDF.

**Verification**: `tsc --noEmit` clean; unit checks of the rescue logic; live `/api/submit` confirms
gluten→{Pita, Boreks, Lemon Tart} rescued, gluten+treenuts hides Pita (guard), garlic→Hummus removal.

**Deploy note**: All of the above is local-only until a **Netlify redeploy**.

**Related directives**: `directives/substitutions.md`, `directives/google_sheet_data_source.md`.

---

## June 2026 — Allergen Form Redesign (v4.5)

**Summary:** Reworked the allergen selection form and expanded the allergen set.

### Form layout
- Removed the multi-group accordion (Nuts/Seafood/Aromatics/Spicy/Other).
- New layout: **Dietary Preferences** + **Common Allergens** (Gluten, Dairy, Eggs) as full-width **rows**, then a single **"More allergens"** dropdown for everything else.
- `AllergenButton` gained a `variant: "tile" | "row"` prop.

### Allergen set
- **Removed `wheat`** (subset of `gluten`; wheat→gluten synonym still routes wheat ingredients).
- **Added `halal`** (dietary preference, column `HALAL`) and **`nightshades`** (allergen, column `NIGHTSHADE FREE`).

### Data / filtering
- `allergens.ts`: added `PRIMARY_ALLERGEN_IDS` / `PRIMARY_ALLERGENS` / `SECONDARY_ALLERGENS`; removed `ALLERGEN_GROUPS` / `GROUPED_ALLERGEN_IDS` / `STANDALONE_ALLERGENS`.
- `filter-menu.ts`: `formatWarnings()` now treats `halal` as a dietary preference and labels `nightshades`.

### Bugs fixed
- **BUG-008**: row buttons rendered as squares — CSS specificity tie; fixed by scoping row styles under `.allergen-grid__rows`.
- **BUG-009**: `halal` column not detected — `columnName` was `"Halal"` but the sheet header is `"HALAL"` (case-sensitive); fixed.

### New tooling
- `execution/classify_nightshades.py` — auto-classifies the NIGHTSHADE FREE column from ingredients (paste-ready output; no write creds in project). See `directives/classify_nightshades.md`.

**Files Modified:** `src/lib/allergens.ts`, `src/components/AllergenGrid.tsx`, `src/components/AllergenButton.tsx`, `src/lib/filter-menu.ts`, `src/app/globals.css`.

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
