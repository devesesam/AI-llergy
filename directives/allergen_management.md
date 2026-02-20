# Directive: Allergen Management

**Goal**: Manage the allergen/dietary preference list for the AI-llergy app, including adding new allergens, updating synonyms, managing groups, and handling the allergy/preference distinction.

## 1. Overview

The allergen system consists of six parts:
1. **Allergen Definitions** (`allergens.ts`) - IDs, labels, icons, and Google Sheet column mappings
2. **Allergen Groups** (`allergens.ts`) - Collapsible UI groups (Nuts, Seafood, etc.)
3. **Selection Types** (`allergens.ts`) - Allergy vs Preference distinction (`SelectedAllergen`)
4. **Synonym Mappings** (`interpret-allergy.ts`) - For autocomplete search and AI interpretation
5. **Autocomplete Input** (`AutocompleteInput.tsx`) - Tag-based allergen entry with typeahead (v2.4)
6. **Google Sheet Columns** - For actual menu filtering

Adding a new allergen requires updating definitions and synonyms. New allergens without Google Sheet columns will be **trackable but won't filter results**.

**Important (v2.4)**: The synonym map is now used for **live autocomplete search** as users type, not just AI fallback. Good synonym coverage = better UX.

## 2. File Reference

| File | Purpose | Location |
|------|---------|----------|
| `allergens.ts` | Allergen definitions, groups, types, SEVERITY_OPTIONS | `ai-llergy-webapp/src/lib/allergens.ts` |
| `interpret-allergy.ts` | Synonym mappings, `searchSynonyms()` | `ai-llergy-webapp/src/lib/interpret-allergy.ts` |
| `AllergenGroup.tsx` | Collapsible group component | `ai-llergy-webapp/src/components/AllergenGroup.tsx` |
| `SeverityModal.tsx` | Batch severity assignment modal (v3.0) | `ai-llergy-webapp/src/components/SeverityModal.tsx` |
| `AllergenTypeModal.tsx` | **DEPRECATED** - Per-click popup (v2.3) | `ai-llergy-webapp/src/components/AllergenTypeModal.tsx` |
| `AutocompleteInput.tsx` | Tag-based input with typeahead (v2.4) | `ai-llergy-webapp/src/components/AutocompleteInput.tsx` |
| `AllergenTag.tsx` | Removable allergen tag chip (v2.4) | `ai-llergy-webapp/src/components/AllergenTag.tsx` |
| `SelectionSummary.tsx` | Results display grouped by severity (v3.0) | `ai-llergy-webapp/src/components/SelectionSummary.tsx` |
| `api/interpret/route.ts` | AI interpretation endpoint (v2.4) | `ai-llergy-webapp/src/app/api/interpret/route.ts` |
| Google Sheet | Menu data with allergen columns | Sheet ID: `1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU` |

## 3. Current Allergen List (v2.2)

### Tier 1: Dietary Preferences
| ID | Label | Icon | Sheet Column | Status |
|----|-------|------|--------------|--------|
| `vegetarian` | Vegetarian | :leafy_green: | Vegetarian | Active |
| `vegan` | Vegan | :broccoli: | Vegan | Active |

### Tier 2: Big 9 Allergens (Most Common)
| ID | Label | Icon | Sheet Column | Status |
|----|-------|------|--------------|--------|
| `peanuts` | Peanuts | :peanuts: | PEANUT FREE | **Pending** |
| `treenuts` | Tree Nuts | :chestnut: | TREE NUT FREE | **Pending** |
| `eggs` | Eggs | :egg: | EGG FREE | **Pending** |
| `dairy` | Dairy | :glass_of_milk: | DAIRY FREE | Active |
| `gluten` | Gluten | :ear_of_rice: | GLUTEN FREE | Active |
| `soy` | Soy | :seedling: | SOY FREE | Active |
| `fish` | Fish | :fish: | FISH FREE | **Pending** |
| `shellfish` | Shellfish | :shrimp: | SHELLFISH FREE | **Pending** |
| `sesame` | Sesame | :bagel: | SESAME FREE | Active |

### Tier 3: Specific Nuts
| ID | Label | Icon | Sheet Column | Status |
|----|-------|------|--------------|--------|
| `almond` | Almond | :chestnut: | ALMOND FREE | Active |
| `walnut` | Walnut | :chestnut: | WALNUT FREE | Active |
| `pistachio` | Pistachio | :peanuts: | PISTACHIO FREE | Active |

### Tier 4: Less Common / Regional
| ID | Label | Icon | Sheet Column | Status |
|----|-------|------|--------------|--------|
| `wheat` | Wheat | :ear_of_rice: | WHEAT FREE | **Pending** |
| `mustard` | Mustard | :yellow_circle: | MUSTARD FREE | **Pending** |
| `sulfites` | Sulfites | :test_tube: | SULFITE FREE | **Pending** |
| `garlic` | Garlic | :garlic: | GARLIC FREE | Active |
| `onion` | Onion | :onion: | ONION FREE | Active |
| `celery` | Celery | :leafy_green: | CELERY FREE | **Pending** |
| `chili` | Chili | :hot_pepper: | CHILI FREE | Active |
| `capsicum` | Capsicum | :hot_pepper: | CAPSICUM FREE | Active |
| `lupin` | Lupin | :cherry_blossom: | LUPIN FREE | **Pending** |
| `molluscs` | Molluscs | :squid: | MOLLUSC FREE | **Pending** |

**Status Legend**:
- **Active**: Sheet column exists, filtering uses fast column-based lookup (~50ms)
- **Pending**: Sheet column missing; filtering uses AI-based ingredient analysis (~2-5s)

> **Note (v2.4.4)**: "Pending" allergens now WORK via AI filtering! They're slower but functional. When chefs add the column to the Google Sheet, filtering automatically switches to fast column-based mode.

## 4. How to Add a New Allergen

> **Important (v2.4.3)**: `allergens.ts` is the **single source of truth** for allergen definitions.
> The `menu-service.ts` file dynamically imports from `ALL_FILTERS` - you do NOT need to update it when adding allergens.
> See `directives/backend_menu_filter.md` §12 for full data synchronization rules.

### Step 1: Update `allergens.ts`

Add the new allergen to the `ALLERGENS` array in the appropriate tier:

```typescript
// In ALLERGENS array
{ id: "newallergy", label: "New Allergy", icon: "emoji", columnName: "NEW ALLERGY FREE" },
```

**Requirements**:
- `id`: lowercase, no spaces (used as internal key)
- `label`: Display name (Title Case)
- `icon`: Unicode emoji (test on Windows for compatibility)
- `columnName`: Must match Google Sheet header exactly

### Step 2: Update `interpret-allergy.ts`

Add synonyms to the `SYNONYM_MAP`:

```typescript
newallergy: ["synonym1", "synonym2", "related term"],
```

**Guidelines**:
- Include common misspellings
- Include related ingredients (e.g., "tahini" for sesame)
- Include alternate names (e.g., "groundnut" for peanuts)
- Keep terms lowercase

### Step 3: Update Google Sheet (for active filtering)

Add a new column to the Google Sheet:
1. Column header: e.g., `NEW ALLERGY FREE`
2. Values: `YES`, `NO`, or `CAN BE` for each menu item

**Until the sheet is updated**, the allergen will be:
- Selectable in the UI
- Tracked in submissions
- NOT used to filter menu results

### Step 4: Update Documentation

Update the allergen tables in:
- This file (`directives/allergen_management.md`)
- `directives/backend_menu_filter.md` (Section 4)

## 5. Allergen Groups (v4.4)

Allergens are organized into collapsible dropdown groups in the UI for better usability. All allergen categories (except Dietary Preferences) now use the same accordion-style dropdown pattern.

### Current Groups

| Group ID | Label | Members | Icon | Type |
|----------|-------|---------|------|------|
| `nuts` | Nuts | peanuts, treenuts, almond, walnut, pistachio | 🥜 | Defined in `ALLERGEN_GROUPS` |
| `seafood` | Seafood | fish, shellfish, molluscs | 🦐 | Defined in `ALLERGEN_GROUPS` |
| `aromatics` | Aromatics | garlic, onion, celery | 🧄 | Defined in `ALLERGEN_GROUPS` |
| `spicy` | Spicy | chili, capsicum | 🌶️ | Defined in `ALLERGEN_GROUPS` |
| `other` | Other | eggs, dairy, gluten, soy, sesame, wheat, mustard, sulfites, lupin | 🍽️ | Inline in `AllergenGrid.tsx` |

### Dietary Preferences (Standalone)
- **Vegetarian**, **Vegan** - Displayed as individual tiles (not in dropdown)

### Other Allergens Group (v4.4)
As of v4.4, the "Other Allergens" section now uses the same dropdown accordion pattern as the named groups. This provides UI consistency and reduces visual clutter on initial page load.

**Implementation**: The "Other" group is created inline in `AllergenGrid.tsx` rather than being defined in `ALLERGEN_GROUPS`:

```typescript
// In AllergenGrid.tsx
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

**Why inline?** The "Other" group is computed from `STANDALONE_ALLERGENS` (allergens not in any named group). Defining it inline keeps the separation clear and automatically includes any allergens added in the future that don't belong to a specific group.

### Group Definition in `allergens.ts`

```typescript
export const ALLERGEN_GROUPS: AllergenGroup[] = [
  { id: "nuts", label: "Nuts", icon: "🥜", members: ["peanuts", "treenuts", "almond", "walnut", "pistachio"] },
  { id: "seafood", label: "Seafood", icon: "🦐", members: ["fish", "shellfish", "molluscs"] },
  { id: "aromatics", label: "Aromatics", icon: "🧄", members: ["garlic", "onion", "celery"] },
  { id: "spicy", label: "Spicy", icon: "🌶️", members: ["chili", "capsicum"] },
];
```

### Adding a New Group

1. Add the group definition to `ALLERGEN_GROUPS` in `allergens.ts`
2. Ensure all member allergen IDs exist in `ALLERGENS` array
3. No component changes needed - grid auto-renders new groups

### Modifying Group Members

1. Edit the `members` array in the relevant group
2. Allergens can only belong to ONE group
3. Allergens not in any group appear in "Other Allergens" section

## 6. Severity Selection System (v3.0)

Users assign severity levels to their selections in a batch modal before submission. This replaced the per-click modal popup from v2.3.

### Data Structure

```typescript
// Old (pre-v2.3)
selectedAllergens: Set<string>  // Just IDs

// v2.3-v2.6
interface SelectedAllergen {
  id: string;
  type: "allergy" | "preference";
}

// v3.0+
export type SeverityType = "preference" | "allergy" | "life_threatening";

interface SelectedAllergen {
  id: string;
  type: SeverityType;
}

// State split: pending vs confirmed
pendingAllergenIds: string[]           // Selected but no severity yet
selectedAllergens: SelectedAllergen[]  // Confirmed with severity
```

### Severity Options

```typescript
export const SEVERITY_OPTIONS = [
  { value: "preference", label: "Preference", shortLabel: "P", description: "I prefer to avoid this" },
  { value: "allergy", label: "Intolerance/Allergy", shortLabel: "A", description: "I cannot eat this safely" },
  { value: "life_threatening", label: "Life Threatening", shortLabel: "L", description: "Medical emergency risk" },
];
```

### Visual Styling (v3.0 Colors)

| Type | CSS Variable | Color | Background | Badge |
|------|--------------|-------|------------|-------|
| Preference | `--color-severity-preference` | `#22c55e` (Green) | `rgba(34, 197, 94, 0.1)` | Green "P" |
| Intolerance/Allergy | `--color-severity-allergy` | `#f97316` (Orange) | `rgba(249, 115, 22, 0.1)` | Orange "A" |
| Life Threatening | `--color-severity-critical` | `#dc2626` (Red) | `rgba(220, 38, 38, 0.1)` | Red "L" |

> **Breaking Change (v3.0)**: The color scheme changed from Yellow/Red (v2.3) to Green/Orange/Red severity gradient.

### User Flow (v4.3 - Slider UI)

1. User clicks allergens freely → Toggle on/off (no popup)
2. User adds custom tags via autocomplete
3. User clicks Submit → **SeverityModal** opens
4. Modal shows all selections with **3-point slider** (replaces buttons)
5. Each item displays: allergen name above, draggable slider below
6. Slider has labeled points: "Preference" | "Intolerance/Allergy" | "Life Threatening"
7. User drags slider or clicks points to adjust severity (default: Preference)
8. User checks responsibility acknowledgment checkbox
9. User clicks Confirm → Data submitted to API

### Severity Slider UI (v4.3)

The slider replaces the P/A/L button segmented control:

**Visual Design**:
- Track shows color gradient: green → orange → red
- Thumb color matches current selection (green/orange/red)
- Labels positioned above slider at each third
- Full-width slider within modal item

**CSS Classes**:
```css
.severity-slider                    /* Container */
.severity-slider__labels            /* Label row above slider */
.severity-slider__label--preference /* Green text */
.severity-slider__label--allergy    /* Orange text */
.severity-slider__label--life_threatening  /* Red text */
.severity-slider__input             /* Range input */
.severity-slider__input--preference /* Green thumb */
.severity-slider__input--allergy    /* Orange thumb */
.severity-slider__input--life_threatening /* Red thumb */
```

**Implementation**:
```typescript
<input
  type="range"
  min="0"
  max="2"
  step="1"
  value={SEVERITY_OPTIONS.findIndex(opt => opt.value === severityMap[item.id])}
  onChange={(e) => handleSeverityChange(item.id, SEVERITY_OPTIONS[parseInt(e.target.value)].value)}
  className={`severity-slider__input severity-slider__input--${severityMap[item.id]}`}
/>
```

**Modal Item Layout Change**:
- v3.0: Horizontal (name left, buttons right)
- v4.3: Vertical (name above, slider below full-width)
- Allows slider to use full width for better touch targets

### Pending State

Allergens that are selected but haven't been through the SeverityModal are "pending":

```typescript
// Pending state
pendingAllergenIds.includes(allergen.id)  // true = selected, no type

// Confirmed state
selectedAllergens.some(s => s.id === allergen.id)  // true = has severity
```

**CSS Classes**:
- `.selected--pending` - Generic highlight (no severity color)
- `.selected--preference` - Green highlight
- `.selected--allergy` - Orange highlight
- `.selected--life_threatening` - Red highlight

### API Handling

The type distinction remains **UI-only**. The backend extracts IDs for filtering:

```typescript
// In route.ts
const allergenIds = allergens.map((a: SelectedAllergen) => a.id);
```

All severity levels filter identically. The distinction is for:
1. User awareness of their selection severity
2. Results page display (grouped by severity)
3. Future backend enhancements (e.g., different handling per severity)

### Results Display (SelectionSummary)

Selections are grouped into three sections:
1. **Life Threatening** - Red pills, shown first (most critical)
2. **Intolerance/Allergy** - Orange pills
3. **Preferences** - Green pills

Custom tags also display with their assigned severity.

## 7. How to Reorder Allergens

The display order is determined by the array order in `allergens.ts`:

1. `DIETARY_PREFERENCES` array - displayed first (standalone)
2. `ALLERGEN_GROUPS` - displayed in group order with dropdowns
3. `STANDALONE_ALLERGENS` - allergens not in any group, displayed last

**Current order logic**:
1. Dietary preferences (Vegetarian, Vegan) - standalone at top
2. Grouped allergens (Nuts, Seafood, Aromatics, Spicy) - collapsible
3. Standalone allergens (Eggs, Dairy, Gluten, etc.) - individual buttons

To reorder groups, change the order in `ALLERGEN_GROUPS` array.
To move an allergen between sections, add/remove from group `members` array.

## 6. Synonym Reference

> **Note (v2.4)**: The synonym map (`SYNONYM_MAP` in `interpret-allergy.ts`) is now exported and used by `searchSynonyms()` for live autocomplete. When adding synonyms, consider:
> - Common typos (users will see matches as they type)
> - Regional variations (UK: "courgette" = US: "zucchini")
> - Brand names or colloquial terms users might type

### Big 9 Allergens

| Allergen | Synonyms |
|----------|----------|
| peanuts | peanut, groundnut, groundnuts, arachis |
| treenuts | tree nut, tree nuts, nuts, nut allergy |
| eggs | egg, ova, albumin, mayonnaise, mayo, meringue |
| dairy | milk, lactose, cheese, butter, cream, yogurt, whey, casein |
| gluten | barley, rye, celiac, coeliac |
| soy | soya, soybean, soybeans, tofu, edamame |
| fish | cod, salmon, tuna, anchovy, anchovies, sardine, sardines, tilapia, halibut |
| shellfish | shrimp, crab, lobster, prawn, prawns, crawfish, crayfish, scampi |
| sesame | tahini, sesame seeds |

### Other Allergens

| Allergen | Synonyms |
|----------|----------|
| wheat | semolina, durum, spelt, farina, farro, bulgur |
| mustard | dijon |
| sulfites | sulfite, sulphite, sulphites, so2, preservatives |
| celery | celeriac |
| lupin | lupine, lupini, lupin beans |
| molluscs | mollusk, mollusks, squid, octopus, clam, clams, mussel, mussels, oyster, oysters, scallop, scallops, snail, snails |
| chili | chilli, chillies, chilies, spicy, hot pepper |
| capsicum | bell pepper, bell peppers, peppers |
| onion | onions, shallot, shallots, leek, leeks |

### Dietary Preferences

| Preference | Synonyms |
|------------|----------|
| vegetarian | veggie, no meat, meatless |
| vegan | plant-based, plant based, no animal |

**Important**: Dietary preferences require special handling in `formatWarnings()`. See Section 7.

## 7. Dietary Preference Handling

### 7.1 Warning Text Phrasing

Dietary preferences (vegan, vegetarian) use different phrasing than allergens in the "Can Be Modified" warnings:

| Type | Example Output |
|------|----------------|
| **Allergen** | "Can be made Dairy-free on request" |
| **Dietary Preference** | "Can be made Vegan on request" |

The `-free` suffix makes sense for allergens (removing an ingredient) but not for dietary preferences (you make something *vegan*, not *vegan-free*).

### 7.2 Adding New Dietary Preferences

When adding new dietary preferences (e.g., halal, kosher, pescatarian):

1. Add to `DIETARY_PREFERENCES` array in `allergens.ts`
2. Add to `dietaryPreferences` set in `filter-menu.ts` → `formatWarnings()` function
3. Add synonyms to `interpret-allergy.ts`

**Critical**: If you forget step 2, the warning text will say "halal-free" instead of "halal".

```typescript
// In filter-menu.ts, formatWarnings()
const dietaryPreferences = new Set(["vegan", "vegetarian", "halal", "kosher"]);
```

See `directives/backend_menu_filter.md` §4.1 for full implementation details.

## 8. Icon Guidelines

### Windows Compatibility
Some emojis render as square boxes on Windows. Tested compatible emojis:
- Food: :peanuts: :chestnut: :egg: :glass_of_milk: :seedling: :fish: :shrimp: :bagel: :garlic: :onion: :hot_pepper: :squid: :broccoli: :leafy_green:
- Other: :test_tube: :yellow_circle: :cherry_blossom: :ear_of_rice:

### Icons to Avoid
- :beans: (renders as square on some Windows systems)
- Complex compound emojis

### Testing
Always test new icons on Windows before committing.

## 9. Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Allergen not filtering | Sheet column missing | Add column to Google Sheet |
| Icon shows as square | Incompatible emoji | Replace with compatible emoji |
| Synonym not matching | Case sensitivity | Ensure synonym is lowercase |
| Duplicate allergen | ID conflict | Use unique ID |
| Wrong column mapped | columnName mismatch | Match sheet header exactly |

## 10. Testing Checklist

After adding/modifying allergens:

- [ ] Build passes: `npm run build`
- [ ] Allergen appears in form grid
- [ ] Allergen is in correct position (by tier)
- [ ] Icon displays correctly (test Windows)
- [ ] Button toggles selection state
- [ ] **Autocomplete (v2.4)**: Synonyms appear in dropdown when typing
- [ ] **Tag Selection (v2.4)**: Clicking suggestion creates tag, clears input
- [ ] **Fuzzy Match (v2.4.1)**: Typos like "penuts" match "peanuts"
- [ ] **Phrase Parse (v2.4.1)**: "i can't eat peanuts" → matches Peanuts
- [ ] **AI Fallback (v2.4)**: Truly unknown terms trigger AI when clicked
- [ ] (If sheet column exists) Filtering returns correct results

## 11. Related Directives

- **Custom Input**: See `directives/custom_allergy_input.md` for autocomplete documentation (v2.4)
- **Backend**: See `directives/backend_menu_filter.md` for filtering logic
- **Frontend**: See `directives/frontend_results_display.md` for results UI
- **Project**: See `directives/project_ai_llergy.md` for full changelog

## 13. Version History

### v4.4 (2026-02-20)
- **Other Allergens Dropdown**: Converted "Other Allergens" section from static grid to dropdown accordion
- **UI Consistency**: All allergen categories (except Dietary Preferences) now use same accordion pattern
- **Implementation**: Inline `AllergenGroup` component using `STANDALONE_ALLERGENS` for members
- **Files Modified**: `AllergenGrid.tsx` only - reuses existing `AllergenGroup` component
- **See**: Section 5 "Other Allergens Group" for implementation details

### v4.3 (2026-02-19)
- **Severity Slider UI**: Replaced P/A/L buttons with draggable 3-point slider
- **Labels**: Added "Preference" | "Intolerance/Allergy" | "Life Threatening" text above slider
- **Modal Layout**: Changed from horizontal to vertical layout for better slider usability
- **Browser Support**: Added Firefox `-moz-range-thumb` styles
- **See**: Section 6 "Severity Slider UI" for implementation details

### v3.0 (2026-02-19)
- **Batch Severity Selection**: Replaced per-allergen modal with batch SeverityModal
- **3-Level Severity**: Added `life_threatening` type (Preference → Intolerance/Allergy → Life Threatening)
- **Color Scheme Change**: Yellow/Red → Green/Orange/Red severity gradient
- **Pending State**: Split `pendingAllergenIds` from `selectedAllergens` for staged selection
- **Responsibility Checkbox**: Required acknowledgment before confirm
- **New Files**: `SeverityModal.tsx`
- **Updated**: `allergens.ts` (SeverityType, SEVERITY_OPTIONS), all selection components
- **See**: Section 6 for complete severity documentation

### v2.4.4 (2026-02-13)
- **Hybrid Filtering**: Allergens without columns now use AI instead of failing
- **Problem**: v2.4.3 fix caused missing columns to exclude ALL items
- **Solution**: Two-pass filtering - column-based first, then AI for missing columns
- **Result**: "Pending" allergens (fish, peanuts, etc.) now work via AI ingredient analysis
- **See**: `directives/backend_menu_filter.md` §13 for hybrid filtering details

### v2.4.3 (2026-02-13)
- **Critical Bug Fix**: Fish allergen (and 10 others) not filtering menu items
- **Root Cause**: `menu-service.ts` had hardcoded allergenColumns array out of sync with `allergens.ts`
- **Fix**: Replaced hardcoded array with dynamic import from `ALL_FILTERS`
- **Lesson**: `allergens.ts` is the single source of truth - never duplicate allergen lists elsewhere
- **See**: `directives/backend_menu_filter.md` §12 for data sync rules
- **See**: `directives/known_issues_and_fixes.md` for full issue documentation

### v2.4.2 (2026-02-10)
- **Submit Button Feedback**: Added helper text and pulsing border when submit disabled
- **New CSS**: `.submit-helper`, `.autocomplete-input--blocking` with pulse animation
- **See**: `directives/custom_allergy_input.md` §7 for submit flow details

### v2.4.1 (2026-02-10)
- **Fuzzy Matching**: Added Levenshtein distance for typo tolerance ("penuts" → peanuts)
- **Phrase Tokenization**: Parse natural language ("i can't eat peanuts" → Peanuts)
- **Stop Word Filtering**: 50+ common words filtered (pronouns, articles, verbs)
- **Updated**: `interpret-allergy.ts` (added `levenshteinDistance()`, `tokenize()`, `isFuzzyMatch()`)
- **See**: `directives/custom_allergy_input.md` §5 for detailed search behavior

### v2.4 (2026-02-10)
- **Autocomplete Input**: Replaced freeform text with tag-based autocomplete
- **Synonym Search**: Exported `SYNONYM_MAP`, added `searchSynonyms()` for live typeahead
- **AI Fallback Button**: User explicitly triggers AI when no local matches
- **Submit Validation**: Button disabled until all text converted to tags
- **New Files**: `AutocompleteInput.tsx`, `AllergenTag.tsx`, `api/interpret/route.ts`
- **Updated**: `interpret-allergy.ts`, `page.tsx`, `route.ts`, `allergens.ts`
- **See**: `directives/custom_allergy_input.md` for detailed autocomplete documentation

### v2.3 (2026-02-10)
- **Allergen Groups**: Added collapsible groups (Nuts, Seafood, Aromatics, Spicy)
- **Allergy/Preference**: Added type distinction with modal popup
- **Data Structure**: Changed from `Set<string>` to `SelectedAllergen[]`
- **New Files**: `AllergenGroup.tsx`, `AllergenTypeModal.tsx`
- **Updated**: `allergens.ts` (groups, types), `AllergenGrid.tsx`, `AllergenButton.tsx`

### v2.2.1 (2026-02-10)
- Fixed "vegan-free" / "vegetarian-free" phrasing bug
- Added Section 8 documenting dietary preference handling
- Added `dietaryPreferences` set guidance for future additions

### v2.2 (2026-01-21)
- Added 11 new allergens (Peanuts, Tree Nuts, Eggs, Fish, Shellfish, Wheat, Mustard, Sulfites, Celery, Lupin, Molluscs)
- Reordered list by prevalence (Big 9 first)
- Added synonym mappings for all new allergens
- Created this directive

### v2.0 (2026-01-21)
- Initial allergen system with 13 options
- Local synonym matching + AI fallback

## 14. Future Work

- [ ] Add Google Sheet columns for pending allergens (Peanuts, Eggs, Fish, etc.)
- [ ] Consider adding: Corn, Coconut, Nightshades, FODMAP indicators
- [x] ~~Add allergen grouping UI (collapsible sections by tier)~~ (Done in v2.3)
- [x] ~~Add allergen search/filter in form~~ (Done in v2.4 via autocomplete)
- [ ] Add "Select All" quick action for groups (e.g., "Select All Nuts")
- [x] ~~Add ability to change allergy/preference type after selection~~ (Done in v3.0 - batch modal allows adjustment)
- [x] ~~Add 3-level severity system (Preference, Allergy, Life Threatening)~~ (Done in v3.0)
- [x] ~~Batch severity assignment instead of per-click popup~~ (Done in v3.0)
- [ ] Persist selections in localStorage for returning users
- [ ] Learn from AI: log successful interpretations, bulk-add to SYNONYM_MAP
- [x] ~~Add fuzzy matching (Levenshtein distance) before triggering AI~~ (Done in v2.4.1)
- [x] ~~Add phrase tokenization for natural language input~~ (Done in v2.4.1)
- [ ] Add keyboard navigation for autocomplete dropdown
- [ ] Backend severity handling (different filtering/warnings per severity level)
