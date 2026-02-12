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

## 3. Open Issues

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

---

## 8. Contributing

When fixing a bug:

1. Add an entry to this document following the format in Section 1
2. Update the changelog in `directives/project_ai_llergy.md`
3. Update relevant directives with lessons learned
4. Add a test case to prevent regression
