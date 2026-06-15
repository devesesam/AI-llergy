# Directive: Known Issues and Fixes

**Goal**: Track all bugs, issues, and their fixes for the AI-llergy app. This document serves as a knowledge base for future agents and developers, preventing repeated debugging of solved problems.

## 1. Issue Tracking Format

Each issue follows this structure:
- **Issue ID**: Sequential identifier (e.g., BUG-001)
- **Reported**: Date discovered
- **Status**: Open | Fixed | Won't Fix
- **Severity**: Critical | High | Medium | Low
- **Summary**: One-line description
- **Symptoms**: What the user experiences
- **Root Cause**: Technical explanation
- **Fix**: What was changed
- **Prevention**: How to avoid in future
- **Files Modified**: List of changed files

---

## 2. Fixed Issues

### BUG-001: Fish Allergen Not Filtering Menu Items

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-13 |
| **Status** | Fixed (v2.4.3) |
| **Severity** | Critical |

**Summary**: Selecting "Fish" allergen allowed fish-containing items (e.g., "Cured Market Fish") to appear in safe results.

**Symptoms**:
- User selects "Fish" in allergen form
- Submits and sees results
- "Cured Market Fish" appears in safe items
- Same issue affects: Shellfish, Peanuts, Tree Nuts, Eggs, Wheat, Mustard, Sulfites, Celery, Lupin, Molluscs

**Root Cause**:
Data synchronization gap between two files:

1. `allergens.ts` - Defines 22 allergens with column mappings:
   ```typescript
   { id: "fish", label: "Fish", icon: "🐟", columnName: "FISH FREE" }
   ```

2. `menu-service.ts` - Had a **hardcoded** array of only 13 columns:
   ```typescript
   const allergenColumns = [
     "Vegetarian", "Vegan", "DAIRY FREE", "PISTACHIO FREE",
     "WALNUT FREE", "ALMOND FREE", "SOY FREE", "GLUTEN FREE",
     "SESAME FREE", "GARLIC FREE", "ONION FREE", "CAPSICUM FREE", "CHILI FREE"
   ];
   // MISSING: FISH FREE, SHELLFISH FREE, PEANUT FREE, EGG FREE, etc.
   ```

3. When transforming menu data, `"FISH FREE"` was never extracted from the Google Sheet
4. `item.allergenProfile["FISH FREE"]` returned `undefined`
5. In `filterMenu()`, `undefined` didn't match `"NO"`, so items passed through

**Data Flow Diagram**:
```
Google Sheet                 menu-service.ts                 filter-menu.ts
┌───────────────┐           ┌───────────────────┐           ┌─────────────────┐
│ FISH FREE: NO │──────────▶│ allergenColumns[] │──────────▶│ allergenProfile │
│               │           │ (missing FISH!)   │           │ { ... }         │
└───────────────┘           └───────────────────┘           │ FISH FREE: ???  │
                                                            └────────┬────────┘
                                                                     │
                                                                     ▼
                                                            undefined ≠ "NO"
                                                            Item passes through!
```

**Fix**:
Replaced hardcoded array with dynamic import from `allergens.ts`:

```typescript
// BEFORE (broken)
const allergenColumns = ["Vegetarian", "Vegan", ...]; // hardcoded 13

// AFTER (fixed)
import { ALL_FILTERS } from "./allergens";

for (const allergen of ALL_FILTERS) {
  const col = allergen.columnName;
  const value = raw[col]?.toUpperCase().trim() || "";
  // ... extract to allergenProfile
}
```

**Files Modified**:
- `ai-llergy-webapp/src/lib/menu-service.ts` (lines 6-7, 26-39)

**Prevention**:
1. `allergens.ts` is the **single source of truth** for allergen definitions
2. Never hardcode allergen lists in other files
3. Always import `ALL_FILTERS` or `ALLERGEN_TO_COLUMN` when needed
4. After any allergen changes, test filtering end-to-end with each allergen type

**Test Case**:
```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [{"id": "fish", "type": "allergy"}], "customAllergenIds": []}'
# Verify: "Cured Market Fish" NOT in safeItems
```

---

### BUG-001a: Fish Allergen Excluding ALL Items (Follow-up)

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-13 |
| **Status** | Fixed (v2.4.4) |
| **Severity** | Critical |

**Summary**: After BUG-001 fix, selecting "Fish" allergen excluded ALL 31 menu items instead of just fish-containing ones.

**Symptoms**:
- User selects "Fish" in allergen form
- Submits and sees results
- "31 items excluded based on your selections"
- Same issue affects all allergens without Google Sheet columns

**Root Cause**:
The v2.4.3 fix introduced a new problem. When iterating over ALL_FILTERS:

```typescript
const value = raw[col]?.toUpperCase().trim() || "";
if (value === "YES") {
  allergenProfile[col] = "YES";
} else if (value === "CAN BE") {
  allergenProfile[col] = "CAN BE";
} else {
  allergenProfile[col] = "NO";  // ← Missing columns default to "NO"!
}
```

If the column doesn't exist in the sheet, `raw[col]` is undefined, `value` becomes `""`, and it defaults to `"NO"`. This means ALL items are marked as containing fish.

**Fix**: Hybrid two-pass filtering:

1. **Detect available columns** on menu fetch:
   ```typescript
   function detectAvailableColumns(rawItems: RawMenuItem[]): Set<string> {
     const columns = new Set<string>();
     for (const raw of rawItems) {
       for (const allergen of ALL_FILTERS) {
         const col = allergen.columnName;
         const value = raw[col]?.trim();
         if (value && value !== "") {
           columns.add(col);
         }
       }
     }
     return columns;
   }
   ```

2. **Skip missing columns** in transform (don't add to allergenProfile):
   ```typescript
   if (!availableColumns.has(col)) {
     continue; // Skip - will be handled by AI
   }
   ```

3. **Split allergens** in route.ts:
   - Allergens WITH columns → `filterMenu()` (fast)
   - Allergens WITHOUT columns → `filterMenuWithAI()` (AI-based)

4. **Optimize**: Run column filtering FIRST to reduce items before AI

**Files Modified**:
- `menu-service.ts` - Added `detectAvailableColumns()`, `getAvailableColumns()`
- `filter-menu.ts` - Skip undefined values
- `route.ts` - Hybrid column + AI filtering logic

**Prevention**:
1. When adding new allergens, they automatically work via AI until columns are added
2. No code changes needed when chefs add columns to sheet
3. Test with BOTH column-based and AI-based allergens

**Test Case**:
```bash
# Select dairy (has column) + fish (no column)
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"allergens": [{"id": "dairy", "type": "allergy"}, {"id": "fish", "type": "allergy"}], "customAllergenIds": []}'

# Check console for:
# [route] Column filtering: 31 → 20 items (excluded 11)
# [route] AI filtering 20 items for: ["Fish"]
```

---

### BUG-002: "Vegan-free" Phrasing in Warnings

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-10 |
| **Status** | Fixed (v2.2.1) |
| **Severity** | Medium |

**Summary**: Warning text said "Can be made vegan-free on request" instead of "Can be made Vegan on request".

**Symptoms**:
- User selects "Vegan" preference
- Menu item shows "CAN BE" for vegan
- Warning displays: "Can be made vegan-free on request" (wrong)
- Should display: "Can be made Vegan on request" (correct)

**Root Cause**:
`formatWarnings()` in `filter-menu.ts` applied `-free` suffix uniformly to all allergens. This makes sense for allergens ("Dairy-free", "Nut-free") but not dietary preferences ("Vegan", "Vegetarian").

**Fix**:
Added `dietaryPreferences` set to detect special cases:

```typescript
const dietaryPreferences = new Set(["vegan", "vegetarian"]);

return warnings.map((w) => {
  const label = allergenLabels[w] || w;
  if (dietaryPreferences.has(w)) {
    return `Can be made ${label} on request`;  // No "-free" suffix
  }
  return `Can be made ${label}-free on request`;
});
```

**Files Modified**:
- `ai-llergy-webapp/src/lib/filter-menu.ts` (lines 103-112)

**Prevention**:
When adding new dietary preferences (halal, kosher, pescatarian), add them to the `dietaryPreferences` set.

---

### FEATURE-001: Confidence-Based Severity Filtering

| Field | Value |
|-------|-------|
| **Implemented** | 2026-02-19 |
| **Status** | Implemented (v3.1) |
| **Severity** | Feature |

**Summary**: Allergen severity levels now affect filtering thresholds, not just UI display.

**Before**:
- Severity (preference/allergy/life_threatening) was collected in SeverityModal
- At line 63 of route.ts: `allergens.map(a => a.id)` discarded severity
- All allergens filtered identically regardless of severity

**After**:
- Severity preserved and passed to filtering functions
- Confidence thresholds applied based on severity:
  - Preference: >25% confidence required
  - Allergy: >80% confidence required
  - Life-threatening: >95% confidence required

**Files Modified**:
- `src/lib/confidence.ts` - NEW: Threshold constants
- `src/lib/compute-confidence.ts` - NEW: Confidence calculation
- `src/lib/filter-menu.ts` - Added `filterMenuWithConfidence()`
- `src/app/api/submit/route.ts` - Line 63 now preserves severity
- `src/lib/ai-filter.ts` - AI now returns confidence scores
- `src/lib/supabase/types.ts` - Added `allergen_confidence`, `venue_cross_contamination`
- `supabase/schema.sql` - Added new column and table

**Database Migration Required**:
Run `supabase/migrations/20260219_add_allergen_confidence.sql` to add:
- `allergen_confidence` JSONB column to `menu_items`
- `venue_cross_contamination` table

**Related**: See `directives/confidence_scoring.md` for full documentation.

---

### BUG-003: Missing CSS Styles Caused Visual Regression

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Fixed (v4.2) |
| **Severity** | High |

**Summary**: Multiple pages displayed broken/unstyled due to CSS classes being used in components but never defined in `globals.css`.

**Symptoms**:
- Allergen groups displayed as plain text instead of expandable cards
- Other allergens showed as small chips instead of large tiles in 2-column grid
- Login page form inputs were invisible (only showing icons)
- Dashboard sidebar and layout completely unstyled
- Menu results page cards missing borders and proper layout
- Severity modal and type modal unstyled

**Root Cause**:
Components were using BEM-style CSS class names that were never defined in `globals.css`. This likely occurred during a refactoring where components were updated but CSS wasn't added, or styles were accidentally deleted.

**Missing CSS Classes by Category**:

1. **Allergen Groups** (~70 lines):
   - `.allergen-group`, `.allergen-group__header`, `.allergen-group__icon`
   - `.allergen-group__label`, `.allergen-group__count`, `.allergen-group__chevron`
   - `.allergen-group__dropdown`

2. **Allergen Tiles** (layout fix):
   - `.allergen-grid__buttons` was `flex-wrap` instead of CSS `grid`
   - `.allergen-option` was `inline-flex` instead of `flex-direction: column`
   - Tiles needed `aspect-ratio` for consistent sizing

3. **Results Page** (~100 lines):
   - `.results-container`, `.results-header`, `.results-title`, `.results-subtitle`
   - `.accordion__*` (12 classes)
   - `.menu-item__*` (15 classes)
   - `.selection-summary__*` and `.selection-pill__*` (20 classes)

4. **Modals** (~150 lines):
   - `.modal-backdrop`
   - `.severity-modal__*` (15 classes)
   - `.severity-slider__*` (8 classes) - for new slider UI
   - `.type-modal__*` (8 classes)

5. **Tags & Autocomplete** (~80 lines):
   - `.allergen-tag__*`, `.custom-tag__*`
   - `.autocomplete-tags`, `.autocomplete-option__*`
   - `.autocomplete-no-match`, `.autocomplete-add-custom`

6. **Dashboard** (~200 lines):
   - `.dashboard-layout`, `.dashboard-main`
   - `.dashboard-sidebar__*` (15 classes)
   - `.dashboard-mobile-header__*`
   - `.dashboard-overlay`
   - `.dashboard-form__*` (8 classes)
   - `.allergen-toggle__*`

7. **Auth/Login** (~100 lines):
   - `.auth-page`, `.auth-card__*`
   - `.auth-form__*` (15 classes)

8. **Tailwind v4 Theme** (~15 lines):
   - Missing `@theme` block to map CSS variables to Tailwind utilities

**Fix Applied**:
Added ~800 lines of CSS to `globals.css` organized by component category:
1. Added `@theme` block at top for Tailwind v4 integration
2. Added all missing BEM classes following existing patterns
3. Fixed tile layout from flex-wrap to CSS grid
4. Updated login form from dark theme to light theme
5. Added responsive mobile styles for dashboard

**Files Modified**:
- `ai-llergy-webapp/src/app/globals.css` - Added ~800 lines
- `ai-llergy-webapp/src/app/login/page.tsx` - Changed from dark Tailwind classes to `auth-page` class
- `ai-llergy-webapp/src/app/login/LoginForm.tsx` - Changed from Tailwind classes to BEM classes
- `ai-llergy-webapp/src/components/dashboard/DashboardNav.tsx` - Changed from Tailwind classes to BEM classes

**Prevention**:
1. When adding new components, add CSS in same commit
2. Run visual regression tests before merging
3. Document all CSS classes in `directives/css_styling_system.md`
4. Use `@theme` block to expose CSS variables to Tailwind

**Test Case**:
```bash
# Start dev server
cd ai-llergy-webapp && npm run dev

# Check pages visually:
# 1. / (allergen selection) - tiles should be 2-column grid
# 2. /login - form inputs should be visible
# 3. /dashboard - sidebar should be styled
# 4. Submit allergens - results should show styled cards
```

---

### BUG-004: Loading Spinner Not Animating

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Fixed (v4.3) |
| **Severity** | Low |

**Summary**: The loading spinner SVG after form submission did not spin - it displayed statically.

**Symptoms**:
- User clicks Submit button
- Spinner icon appears but doesn't rotate
- Page feels frozen even though it's processing

**Root Cause**:
The `LoadingSpinner.tsx` component rendered an SVG with `className="loading-spinner"`, but no corresponding CSS animation was defined in `globals.css`. The class was referenced but empty.

```typescript
// LoadingSpinner.tsx
<svg className="loading-spinner" ...>  // Class exists but no animation!
```

**Fix**:
Added animation styles to `globals.css`:

```css
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Files Modified**:
- `ai-llergy-webapp/src/app/globals.css` - Added animation (~8 lines)

**Prevention**:
When creating components with CSS class names, always add corresponding styles in the same commit. Search for className usage to verify definitions exist.

---

### BUG-005: Desktop Width Expanding to Full Screen

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Fixed (v4.3) |
| **Severity** | Medium |

**Summary**: On desktop screens (768px+), the app expanded to full browser width instead of staying phone-sized and centered.

**Symptoms**:
- On mobile: App displays correctly at ~480px width
- On desktop: App stretches across entire screen
- Menu results page particularly affected (cards span full width)
- Allergen selection page slightly too wide

**Root Cause**:
The desktop media query in `globals.css` overrode the mobile `max-width`:

```css
/* Mobile (default) */
.app-container {
  max-width: 480px;  /* Good */
}

/* Desktop media query (broken) */
@media (min-width: 768px) {
  .app-container {
    max-width: 100%;  /* ← Expands to full width! */
    align-items: center;
  }
  main {
    max-width: 600px;  /* Inconsistent */
    width: 100%;
  }
}
```

**Fix**:
Simplified desktop media query to maintain constrained width:

```css
@media (min-width: 768px) {
  .app-container {
    max-width: 500px;  /* Phone-ish width, slightly larger */
  }
}
```

The body already has `justify-content: center` so the container centers naturally.

**Files Modified**:
- `ai-llergy-webapp/src/app/globals.css` - Modified desktop media query

**Prevention**:
- Desktop styles should enhance, not override core layout constraints
- Test responsive layouts at 1024px, 1440px, not just mobile breakpoints
- When designing mobile-first, desktop should inherit mobile constraints

---

### BUG-006: Venue Creation Fails with "Failed to create venue"

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-20 |
| **Status** | Fixed (v4.4) |
| **Severity** | High |

**Summary**: Creating a new venue always fails with "Failed to create venue" error, even with valid input.

**Symptoms**:
- User logs into dashboard
- Navigates to Venues → Create New Venue
- Fills in venue name and slug
- Clicks "Create Venue"
- Error: "Failed to create venue"

**Root Cause**:
The slug uniqueness check used `.single()` instead of `.maybeSingle()`:

```typescript
// BROKEN: .single() throws when 0 rows returned
const { data: existing } = await supabase
  .from('venues')
  .select('id')
  .eq('slug', slug)
  .single()  // Throws PGRST116 error!
```

The `.single()` method expects exactly 1 row. When checking if a NEW slug exists:
- Query returns 0 rows (slug is unique - this is good!)
- `.single()` throws: `PGRST116: JSON object requested, multiple (or no) rows returned`
- Error caught and displays generic "Failed to create venue"

**The venue insert never even runs** - the code fails at the slug check.

**Fix**:
Changed `.single()` to `.maybeSingle()` which returns `null` for 0 rows without throwing:

```typescript
// FIXED: .maybeSingle() returns null when no rows found
const { data: existing } = await supabase
  .from('venues')
  .select('id')
  .eq('slug', slug)
  .maybeSingle()  // Returns null if not found, no error
```

**Files Modified**:
- `ai-llergy-webapp/src/app/dashboard/venues/new/page.tsx` (line 48)

**Prevention**:
When using Supabase queries to check if something exists:
- Use `.maybeSingle()` when you expect 0 or 1 rows (existence checks)
- Use `.single()` only when you expect exactly 1 row (fetching by ID)
- Always handle the case where data might be `null`

**Test Case**:
```bash
# Navigate to /dashboard/venues/new
# Enter a unique venue name (e.g., "Test Cafe")
# Click "Create Venue"
# Should redirect to /dashboard/venues/[id] (not show error)
```

---

### FEATURE-002: Other Allergens Dropdown Accordion

| Field | Value |
|-------|-------|
| **Implemented** | 2026-02-20 |
| **Status** | Implemented (v4.4) |
| **Severity** | Feature |

**Summary**: Converted the "Other Allergens" section from a static 2-column grid to a collapsible dropdown accordion, matching the style of named allergen groups (Nuts, Seafood, Aromatics, Spicy).

**Before**:
- "Other Allergens" displayed as ~9 individual tiles in a static 2-column grid
- Tiles always visible, taking up significant vertical space
- Inconsistent UI compared to grouped allergens

**After**:
- "Other Allergens" displays as a single collapsible dropdown labeled "🍽️ Other"
- Click to expand and see all 9 allergens in 2-column grid
- Selection count badge shows selected items (e.g., "2/9")
- Consistent accordion UI across all allergen categories

**Implementation Approach**:
Rather than modifying `ALLERGEN_GROUPS` in `allergens.ts`, the "Other" group is created inline in `AllergenGrid.tsx`:

```typescript
<AllergenGroup
  group={{
    id: "other",
    label: "Other",
    icon: "🍽️",
    members: STANDALONE_ALLERGENS.map(a => a.id),
  }}
  pendingAllergenIds={pendingAllergenIds}
  selectedAllergens={selectedAllergens}
  onAllergenClick={onAllergenClick}
/>
```

**Why inline (not in ALLERGEN_GROUPS)?**
1. Keeps semantic separation between named groups and "other" category
2. `STANDALONE_ALLERGENS` is computed dynamically (allergens not in any group)
3. Future allergens automatically appear in "Other" without additional config
4. Single-file change, minimal risk

**Files Modified**:
- `ai-llergy-webapp/src/components/AllergenGrid.tsx` (lines 76-92)

**No Changes Needed**:
- `allergens.ts` - Data model unchanged
- `AllergenGroup.tsx` - Component works as-is
- `globals.css` - Existing styles apply automatically

**Test Case**:
1. Navigate to allergen selection page (/)
2. Verify "Other Allergens" section shows dropdown with "🍽️ Other" header
3. Click to expand - should show 9 allergens (eggs, dairy, gluten, soy, sesame, wheat, mustard, sulfites, lupin)
4. Select an allergen - count badge should appear (e.g., "1/9")
5. Collapse dropdown - selection persists

**Related**: See `directives/allergen_management.md` §5 for group documentation.

---

## 3. Open Issues

### ISSUE-005: Supabase TypeScript Type Inference Workaround

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Open (Workaround Applied) |
| **Severity** | Medium |

**Summary**: Without Supabase CLI-generated types, all Supabase queries return `never` types, causing TypeScript compilation errors.

**Symptoms**:
- Supabase `.from('table').select('*')` returns `{ data: never; error: never }`
- Cannot access properties on returned data
- Type errors on all Supabase operations

**Root Cause**:
The Supabase client accepts a `Database` generic type for full type safety. Without running the Supabase CLI to generate proper types from the actual database schema, the generic `Database` type doesn't satisfy the client's type inference requirements.

```typescript
// Without generated types, this fails:
const { data } = await supabase.from('venues').select('*')
// data is typed as 'never'
```

**Workaround Applied**:

1. **For SELECT queries**: Use explicit type assertion
   ```typescript
   import type { Venue } from '@/lib/supabase/types'

   const { data, error } = await supabase
     .from('venues')
     .select('*')
     .eq('id', venueId)
     .single() as { data: Venue | null; error: unknown }
   ```

2. **For INSERT/UPDATE/DELETE**: Cast supabase client to `any`
   ```typescript
   await (supabase as any).from('venues').insert({ name, slug })
   await (supabase as any).from('menu_items').update({ name }).eq('id', itemId)
   await (supabase as any).from('venues').delete().eq('id', venueId)
   ```

**Permanent Fix**:
Generate proper types using Supabase CLI:
```bash
npx supabase login
npx supabase gen types typescript --project-id [project-id] > src/lib/supabase/database.types.ts
```

Then update `src/lib/supabase/types.ts` to import and use the generated types.

**Files Using Workaround**:
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/venues/page.tsx`
- `src/app/dashboard/venues/[venueId]/page.tsx`
- `src/app/dashboard/venues/[venueId]/menu/new/page.tsx`
- `src/app/dashboard/venues/[venueId]/menu/[itemId]/page.tsx`
- `src/app/v/[slug]/page.tsx`
- `src/components/dashboard/MenuItemForm.tsx`

**Related**: See `directives/supabase_integration.md` §9 for full documentation.

---

### ISSUE-006: useSearchParams() Requires Suspense Boundary

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Fixed (Pattern Documented) |
| **Severity** | Low |

**Summary**: Next.js build fails when a page component uses `useSearchParams()` without a Suspense boundary.

**Symptoms**:
- Build error: "useSearchParams() should be wrapped in a suspense boundary at page /login"
- Error occurs during static analysis, not runtime

**Root Cause**:
In Next.js 14+, `useSearchParams()` is a client-side hook that may suspend during static generation. Pages using this hook must be wrapped in `<Suspense>`.

**Fix Applied**:
Split the page into two components:

1. **Page component** (can be Server Component) wraps with Suspense:
   ```typescript
   // src/app/login/page.tsx
   import { Suspense } from 'react'
   import LoginForm from './LoginForm'

   export default function LoginPage() {
     return (
       <Suspense fallback={<div>Loading...</div>}>
         <LoginForm />
       </Suspense>
     )
   }
   ```

2. **Client component** uses the hook:
   ```typescript
   // src/app/login/LoginForm.tsx
   'use client'
   import { useSearchParams } from 'next/navigation'

   export default function LoginForm() {
     const searchParams = useSearchParams()
     const message = searchParams.get('message')
     // ...
   }
   ```

**Prevention**:
When using `useSearchParams()`, `useRouter()`, or other client hooks at page level, always wrap in Suspense via a parent component.

---

### ISSUE-004: Deprecated AllergenTypeModal Still in Codebase

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-19 |
| **Status** | Open (Cleanup Task) |
| **Severity** | Low |

**Summary**: The `AllergenTypeModal.tsx` component is no longer used after v3.0 but remains in the codebase.

**Context**:
- v3.0 replaced per-click modal with batch `SeverityModal`
- `AllergenTypeModal.tsx` is now dead code
- Not causing issues, just codebase clutter

**Resolution**:
- Delete `ai-llergy-webapp/src/components/AllergenTypeModal.tsx`
- Remove any unused imports referencing it
- Add to Future Roadmap

---

### ISSUE-001: Custom Tags AI Filtering Latency

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-13 |
| **Status** | Open (Known Limitation) |
| **Severity** | Low |

**Summary**: AI-based filtering for custom tags takes 2-5 seconds, significantly longer than column-based filtering.

**Symptoms**:
- User adds custom tag (e.g., "nightshades")
- Clicks submit
- Results take 2-5 seconds to appear (vs instant for standard allergens)

**Root Cause**:
- AI filtering requires calling Claude API for each batch of menu items
- 20 items per batch, typically 2-3 API calls for full menu
- Each API call takes ~500-1000ms

**Workaround**:
- Pre-filtering with standard allergens reduces batch count
- Loading spinner indicates processing

**Potential Future Fixes**:
- Cache AI results for common custom tag combinations
- Use streaming responses to show partial results
- Add progress indicator showing batch progress

---

### ISSUE-002: ANTHROPIC_API_KEY Required for Custom Tags

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-13 |
| **Status** | Open (Expected Behavior) |
| **Severity** | Medium |

**Summary**: Custom tags feature requires Anthropic API key to be configured in deployed environment.

**Symptoms**:
- User adds custom tag
- Clicks submit
- All items marked as "caution" with warning about AI unavailable
- Or: Feature works locally but fails on Netlify/Vercel

**Root Cause**:
- `ANTHROPIC_API_KEY` not set in deployment environment
- `.env.local` only works for local development, not pushed to git
- Production deployments need environment variables configured in dashboard

**Fix**:
1. **Local development**: Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local`
2. **Netlify**: Site settings → Environment variables → Add `ANTHROPIC_API_KEY`
3. **Vercel**: Project settings → Environment variables → Add key

**Related**: See `directives/backend_menu_filter.md` §7 for environment setup

---

### ISSUE-003: Custom Tags Don't Persist After "Start Over"

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-13 |
| **Status** | Open (By Design) |
| **Severity** | Low |

**Summary**: When user clicks "Start Over", all selections including custom tags are cleared.

**Symptoms**:
- User adds custom tags + allergens
- Views results, clicks "Start Over"
- All selections cleared, user must re-enter custom tags

**Root Cause**:
- `handleStartOver()` resets all state including `customTags`
- This is intentional behavior to provide clean slate

**Potential Future Enhancement**:
- Persist user's allergen selections in `localStorage`
- Offer "Remember my selections" checkbox
- See roadmap in `directives/project_ai_llergy.md` §5

---

## 4. Won't Fix

*No won't-fix issues at this time.*

---

## 5. Issue Patterns & Lessons Learned

### Pattern 1: Data Source Duplication

**Problem**: Multiple files define the same data (e.g., allergen lists, column names).

**Symptoms**:
- Changes in one file not reflected in others
- Partial functionality (some allergens work, others don't)
- Tests pass but production fails

**Solution**:
1. Identify a **single source of truth** for each data type
2. Other files **import** from the source, never hardcode
3. Document the source of truth in directives

**Examples in AI-llergy**:
| Data | Source of Truth | Importers |
|------|-----------------|-----------|
| Allergen definitions | `allergens.ts` | `menu-service.ts`, `filter-menu.ts`, components |
| Synonym mappings | `interpret-allergy.ts` | `AutocompleteInput.tsx`, `api/interpret/route.ts` |
| Brand colors | `globals.css` (CSS variables) | All components |

### Pattern 2: Missing Boundary Validation

**Problem**: Data transformation at system boundaries (API → internal, Sheet → app) silently drops unknown fields.

**Symptoms**:
- New fields added to source not appearing in app
- `undefined` values causing logic bugs

**Solution**:
1. Log warnings when expected fields are missing
2. Use TypeScript strict mode to catch undefined access
3. Add integration tests that verify field presence

### Pattern 3: External Library Type Safety

**Problem**: Third-party libraries with generic type parameters may return `never` or `unknown` types without proper configuration.

**Example (Supabase v4.0)**:
Without generated types, Supabase returns `never` for all queries:
```typescript
const { data } = await supabase.from('venues').select('*')
// data: never - unusable!
```

**Symptoms**:
- TypeScript errors: "Property 'name' does not exist on type 'never'"
- Build failures with strict type checking
- IDE autocomplete doesn't work

**Solution**:

1. **Ideal**: Generate types from source (CLI, codegen)
   ```bash
   npx supabase gen types typescript --project-id xxx
   ```

2. **Workaround**: Explicit type assertions at boundaries
   ```typescript
   import type { Venue } from '@/lib/supabase/types'

   const { data } = await supabase
     .from('venues')
     .select('*')
     .single() as { data: Venue | null; error: unknown }
   ```

3. **Last resort**: Cast to `any` for mutations
   ```typescript
   await (supabase as any).from('venues').insert({ name, slug })
   ```

**Trade-offs**:
| Approach | Type Safety | Maintenance | Build Speed |
|----------|-------------|-------------|-------------|
| Generated types | Full | Need to regenerate | Slower |
| Manual types + casting | Partial | Manual sync | Fast |
| Cast to any | None | None | Fast |

**Best Practice**:
- Define types manually in a single location (`types.ts`)
- Use type assertions for queries
- Document the workaround for future reference
- Migrate to generated types when stable

---

### Pattern 4: Next.js 14+ Client Hook Boundaries

**Problem**: Client-side hooks like `useSearchParams()`, `useRouter()`, and `usePathname()` may suspend during static generation in Next.js 14+.

**Symptoms**:
- Build error: "useSearchParams() should be wrapped in a suspense boundary"
- Static analysis fails even if runtime would work
- Error occurs at build time, not development

**Solution**:
Split into wrapper + client component:

```typescript
// page.tsx (Server Component or minimal client)
import { Suspense } from 'react'
import ClientForm from './ClientForm'

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ClientForm />
    </Suspense>
  )
}

// ClientForm.tsx ('use client')
'use client'
import { useSearchParams } from 'next/navigation'

export default function ClientForm() {
  const searchParams = useSearchParams()
  // Safe to use here
}
```

**Affected Hooks**:
- `useSearchParams()` - Most common culprit
- `useRouter()` - When used for reading, not navigation
- `usePathname()` - Same boundary requirements

**Prevention**:
When adding pages that need search params or URL state:
1. Check if hook is needed at page level
2. If yes, create separate client component
3. Wrap in Suspense with appropriate fallback

---

### Pattern 5: State Separation for Multi-Stage Forms

**Problem**: Multi-stage forms (select → configure → submit) need clear state boundaries.

**Example (v3.0 Severity Selection)**:
- **Stage 1**: Selection (which allergens)
- **Stage 2**: Configuration (severity for each)
- **Stage 3**: Submission (send to API)

**Solution** (implemented in v3.0):
```typescript
// Separate state for each stage
const [pendingAllergenIds, setPendingAllergenIds] = useState<string[]>([]);  // Stage 1
const [showSeverityModal, setShowSeverityModal] = useState(false);            // Stage 2 trigger
const [selectedAllergens, setSelectedAllergens] = useState<SelectedAllergen[]>([]);  // Stage 3 ready
```

**Benefits**:
- Clear data flow: pending → modal → confirmed
- Easy to validate at each stage
- Can reset stages independently
- TypeScript enforces structure at each stage

**Anti-pattern to avoid**:
- Storing all state in one complex object with flags
- Using presence of `type` field to determine stage

---

## 6. Debugging Checklist

When investigating a filtering bug:

1. **Check allergen definitions**: Is the allergen in `allergens.ts`?
   ```bash
   grep -n "fish" ai-llergy-webapp/src/lib/allergens.ts
   ```

2. **Check column mapping**: Does `columnName` match the Google Sheet header exactly?

3. **Check data transformation**: Is the column being extracted in `menu-service.ts`?
   - Should use `ALL_FILTERS` from `allergens.ts`, not hardcoded list

4. **Check filter logic**: Add console.log in `filterMenu()`:
   ```typescript
   console.log(`${item.name}: ${columnName} = ${value}`);
   ```

5. **Check Google Sheet**: Open the sheet and verify the column exists with correct values

---

## 7. Related Directives

- **Project Overview**: `directives/project_ai_llergy.md` - Full changelog
- **Backend Filtering**: `directives/backend_menu_filter.md` - Filter logic, data sync rules
- **Allergen Management**: `directives/allergen_management.md` - Adding/modifying allergens
- **Custom Input**: `directives/custom_allergy_input.md` - Autocomplete documentation
- **Dashboard Admin**: `directives/dashboard_admin.md` - Dashboard portal functionality
- **Supabase Integration**: `directives/supabase_integration.md` - Database setup, RLS, type patterns

---

## 8. Contributing

When fixing a bug:

1. Add an entry to this document following the format in Section 1
2. Update the changelog in `directives/project_ai_llergy.md`
3. Update relevant directives with lessons learned
4. Add a test case to prevent regression

---

### BUG-007: Supabase RPC TypeScript Error "Argument not assignable to undefined"

| Field | Value |
|-------|-------|
| **Reported** | 2026-02-20 |
| **Status** | Fixed (v4.4.1) |
| **Severity** | High (Build Failure) |

**Summary**: The `join_venue_by_code` RPC function call failed TypeScript compilation because the Supabase client inferred its arguments as `undefined`.

**Symptoms**:
- Netlify build fails with: `Type error: Argument of type '{ code: string; }' is not assignable to parameter of type 'undefined'.`
- Occurs in `src/components/dashboard/JoinVenueForm.tsx`

**Root Cause**:
- The manual `Database` type definition in `src/lib/supabase/types.ts` had an empty `Functions` interface: `[_ in never]: never`.
- As a result, the Supabase client typed all RPC functions as accepting no arguments (or `undefined`).

**Fix**:
- Manually added the function signature to `src/lib/supabase/types.ts`:
  ```typescript
  Functions: {
    join_venue_by_code: {
      Args: { code: string }
      Returns: { ... }
    }
  }
  ```
- This allows the `supabase.rpc()` call to correctly infer that `code` is a valid argument.

**Prevention**:
- Always update `types.ts` when adding new RPC functions.
- Prefer using Supabase CLI to generate types automatically to avoid sync issues.

---

### BUG-008: Full-Width Allergen Rows Rendered as Big Squares

| Field | Value |
|-------|-------|
| **Reported** | 2026-06-11 |
| **Status** | Fixed (v4.5) |
| **Severity** | Medium (Visual) |

**Summary**: In the v4.5 form redesign, Dietary Preferences and Common Allergens were meant to be slim full-width rows but rendered as large squares.

**Symptoms**:
- Gluten/Dairy/Eggs (and Vegetarian/Vegan/Halal) appeared as big square tiles, icon-above-label, instead of short horizontal rectangles.
- The CSS override "looked correct" but had no visible effect.

**Root Cause**: CSS specificity tie + source order.
- The override used a single BEM modifier class `.allergen-option--row` (specificity **0,1,0**).
- The base `.allergen-option` rule (also **0,1,0**) defines `aspect-ratio: 1 / 0.85` and `flex-direction: column`, and appears **later** in `globals.css`.
- Equal specificity → later rule wins → the square base clobbered the row override.

**Fix**: Scope the row rules under the parent container so they out-specify the base:
```css
/* 0,2,0 — beats base .allergen-option (0,1,0) regardless of order */
.allergen-grid__rows .allergen-option {
  flex-direction: row;
  aspect-ratio: auto;
  justify-content: center;   /* centred content (follow-up request) */
  text-align: center;
  /* ...compact padding/icon... */
}
```

**Files Modified**:
- `ai-llergy-webapp/src/app/globals.css`

**Prevention**:
- A BEM `--modifier` class does **not** out-specify its base block — they're equal. To override a later same-specificity rule, raise specificity (e.g. parent-scope `.parent .block`) or place the override after the base rule.
- When a CSS change appears to have "no effect", check the cascade in DevTools for a later equal-specificity rule winning, before assuming the file didn't reload.

---

### BUG-009: Halal Column Not Detected (Case-Sensitive Column Lookup)

| Field | Value |
|-------|-------|
| **Reported** | 2026-06-11 |
| **Status** | Fixed (v4.5) |
| **Severity** | High |

**Summary**: The new `halal` dietary preference was selectable but would have silently used slow AI inference instead of the sheet's YES/NO `HALAL` column.

**Symptoms**:
- Selecting Halal did not use the chef-provided HALAL column data.
- `getAvailableColumns()` did not include the Halal column, so the route classified `halal` as an AI allergen.

**Root Cause**: Case-sensitive column lookup mismatch.
- The Google Sheet header is `HALAL` (uppercase).
- `allergens.ts` defined `columnName: "Halal"` (title case).
- `menu-service.ts` reads `raw[allergen.columnName]` — `raw["Halal"]` is `undefined` because the actual key is `"HALAL"`. So `detectAvailableColumns()` never registered it.

**Fix**: Match the sheet header exactly — changed `columnName` to `"HALAL"`.

```typescript
{ id: "halal", label: "Halal", icon: "☪️", columnName: "HALAL" },
```

**Files Modified**:
- `ai-llergy-webapp/src/lib/allergens.ts`

**Prevention**:
- `columnName` MUST match the sheet header **exactly, including case** — sheet/JS key access is case-sensitive.
- After adding/wiring an allergen, verify the column is detected: confirm it appears in `getAvailableColumns()` logs, or that selecting it filters via the column path (fast), not AI (~2-5s).
- Note inconsistent header casing in the Kisa sheet: `Vegetarian`/`Vegan` are Title Case, but `HALAL` and the `* FREE` allergen columns are UPPERCASE.

---

### FEATURE-003: Allergen Form Redesign + Halal/Nightshades + Nightshade Classifier

| Field | Value |
|-------|-------|
| **Implemented** | 2026-06-11 |
| **Status** | Implemented (v4.5) |
| **Severity** | Feature |

**Summary**: Reworked the allergen selection form and expanded the allergen set.

**Changes**:
1. **Layout**: Removed the v4.4 multi-group accordion. New layout = Dietary Preferences rows + Common Allergens rows (gluten, dairy, eggs) + a single "More allergens" dropdown for everything else. (See `allergen_management.md` §5.)
2. **Removed `wheat`**: Subset of `gluten`; wheat→gluten synonym still routes wheat ingredients to gluten.
3. **Added `halal`** (dietary preference, column `HALAL`) and **`nightshades`** (allergen, column `NIGHTSHADE FREE`).
4. **`formatWarnings()`**: Added `halal` to the dietary-preference set and labels for `halal`/`nightshades`.
5. **Nightshade classifier**: New `execution/classify_nightshades.py` reads the sheet via CSV export, scans ingredients, and emits paste-ready YES/NO for column AB. (See `directives/classify_nightshades.md`.)

**Data model** (`allergens.ts`): Added `PRIMARY_ALLERGEN_IDS`, `PRIMARY_ALLERGENS`, `SECONDARY_ALLERGENS`; removed `ALLERGEN_GROUPS`, `GROUPED_ALLERGEN_IDS`, `STANDALONE_ALLERGENS`. `AllergenButton` gained `variant: "tile" | "row"`.

**Files Modified**:
- `src/lib/allergens.ts`, `src/components/AllergenGrid.tsx`, `src/components/AllergenButton.tsx`, `src/lib/filter-menu.ts`, `src/app/globals.css`
- `execution/classify_nightshades.py` (new)

**Edge cases (nightshade classification)**:
- Counts as nightshade: tomato, potato (not sweet potato/kumara), capsicum/peppers (NOT black/white peppercorns), chili/chilli, paprika, cayenne, eggplant/aubergine, aleppo pepper.
- Cross-check guard: if the sheet already marks `CAPSICUM FREE = NO` or `CHILI FREE = NO`, the item is forced to `NIGHTSHADE FREE = NO`.

**No write credentials**: The project has no Google write auth (read-only CSV export). The classifier outputs a paste-ready column; writing back to the sheet is manual unless a service account is added. (See `classify_nightshades.md` §Limitations.)

---

### FEATURE-004: Chef Substitutions / "Can be modified" section

| Field | Value |
|-------|-------|
| **Implemented** | 2026-06 |
| **Status** | Implemented (local; needs Netlify redeploy for prod) |
| **Severity** | Feature |

**Summary**: Dishes that contain an allergen (normally excluded) are "rescued" into a new
**"Can be modified for you"** results section when the chef has supplied a specific swap or removal.
Read deterministically from a Google Sheet tab — **no LLM at request time**.

**How it works**: A second tab ("Substitutions") lists, per dish: `Action` (Remove/Substitute),
`Ingredient`, `Substitute`, `Solves` (allergen ids), and introduced allergens. When a dish is
excluded, the filter rescues it only if **every** triggering allergen has a viable modification whose
introduced allergens don't conflict with the diner's other selections. Surfaces for all severities
with the "subject to kitchen approval" disclaimer.

**Files Added**: `src/lib/substitutions.ts`, `directives/substitutions.md`,
`directives/google_sheet_data_source.md`, `kisa_substitutions_template.csv`,
`execution/validate_substitutions.py`.
**Files Modified**: `google-sheets.ts` (`fetchSubstitutionsFromSheets` + generic `fetchSheetTab(gid)`),
`menu-service.ts` (`getSubstitutions`), `filter-menu.ts` (`modifiableItems` + rescue), `route.ts`
(`modifiedItems`), `MenuResults.tsx`, `MenuItem.tsx`, `AccordionSection.tsx`, `globals.css`.

**Config**: `GOOGLE_SUBSTITUTIONS_GID` (the tab's gid). Unset → feature dormant.

**Data gotcha (hit in testing)**: a substitution only fires if the menu marks the dish as
*containing* the allergen (`… FREE = NO`). If the menu says `… FREE = YES`, the dish is already
"safe" and the swap row does nothing — keep the menu flags and substitution rows consistent.

**Related**: `directives/substitutions.md`, `directives/google_sheet_data_source.md`.

---

### BUG-010: Entire menu empty / every selection returns 0 results

| Field | Value |
|-------|-------|
| **Reported** | 2026-06 |
| **Status** | Fixed |
| **Severity** | Critical |

**Summary**: On the live site, selecting any allergen (e.g. Vegan) returned **no menu items at all**.

**Symptoms**: `/api/submit` returns `meta.totalItems: 0` for every selection.

**Root Cause**: The menu tab's name column kept getting renamed in the Sheet (`Item` → `Dish` →
`Element`). `menu-service.ts` read the name only from a hard-coded header, so every row got a blank
name and was dropped by `.filter(item => item.name)` → empty menu.

**Fix (final, future-proof)**: Read the dish name from **column A by position**, whatever its header —
`name: raw.Item || raw.Dish || raw[Object.keys(raw)[0]] || ""` in `transformMenuItem`
(`menu-service.ts`). (Interim fix had only added `Dish`; that broke again on `Element`.) Validator
(`validate_substitutions.py`) reads the first column likewise. **Renaming column A no longer breaks
the menu** — just keep the dish name in the first column.

**Files Modified**: `ai-llergy-webapp/src/lib/menu-service.ts`, `execution/validate_substitutions.py`.

**Prevention**: See `directives/google_sheet_data_source.md` §5. Diagnose menu outages by fetching the
no-gid CSV export and checking the header + `meta.totalItems` before assuming a code bug.

**Test Case**:
```bash
curl -s -X POST http://localhost:3000/api/submit -H "Content-Type: application/json" \
  -d '{"allergens":[]}' | python -c "import sys,json;print(json.load(sys.stdin)['meta']['totalItems'])"
# Expect ~29-30, not 0
```

---

### BUG-011: Long verbatim ingredient lists clipped in the results card

| Field | Value |
|-------|-------|
| **Reported** | 2026-06 |
| **Status** | Fixed |
| **Severity** | Medium |

**Summary**: After ingredients were switched to full **verbatim** lists from the chef's PDF, the
expanded ingredient text overflowed/cut off in the post-submit menu card.

**Root Cause**: `.menu-item__ingredients-wrapper--open` had `max-height: 200px` + `overflow: hidden`.
Short summaries fit; long verbatim lists (Falafel, Rocky Road ~300px) were clipped.

**Fix** (`globals.css`): `max-height: 600px`, `overflow-y: auto` (scroll instead of clip),
`overflow-wrap: break-word`.

**Files Modified**: `ai-llergy-webapp/src/app/globals.css`.

**Prevention**: When data length can grow (verbatim ingredients), avoid tight fixed `max-height` with
`overflow:hidden`; use a generous cap + `overflow:auto`.

---

### BUG-012: Substitution "introduces" safety guard silently disabled

| Field | Value |
|-------|-------|
| **Reported** | 2026-06 |
| **Status** | Fixed |
| **Severity** | High (safety) |

**Summary**: The guard that prevents recommending a swap which introduces an allergen the diner
avoids (e.g. wheat→almond-flour for a tree-nut-allergic diner) would stop working.

**Root Cause**: The Substitutions tab's `Introduces` column was renamed to **`Introduces allergy`**
(plus an `introduces ingredient` column added). The parser read `row.Introduces` only, so introduced
allergens parsed as empty → the conflict check always passed → unsafe swaps could be offered.

**Fix** (`substitutions.ts`): read the introduced-allergen cell from any header containing
"introduc" + "allerg" (so `Introduces` or `Introduces allergy`); ignore `introduces ingredient`.
Validator updated to match.

**Files Modified**: `ai-llergy-webapp/src/lib/substitutions.ts`, `execution/validate_substitutions.py`.

**Prevention**: Pattern 6 (Sheet schema drift). Safety-critical columns must be matched tolerantly.

**Test Case**:
```bash
# Pita's only gluten swap introduces tree nuts -> must NOT appear when treenuts is selected
curl -s -X POST http://localhost:3000/api/submit -H "Content-Type: application/json" \
 -d '{"allergens":[{"id":"gluten","type":"allergy"},{"id":"treenuts","type":"allergy"}]}' \
 | python -c "import sys,json;print('Pita' in [i['name'] for i in json.load(sys.stdin)['modifiedItems']])"
# Expect: False
```

---

### Pattern 6: Google Sheet schema drift breaks the app

**Problem**: The live data source is an owner/chef-editable Google Sheet. Renaming, removing, or
reordering columns — or changing which tab is first — has repeatedly broken the app silently (empty
menus, dead filters, disabled safety guards). This is now the **most common incident class** here.

**Examples seen**: `Item`→`Dish` (BUG-010), `Introduces`→`Introduces allergy` (BUG-012), `Halal`
title-case vs `HALAL` (BUG-009), `WHEAT FREE` deleted, `HALAL`/`NIGHTSHADE FREE` added, and a dish
flagged `GLUTEN FREE=YES` while also carrying a "make it gluten-free" substitution row (FEATURE-004).

**Mitigations applied**:
1. Tolerant parsing for the highest-churn columns (name = `Item`/`Dish`; introduces =
   `Introduces`/`Introduces allergy`).
2. Unknown columns are ignored (adding `HALAL`/`NIGHTSHADE FREE` doesn't crash anything).
3. `allergens.ts` is the single source of truth — a column only filters if registered there with an
   **exact, case-sensitive** `columnName`.
4. `execution/validate_substitutions.py` checks the subs tab against the menu before publishing.

**Still fragile**: arbitrary allergen-column renames, deleting the name column, or making a non-menu
tab the first tab. See `directives/google_sheet_data_source.md` §5.

**Diagnosis first step** — inspect the raw export, don't assume a code bug:
```bash
curl -sL "https://docs.google.com/spreadsheets/d/<ID>/export?format=csv" | head -1
```

---

### BUG-013: Substitutions tab schema overhaul broke the "Can be modified" feature

| Field | Value |
|-------|-------|
| **Reported** | 2026-06 |
| **Status** | Fixed |
| **Severity** | High |

**Summary**: After the menu column-A rename (BUG-010), the "Can be modified" section was empty even
though substitution rows existed.

**Root Cause**: Mosaic restructured the **whole Substitutions tab** into a richer schema —
`Dish, Action, Element, Element ingredient(s), Substitute Element (name or NO),
Substitute Element ingredient(s), Solves allergy, Introduces allergy (if substitution)`. The parser
keyed off `Solves` (now `Solves allergy`), so `parseSubstitutionRow` saw zero solved allergens and
discarded every row → no rescues.

**Fix**: Replaced fixed header lookups with a tolerant `pickCell` keyword matcher in `substitutions.ts`
(and mirrored it in `validate_substitutions.py`):
- Ingredient ← `Ingredient`/`Element`; Substitute ← `Substitute`/`Substitute Element (name…)` with
  fallback to a `Substitute … ingredient(s)` column (`NO`/blank = none);
- Solves ← any header containing "solve"; Introduces ← any header containing "introduc"+"allerg".

Verified live: gluten → Pita/Boreks/Lemon Tart rescued; gluten+treenuts hides Pita (guard);
garlic → Hummus. (Some current rows are placeholder data on Mosaic's side, e.g. `x,y,z` — chef to
replace with real swaps.)

**Files Modified**: `ai-llergy-webapp/src/lib/substitutions.ts`, `execution/validate_substitutions.py`.

**Prevention**: Pattern 6. Keep subs headers keyword-recognizable (must contain "solve"; introduced
column must contain "introduc"+"allerg"). Full mapping in `directives/substitutions.md`.

