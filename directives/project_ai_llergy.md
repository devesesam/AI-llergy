# Project Directive: AI-llergy Web App

**Goal**: Develop and maintain a mobile-first, high-end web application that allows users to filter menu items based on allergies. Like the "Mosaic" parent brand, the design must be premium, using the specific "Food Magazine Editorial" aesthetic.

## 1. Resources & Standards

### Brand Guidelines
*   **Location**: `skills/graphics_design/resources/BrandGuidelines_Mosaic.pdf`
*   **Key Colors**:
    *   Background: *Garlic* (`#FDFBF7`)
    *   Text: *Charcoal* (`#1E1E1E`)
    *   Accents: *Saffron* (`#F4B223`), *Seafoam* (`#8FB6AB`)
*   **Typography**:
    *   Headlines: *Bogart Medium* (Serif)
    *   Body: *Neue Haas Grotesk* (Sans-serif)
*   **Skill Access**: Refer to `skills/graphics_design/SKILL.md` for logo overlay scripts and prompting guides.

### External Data Sources
*   **Menu Database**: Google Sheets (public)
    *   Sheet ID: `1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU`
    *   Contains: Menu items, ingredients, prices, allergen columns (YES/NO/CAN BE)
*   **AI API**: Anthropic Claude (for custom allergy text interpretation)

## 2. Architecture & Tech Stack

### Primary App (Next.js) - ACTIVE
*   **Type**: Next.js 16 + React 19 + TypeScript
*   **Location**: `ai-llergy-webapp/`
*   **Structure**:
    *   `src/app/page.tsx`: Main page with form/results view toggle
    *   `src/app/api/submit/route.ts`: Backend API for menu filtering
    *   `src/app/api/interpret/route.ts`: AI interpretation endpoint for autocomplete (v2.4)
    *   `src/components/`: UI components
        *   `AllergenGrid.tsx`: Allergen selection grid with sections
        *   `AllergenButton.tsx`: Individual allergen toggle with type badge
        *   `AllergenGroup.tsx`: Collapsible allergen group dropdown (v2.3)
        *   `AllergenTypeModal.tsx`: Allergy vs preference selection popup (v2.3)
        *   `AutocompleteInput.tsx`: Tag-based allergen input with typeahead (v2.4, v2.6)
        *   `AllergenTag.tsx`: Removable allergen tag chip (v2.4)
        *   `CustomTagPill.tsx`: Removable custom restriction tag chip (v2.6)
        *   `MenuResults.tsx`: Results container with accordions
        *   `SelectionSummary.tsx`: User selections display at top of results (v2.3, v2.6)
        *   `AccordionSection.tsx`: Collapsible section component
        *   `MenuItem.tsx`: Individual menu item card with expandable ingredients toggle (v2.5)
        *   `DisclaimerModal.tsx`, `LoadingSpinner.tsx`: Utility components
    *   `src/lib/`: Core logic modules (see Backend Directive)
        *   `ai-filter.ts`: AI-powered menu filtering for custom tags (v2.6)
*   **Run**: `npm run dev` (uses Turbopack)

### Legacy App (Static HTML) - DEPRECATED
*   **Type**: Static Web App (HTML/CSS/JS)
*   **Location**: `ai-llergy-app/`
*   **Status**: Kept for reference only. All new development in `ai-llergy-webapp/`

## 3. Development Workflow (DOE)

### Phase 1: Directive (Planning)
*   Define functional requirements (e.g., "Add a search bar").
*   Consult Brand Guidelines to ensure new features match the aesthetic.
*   **Deliverable**: Updated Implementation Plan.

### Phase 2: Orchestration (Design & Implementation)
*   **Design**: Use `generate_image` to visualize new UI components before coding.
    *   *Prompt Tip*: "Mobile UI, Garlic cream background, Charcoal serif text, premium editorial feel."
*   **Assets**: Ensure fonts (`Bogart`) are properly linked. Use `skills/graphics_design/scripts/add_logo.py` if generating new visual assets.
*   **Code**: Implement changes in `ai-llergy-webapp/`.

### Phase 3: Execution (Verification)
*   **Run Dev Server**: `cd ai-llergy-webapp && npm run dev`
*   **Test API**: Use curl or Postman to test `/api/submit` endpoint
*   **Process**:
    1.  Capture initial state.
    2.  Perform interactions (Click toggles, buttons, submit form).
    3.  Verify API response matches expected filtered menu.
    4.  Check browser console for errors.

## 4. Change Log & Issues

### v2.4.4 - Hybrid Column + AI Filtering for Missing Columns (2026-02-13)

**Enhancement**: Allergens without Google Sheet columns now use AI filtering instead of failing.

*   **Problem Solved**: After v2.4.3 fix, allergens without columns (fish, peanuts, etc.) were excluding ALL items because missing columns defaulted to "NO".

*   **Solution: Hybrid Two-Pass Filtering**
    1.  Detect which columns exist in Google Sheet on menu fetch
    2.  Split selected allergens into "has column" vs "needs AI"
    3.  If ALL have columns → Fast column-based filtering only (~50ms)
    4.  If ANY missing → Column filter first (reduces items), then AI filters the reduced list

*   **Key Optimization**: Column filtering runs FIRST to reduce item count before AI processing. If dairy excludes 11 items, AI only processes 20 instead of 31 = faster + cheaper.

*   **Files Modified**:
    *   `src/lib/menu-service.ts` - Added `detectAvailableColumns()`, `getAvailableColumns()` export
    *   `src/lib/filter-menu.ts` - Skip undefined column values (handled by AI)
    *   `src/app/api/submit/route.ts` - Hybrid filtering logic with column/AI split

*   **Console Logging**:
    ```
    [menu-service] Available columns: ["Vegetarian", "Vegan", "DAIRY FREE", ...]
    [route] Column filtering: 31 → 20 items (excluded 11)
    [route] AI filtering 20 items for: ["Fish", "Peanuts"]
    ```

*   **Behavior Change**:
    | Allergen | Before v2.4.4 | After v2.4.4 |
    |----------|---------------|--------------|
    | Dairy (has column) | Column-based | Column-based |
    | Fish (no column) | Excluded ALL | AI-based ingredient analysis |
    | Fish + Dairy | Excluded ALL | Column first, then AI on reduced list |

*   **Related Directives**:
    *   See `directives/backend_menu_filter.md` §13 for hybrid filtering details
    *   See `directives/allergen_management.md` §3 for updated "Pending" behavior
    *   See `directives/github_deployment.md` for deployment workflow and troubleshooting

*   **Status**: **Live** (Local). Build passes.

---

### v2.6.1 - Simplified Custom Tag UX (2026-02-13)

**UX Improvement**: Removed the "Ask AI" intermediate step when adding custom restrictions.

*   **Before**: No matches → 500ms → "Ask AI" button → AI interprets → AI fails → "Add as custom restriction"
*   **After**: No matches → 500ms → "Add as custom restriction" button directly

*   **Reason**: AI interpretation rarely found matches for terms not already in the synonym list, making the intermediate step unnecessary friction.

*   **Keyboard Enhancement**: Pressing Enter when showing "Add as custom" now adds the tag

*   **Files Modified**: `src/components/AutocompleteInput.tsx` (removed AI loading/error states, simplified flow)

---

### v2.6 - Custom Allergen Tags with AI-Based Filtering (2026-02-13)

**Major Feature**: Allow users to add free-form dietary restrictions that aren't in the standard allergen list. When custom tags exist, menu filtering uses AI to analyze ingredients instead of column-based filtering.

*   **Problem Solved**: Users with restrictions not covered by standard allergens (e.g., nightshades, FODMAPs, specific vegetables like cucumber) previously had no way to filter the menu. Now they can type any restriction, add it as a custom tag, and get AI-powered menu filtering.

*   **Feature 1: Custom Tags in Autocomplete**
    *   When AI can't match input to known allergens, shows "Add as custom restriction" button
    *   Custom tags display with 🏷️ icon and gray styling (distinct from standard allergen tags)
    *   Removable like standard tags
    *   **Files Added**: `src/components/CustomTagPill.tsx`
    *   **Files Modified**: `src/components/AutocompleteInput.tsx`

*   **Feature 2: AI-Based Menu Filtering**
    *   When custom tags exist, `filterMenuWithAI()` replaces standard column filtering
    *   AI (Claude Haiku) analyzes menu item ingredients against custom restrictions
    *   Hybrid approach: standard allergens still filter via columns first, reducing AI workload
    *   Batch processing: 20 items per API call for efficiency
    *   Conservative: if unsure, marks as "caution" (ask staff)
    *   **Files Added**: `src/lib/ai-filter.ts`
    *   **Files Modified**: `src/app/api/submit/route.ts`

*   **Feature 3: Results Display**
    *   Custom tags shown in "Custom Restrictions" section of SelectionSummary
    *   AI-generated warnings displayed in caution items
    *   **Files Modified**: `src/components/SelectionSummary.tsx`, `src/components/MenuResults.tsx`

*   **Data Model Changes**:
    *   Added `CustomTag` interface: `{ id, text, displayLabel }`
    *   Updated `AllergenSubmission` to include `customTags?: CustomTag[]`
    *   **Files Modified**: `src/lib/allergens.ts`

*   **CSS Additions** (~60 lines in `globals.css`):
    *   `.custom-tag`, `.custom-tag__icon`, `.custom-tag__label`, `.custom-tag__remove`
    *   `.autocomplete-add-custom` (dashed border button)
    *   `.selection-pill--custom-tag`, `.selection-summary__label--custom-tag`

*   **Performance**:
    *   Standard allergens only: ~50-100ms (unchanged)
    *   With custom tags: ~2000-5000ms (AI processing)
    *   Pre-filtering with standard allergens reduces AI batch count

*   **Known Limitations**:
    *   Requires `ANTHROPIC_API_KEY` in production environment (Netlify/Vercel)
    *   AI filtering slower than column-based (~2-5s vs instant)
    *   See `directives/known_issues_and_fixes.md` for details

*   **Related Directives**:
    *   See `directives/custom_allergy_input.md` §12 for full custom tags documentation
    *   See `directives/backend_menu_filter.md` §14 for AI filtering details
    *   See `directives/known_issues_and_fixes.md` for open issues

*   **Status**: **Live** (Local). Build passes. Ready for testing.

---

### v2.5 - Expandable Ingredient Dropdown (2026-02-13)

**Feature**: Added expandable dropdown to show/hide ingredients on each menu item.

*   **Problem Solved**: Previously ingredients were completely hidden (v2.3), leaving users unable to see what's in a dish. Now users can optionally expand any menu item to view its ingredients.

*   **Implementation**:
    *   Added `useState` hook to `MenuItem.tsx` for expand/collapse state
    *   Added circular chevron toggle button (follows existing accordion pattern)
    *   Ingredients render in a collapsible wrapper with smooth CSS animation
    *   Accessibility: `aria-expanded`, `aria-label`, `aria-hidden` attributes

*   **Files Modified**:
    *   `src/components/MenuItem.tsx` - Added expand state, toggle button, conditional rendering
    *   `src/app/globals.css` - Added ~40 lines: `.menu-item__header-right`, `.menu-item__toggle`, `.menu-item__ingredients-wrapper` styles

*   **CSS Classes Added**:
    *   `.menu-item__header-right` - Flex container grouping price + toggle
    *   `.menu-item__toggle` - Circular button with rotating chevron
    *   `.menu-item__toggle--open` - Rotated state (-90deg)
    *   `.menu-item__ingredients-wrapper` - Collapsible container (max-height animation)
    *   `.menu-item__ingredients-wrapper--open` - Expanded state

*   **Pattern Reuse**: Uses same chevron rotation pattern as `AccordionSection.tsx` for consistency

*   **Related Directives**: See `directives/frontend_results_display.md` for full component docs

*   **Status**: **Live** (Local). Build passes.

---

### v2.4.3 - Fish Allergen Filtering Bug Fix (2026-02-13)

**Critical Bug Fix** - Menu items containing fish (and 10 other allergens) were not being filtered.

*   **Bug Report**: User selected "Fish" allergen but "Cured Market Fish" still appeared in results.

*   **Root Cause**: **Data synchronization gap** between `allergens.ts` and `menu-service.ts`
    *   `allergens.ts` defined 22 allergens with column mappings (e.g., `fish` → `"FISH FREE"`)
    *   `menu-service.ts` had a **hardcoded** `allergenColumns` array with only 13 columns
    *   Missing columns: `FISH FREE`, `SHELLFISH FREE`, `PEANUT FREE`, `TREE NUT FREE`, `WHEAT FREE`, `EGG FREE`, `MUSTARD FREE`, `SULFITE FREE`, `CELERY FREE`, `LUPIN FREE`, `MOLLUSC FREE`
    *   When filtering, the app looked for `allergenProfile["FISH FREE"]` but it was `undefined` (never extracted from sheet data)
    *   `undefined` didn't match `"NO"`, so items passed through as safe

*   **Fix**: Replaced hardcoded array with dynamic import from `allergens.ts`
    ```typescript
    // OLD (broken) - hardcoded list missing many columns
    const allergenColumns = ["Vegetarian", "Vegan", "DAIRY FREE", ...]; // only 13

    // NEW (fixed) - dynamically derived from allergens.ts
    import { ALL_FILTERS } from "./allergens";
    for (const allergen of ALL_FILTERS) {
      const col = allergen.columnName;
      // ... extract value
    }
    ```

*   **Files Modified**:
    *   `src/lib/menu-service.ts` - Added import, replaced hardcoded array with dynamic iteration

*   **Lesson Learned**: Never duplicate allergen column definitions. Always derive from the single source of truth (`allergens.ts`).

*   **Related Directives**:
    *   See `directives/backend_menu_filter.md` §4.2 for updated data flow
    *   See `directives/allergen_management.md` §3 for allergen status updates
    *   See `directives/known_issues_and_fixes.md` for full issue tracking

*   **Status**: **Fixed** (Local). Build passes.

---

### v2.4.2 - Submit Button UX Feedback (2026-02-10)

**Enhancement** to provide clear feedback when submit button is disabled.

*   **Problem Solved**: Users didn't understand why the submit button was disabled when text was in the search field.

*   **Feature 1: Helper Text Below Button**
    *   Warning-styled box appears below disabled button
    *   Message: "Convert your search text to a tag first (select from dropdown or press Enter)"
    *   Uses saffron/gold accent color for visibility

*   **Feature 2: Pulsing Input Border**
    *   Autocomplete input gets animated pulsing saffron border
    *   Draws user attention to the blocking element
    *   Animation: 1.5s ease-in-out infinite pulse

*   **Files Modified**:
    *   `src/app/page.tsx` - Added conditional helper text rendering
    *   `src/components/AutocompleteInput.tsx` - Added `--blocking` class when input has text
    *   `src/app/globals.css` - Added `.submit-helper` and `.autocomplete-input--blocking` styles

*   **CSS Classes Added**:
    *   `.submit-helper` - Helper text container with warning styling
    *   `.submit-helper__icon` - Warning emoji icon
    *   `.submit-helper__text` - Message text (saffron color)
    *   `.autocomplete-input--blocking` - Pulsing border animation

*   **Related Directives**: See `directives/custom_allergy_input.md` §7 for submit flow details

*   **Status**: **Live** (Local). Build passes.

---

### v2.4.1 - Fuzzy Matching & Phrase Tokenization (2026-02-10)

**Enhancement** to autocomplete search for better typo handling and natural language input.

*   **Feature 1: Fuzzy Matching (Levenshtein Distance)**
    *   Catches common typos: "penuts" → Peanuts, "dary" → Dairy, "glutin" → Gluten
    *   Threshold scales with word length (1 edit for short words, 2 for longer)
    *   Results sorted: exact matches → substring matches → fuzzy matches

*   **Feature 2: Phrase Tokenization**
    *   Parses natural language: "i can't eat peanuts or dairy" → extracts Peanuts, Dairy
    *   Filters 50+ stop words (pronouns, articles, verbs, allergy-related terms)
    *   Supports multi-word synonyms like "tree nuts", "bell pepper"

*   **Files Modified**: `src/lib/interpret-allergy.ts`
    *   Added `levenshteinDistance()` function
    *   Added `isFuzzyMatch()` helper with length-based thresholds
    *   Added `tokenize()` function with stop word filtering
    *   Updated `searchSynonyms()` to use tokenization + fuzzy matching

*   **Search Result Enhancement**:
    *   Added `isFuzzyMatch` boolean field to `SearchResult` interface
    *   Results now indicate match type for UI differentiation (if needed)

*   **Related Directives**: See `directives/custom_allergy_input.md` §5 for detailed search behavior

*   **Status**: **Live** (Local). Build passes.

---

### v2.4 - Autocomplete Tag-Based Allergy Input (2026-02-10)

**Major UX Improvement** replacing freeform text input with structured autocomplete + tags.

*   **Problem Solved**: Freeform text input caused issues:
    *   Typos ("penuts") required AI interpretation every time
    *   Verbose input ("I can't eat anything with milk") hard to parse
    *   Ambiguous multi-allergen strings ("nuts and dairy")
    *   No validation before submit → errors discovered too late

*   **Feature 1: Autocomplete Typeahead**
    *   User types → instant local search of 180+ synonyms
    *   Dropdown shows matching allergens with icons and matched term
    *   Shows up to 5 suggestions, prioritizes exact matches
    *   **Files Added**: `src/components/AutocompleteInput.tsx`
    *   **Files Modified**: `src/lib/interpret-allergy.ts` (exported `SYNONYM_MAP`, added `searchSynonyms()`)

*   **Feature 2: Tag-Based Selection**
    *   Click suggestion → becomes a removable tag
    *   Tags display allergen icon + name + remove button
    *   Multiple tags supported, no duplicates allowed
    *   **Files Added**: `src/components/AllergenTag.tsx`

*   **Feature 3: AI Fallback Button**
    *   If no local matches after 500ms, shows "No matches found. [Ask AI]" button
    *   User explicitly triggers AI interpretation (Claude Haiku)
    *   AI success → adds matching tag(s); AI failure → shows "not recognized" message
    *   **Files Added**: `src/app/api/interpret/route.ts` (new API endpoint)

*   **Feature 4: Submit Validation**
    *   Submit button **disabled** while text remains in input field
    *   Forces user to convert all text to validated tags before submitting
    *   Prevents unstructured/ambiguous data from reaching backend

*   **API Changes**
    *   Request body now sends `customAllergenIds: string[]` instead of `customAllergy: string`
    *   Backend simplified: no interpretation needed, just merges validated tag IDs
    *   Removed `customAllergyNote` from response (errors now handled client-side)
    *   **Files Modified**: `src/app/api/submit/route.ts`, `src/lib/allergens.ts`

*   **CSS Additions** (~200 lines in `globals.css`)
    *   Autocomplete container, input, dropdown styles
    *   Tag chip styles with remove button
    *   "Ask AI" button and error states
    *   Helper text styling

*   **Benefits**
    *   **Faster**: Most users never hit AI (local matching handles 90%+)
    *   **Cheaper**: Dramatically fewer Haiku API calls
    *   **Clearer**: User sees exactly which allergens will be filtered
    *   **Fixable**: User can remove wrong tags before submitting
    *   **Validated**: All allergens are known IDs before submission

*   **Related Directives**:
    *   See `directives/custom_allergy_input.md` for detailed autocomplete documentation
    *   See `directives/allergen_management.md` for synonym reference

*   **Status**: **Live** (Local). Build passes. Ready for testing.

---

### v2.3 - Allergen Groups, Allergy/Preference Distinction, Selection Summary (2026-02-10)

**Major UI/UX Improvements** to enhance the allergen selection and results display experience.

*   **Feature 1: Collapsible Allergen Groups**
    *   Allergens now grouped into collapsible dropdowns: **Nuts** (5), **Seafood** (3), **Aromatics** (3), **Spicy** (2)
    *   Groups show selection count indicator (e.g., "Nuts 2/5")
    *   Ungrouped allergens (eggs, dairy, gluten, etc.) remain as standalone buttons
    *   Dietary preferences (vegetarian, vegan) at top as standalone
    *   **Files Added**: `src/components/AllergenGroup.tsx`
    *   **Files Modified**: `src/lib/allergens.ts` (added `ALLERGEN_GROUPS`, `GROUPED_ALLERGEN_IDS`, `STANDALONE_ALLERGENS`)

*   **Feature 2: Allergy vs Preference Popup**
    *   When selecting an allergen, modal popup asks: "Is this an allergy or a preference?"
    *   Different visual styling: **Allergies** = red/burgundy (Margaux), **Preferences** = orange (Saffron)
    *   Type badge (A/P) shown on selected allergen buttons
    *   Clicking an already-selected allergen removes it (no modal)
    *   **Data Structure Change**: `selectedAllergens` changed from `Set<string>` to `SelectedAllergen[]` with `{id, type}`
    *   **Files Added**: `src/components/AllergenTypeModal.tsx`
    *   **Files Modified**: `src/app/page.tsx` (new state structure, modal handling), `src/components/AllergenButton.tsx` (type styling)

*   **Feature 3: Selection Summary at Top of Results**
    *   After submit, user's selections displayed prominently at top of results
    *   Grouped by type: "Allergies" (red pills) and "Preferences" (orange pills)
    *   Shows icon + label for each selected allergen
    *   **Files Added**: `src/components/SelectionSummary.tsx`
    *   **Files Modified**: `src/components/MenuResults.tsx` (renders SelectionSummary)

*   **Feature 4: Hide Ingredients from Menu Items**
    *   Menu item cards now show only name, price, and warnings
    *   Ingredients line removed for cleaner, less overwhelming UI
    *   `ingredients` prop kept in interface for potential future use
    *   **Files Modified**: `src/components/MenuItem.tsx`

*   **API Changes**
    *   Request body now sends `allergens: SelectedAllergen[]` instead of `string[]`
    *   Backend extracts IDs for filtering (type distinction is UI-only)
    *   **Files Modified**: `src/app/api/submit/route.ts`

*   **CSS Additions** (~350 lines in `globals.css`)
    *   Allergen group styles (collapsible, chevron, count indicator)
    *   Allergy/preference color states (selected--allergy, selected--preference)
    *   Type modal styles
    *   Selection summary pills and badges

*   **Related Directives**:
    *   See `directives/allergen_management.md` for updated grouping documentation
    *   See `directives/frontend_results_display.md` for updated component architecture
    *   See `directives/backend_menu_filter.md` for updated API format

*   **Status**: **Live** (Local). Build passes. Ready for testing.

---

### v2.2.1 - Dietary Preference Phrasing Fix (2026-02-10)
*   **Bug Fixed**: "Can be made vegan-free on request" → "Can be made Vegan on request"
    *   The `-free` suffix is correct for allergens (e.g., "Dairy-free", "Walnut-free")
    *   But nonsensical for dietary preferences (you make something *vegan*, not *vegan-free*)
*   **Root Cause**: `formatWarnings()` in `filter-menu.ts` applied `-free` suffix to all items uniformly
*   **Fix**: Added `dietaryPreferences` set to detect vegan/vegetarian and use different phrasing
*   **Files Modified**:
    *   `src/lib/filter-menu.ts` - Updated `formatWarnings()` function (lines 103-112)
*   **Related Directive**: See `directives/backend_menu_filter.md` for updated filtering logic
*   **Status**: **Live** (pushed to GitHub)

### v2.2 - Expanded Allergen List (2026-01-21)
*   **Features**:
    *   Added 11 new common allergens to the selection form
    *   Reordered allergens by prevalence (most common first)
    *   Added synonym mappings for custom text interpretation
*   **New Allergens Added** (Big 9 + EU requirements):
    *   Peanuts, Tree Nuts, Eggs, Fish, Shellfish (Big 9)
    *   Wheat, Mustard, Sulfites, Celery, Lupin, Molluscs (EU/regional)
*   **New Allergen Order** (24 total):
    1. Tier 1 - Dietary: Vegetarian, Vegan
    2. Tier 2 - Big 9: Peanuts, Tree Nuts, Eggs, Dairy, Gluten, Soy, Fish, Shellfish, Sesame
    3. Tier 3 - Specific Nuts: Almond, Walnut, Pistachio
    4. Tier 4 - Less Common: Wheat, Mustard, Sulfites, Garlic, Onion, Celery, Chili, Capsicum, Lupin, Molluscs
*   **Behavior**: New allergens without Google Sheet columns are tracked but don't filter menu results (lenient mode) until the database is updated
*   **Files Modified**:
    *   `src/lib/allergens.ts` - Added new allergens, reordered by prevalence
    *   `src/lib/interpret-allergy.ts` - Added synonym mappings for new allergens
*   **Related Directive**: See `directives/allergen_management.md` for full allergen documentation
*   **Status**: **Live** (Local). Form displays expanded allergen grid.

### v2.1 - Results Display UI (2026-01-21)
*   **Features**:
    *   Full results display after form submission (replaces blank console log)
    *   Accordion sections for "Safe to Eat" and "Can Be Modified" items
    *   Menu item cards showing name, price, and ingredients
    *   Warning badges on caution items with modification instructions
    *   "Start Over" button to return to form
    *   Fade-in animation on results view
*   **Design**: Follows Mosaic brand guidelines
    *   Seafoam (#8FB6AB) indicator for safe items
    *   Saffron (#F4B223) indicator for caution items
    *   Bogart serif headings, smooth accordion animations
*   **Files Added**:
    *   `src/components/MenuResults.tsx` - Main results container
    *   `src/components/AccordionSection.tsx` - Collapsible section component
    *   `src/components/MenuItem.tsx` - Individual menu item card
*   **Files Modified**:
    *   `src/app/page.tsx` - Added results state, view toggle, handleStartOver
    *   `src/app/globals.css` - Added ~240 lines of results styling
*   **Related Directive**: See `directives/frontend_results_display.md` for component docs
*   **Status**: **Live** (Local). Full form → results flow working.

### v2.0 - Backend Integration (2026-01-21)
*   **Features**:
    *   Full backend menu filtering via `/api/submit` endpoint
    *   Google Sheets integration for menu data (public CSV fetch)
    *   In-memory caching with 10-minute TTL for performance
    *   Deterministic YES/NO/CAN BE filtering logic
    *   AI-powered custom allergy text interpretation (Claude Haiku)
    *   Local synonym matching for common terms (lactose→dairy, wheat→gluten)
    *   Updated allergen list to match Google Sheet columns (13 filters)
*   **Performance**: 50-200ms response (vs 5-15s with previous Make.com approach)
*   **Files Added**:
    *   `src/lib/google-sheets.ts` - Sheets CSV fetching
    *   `src/lib/menu-service.ts` - Caching layer
    *   `src/lib/filter-menu.ts` - Filtering logic
    *   `src/lib/interpret-allergy.ts` - AI text interpretation
    *   **Fixes**:
        *   Fixed broken/missing icons for Soy, Sesame, Capsicum, Pistachio.
        *   Swapped Vegan/Soy icons as requested.
        *   Resolved Capsicum/Chili duplicate: Chili is now Fire (🔥), Capsicum is Red Pepper (🌶️).
        *   Finalized Nut/Grain icons: Tree Nuts (🌳), Walnut (🟤 Brown Circle), Almond (🌰 Chestnut), Pistachio (🟢 Green Circle), Gluten (🍞 Bread).
*   **Related Directive**: See `directives/backend_menu_filter.md` for detailed backend docs
*   **Status**: **Live** (Local). Backend fully functional.

### v1.0 - Initial Release (2026-01-21)
*   **Features**:
    *   Disclaimer Modal on load.
    *   Allergen selection grid (Dairy, Gluten, etc.).
    *   Custom input field.
    *   Submit summary.
*   **Fixes**:
    *   *Issue*: PowerShell `mkdir` failed when creating nested/multiple directories in one string.
    *   *Fix*: Split `mkdir` commands into individual calls for nested paths or use standard syntax carefully.
    *   *Issue*: Soy emoji (🫘) rendered as a square box on Windows.
    *   *Fix*: Replaced with Seedling (🌱) emoji for better compatibility.
*   **Status**: Superseded by v2.0.

## 5. Future Roadmap
*   [x] ~~Connect "Submit" button to an actual backend or API.~~ (Done in v2.0)
*   [x] ~~Add "Menu View" UI to display filtered results in the frontend~~ (Done in v2.1)
*   [x] ~~Add common allergens (peanuts, eggs, etc.) to selection form~~ (Done in v2.2)
*   [x] ~~Add allergen grouping UI (collapsible sections)~~ (Done in v2.3)
*   [x] ~~Add allergy vs preference distinction with visual differentiation~~ (Done in v2.3)
*   [x] ~~Show user selections at top of results page~~ (Done in v2.3)
*   [x] ~~Remove ingredients from menu item display for cleaner UI~~ (Done in v2.3, replaced by expandable toggle in v2.5)
*   [x] ~~Replace freeform text with autocomplete/tag-based input~~ (Done in v2.4)
*   [x] ~~Add AI fallback button for unrecognized allergens~~ (Done in v2.4)
*   [x] ~~Validate all custom allergens before submit~~ (Done in v2.4)
*   [x] ~~Add fuzzy matching for typos (Levenshtein distance)~~ (Done in v2.4.1)
*   [x] ~~Add phrase tokenization for natural language input~~ (Done in v2.4.1)
*   [x] ~~Add visual feedback when submit button is disabled~~ (Done in v2.4.2)
*   [x] ~~Add expandable ingredient dropdown to menu items~~ (Done in v2.5)
*   [x] ~~Add custom tags for restrictions not in allergen list~~ (Done in v2.6)
*   [x] ~~Add AI-based menu filtering using ingredients~~ (Done in v2.6)
*   [ ] Add corresponding columns to Google Sheet for new allergens (peanuts, eggs, fish, etc.)
*   [ ] Mobile responsive testing adjustments (375px, 414px breakpoints)
*   [ ] Add PDF export for filtered menu
*   [ ] Add analytics/logging for submissions
*   [ ] Deploy to Vercel or similar hosting
*   [ ] Add item images (if available in Google Sheet)
*   [ ] Add "Share results" feature (deep link with allergen params)
*   [ ] Add "Select All" option for allergen groups (e.g., "All Nuts")
*   [ ] Add ability to change allergy/preference type after selection
*   [ ] Learn from AI interpretations: log successful matches, bulk-add to local synonym map
*   [ ] Add voice input for allergen entry ("I'm allergic to shellfish and nuts")
*   [ ] Persist user's allergen selections in localStorage for returning users
*   [ ] Cache AI filtering results for common custom tag combinations
*   [ ] Add progress indicator for AI filtering (batch progress)
