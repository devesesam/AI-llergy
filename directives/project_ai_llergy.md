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
*   **Menu Database**: Google Sheets (public CSV export, read-only)
    *   Sheet ID: set via `GOOGLE_SHEET_ID` env var. Current (Kisa): `1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw`. Old sample: `1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU`
    *   Contains: Menu items, ingredients, prices, allergen columns (YES/NO/CAN BE)
    *   **No write credentials** in project — app only reads. Writing to the sheet (e.g. nightshade column) is manual paste unless a service account is added.
    *   **Substitutions tab** (same sheet, `GOOGLE_SUBSTITUTIONS_GID`, current `1265271651`): chef swaps/removals powering the "Can be modified" feature. See `directives/substitutions.md`.
    *   **Full schema, tolerance rules, and failure modes**: `directives/google_sheet_data_source.md` (READ THIS before editing the sheet or menu-loading code).
*   **AI API**: Anthropic Claude (for custom allergy text interpretation)
*   **Deployment**: **Netlify**, live at **https://ai-lergy.co.nz** (single "l"). Env vars set in Netlify → Site configuration → Environment variables. Code changes require a redeploy; sheet edits appear within the 10-min cache.

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
        *   `AllergenButton.tsx`: Individual allergen toggle with type badge and pending state (v3.0)
        *   `AllergenGroup.tsx`: Collapsible allergen group dropdown (v2.3)
        *   `AllergenTypeModal.tsx`: **DEPRECATED** - Replaced by SeverityModal in v3.0
        *   `SeverityModal.tsx`: Submit-time **confirmation modal** (review list + responsibility checkbox). Severity slider removed in v4.7 — name kept for now though it no longer sets severity.
        *   `AutocompleteInput.tsx`: Tag-based allergen input with typeahead (v2.4, v2.6)
        *   `AllergenTag.tsx`: Removable allergen tag chip (v2.4)
        *   `CustomTagPill.tsx`: Removable custom restriction tag chip (v2.6)
        *   `MenuResults.tsx`: Results container with accordions
        *   `SelectionSummary.tsx`: User selections display grouped by severity (v2.3, v2.6, v3.0)
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

### v4.7 - Severity Retired + Disclaimer/Brand Copy (2026-06-16)

**Summary**: Simplified the submit flow and tidied user-facing copy.

*   **Severity slider removed** from the submit-time modal (`SeverityModal.tsx`) — now a
    confirmation-only step (review list + "I take full responsibility" checkbox + Confirm).
    Selections default to `type: "allergy"`. Severity was collected but unused on the Google-Sheet
    filtering path.
*   **Results "Your Selections" flattened** (`SelectionSummary.tsx`) — single neutral pill list, no
    severity grouping.
*   **Disclaimer** (`DisclaimerModal.tsx`): new wording + "I Agree" → "I Understand".
*   **Brand consistency**: all user-facing text unified to **AI-lergy** (single "l"), matching
    ai-lergy.co.nz. Internal repo/package/dir names left as `ai-llergy`.
*   **Dead code** left for a later pass: `.severity-slider*` / `.selection-pill--*` CSS, `SeverityType`
    on selections, and the now-misnamed `SeverityModal`.
*   **Related**: `allergen_management.md` §6, `frontend_results_display.md` §10,
    `css_styling_system.md` §11, `known_issues_and_fixes.md` FEATURE-005.

### v4.6 - Kisa Real Menu + Chef Substitutions ("Can be modified") (2026-06)

**Summary**: Onboarded Kisa's real menu from the chef's PDF and added a chef-driven "Can be modified"
substitutions feature, plus the bug fixes that came from the sheet being actively edited.

*   **Kisa menu onboarding**: Translated the chef's allergen PDF (~30 dishes, no allergens/prices) into
    the menu sheet, **inferring** the 24 allergen flags per dish from ingredients (best-effort, chef
    reviews). Generated via `.tmp/gen_kisa_menu.py` → `kisa_menu.csv`; imported to the Google Sheet,
    which is now the live source (Supabase paused).
*   **Verbatim ingredients**: Chef (Tom) flagged that condensed ingredient summaries weren't faithful.
    Regenerated every dish's `Ingredients` column **verbatim** from the PDF (additives/E-numbers
    included) — `kisa_ingredients_verbatim.csv` + updated `kisa_menu.csv`.
*   **FEATURE: Substitutions / "Can be modified"** — excluded dishes are rescued into a new results
    section when the chef provides a viable swap/removal, with a safety guard that never suggests a
    swap introducing an allergen the diner also avoids. Deterministic (no LLM at request time). New
    `src/lib/substitutions.ts`, `modifiableItems` in `filter-menu.ts`, `modifiedItems` in `route.ts`,
    new "Can be modified" accordion. Config: `GOOGLE_SUBSTITUTIONS_GID`. See
    `directives/substitutions.md`, `directives/google_sheet_data_source.md`,
    `known_issues_and_fixes.md` FEATURE-004.
*   **Bug fixes from live-sheet edits** (see `known_issues_and_fixes.md`):
    *   BUG-010 — menu returned 0 results after column A was renamed (`Item`→`Dish`→`Element`); the
        app now reads the dish name from **column A by position**, so renaming it can't break the menu.
    *   BUG-011 — long verbatim ingredient lists were clipped in the results card (CSS max-height).
    *   BUG-012 — substitutions safety guard silently disabled after `Introduces`→`Introduces allergy`
        rename; parser made tolerant.
    *   BUG-013 — Mosaic rebuilt the Substitutions tab (`Solves`→`Solves allergy`, `Ingredient`→
        `Element`, …); the parser is now keyword-matched (`pickCell`) and survives these renames.
    *   New **Pattern 6: Google Sheet schema drift** — the dominant incident class; mitigations +
        diagnosis steps documented.
*   **Tooling/docs added**: `execution/validate_substitutions.py`, `kisa_substitutions_template.csv`,
    `directives/substitutions.md`, `directives/google_sheet_data_source.md`.
*   **Status**: **Live (Local)**. Three code fixes (Item/Dish, ingredient box, Introduces tolerance)
    + the substitutions feature need a **Netlify redeploy** to reach production.

---

### v4.5 - Allergen Form Redesign + Halal/Nightshades (2026-06-11)

**Summary**: Reworked the allergen selection form and expanded the allergen set.

*   **Form layout**: Removed the v4.4 multi-group accordion (Nuts/Seafood/Aromatics/Spicy/Other). New layout = **Dietary Preferences** rows + **Common Allergens** (Gluten, Dairy, Eggs) rows + a single **"More allergens"** dropdown for everything else. `AllergenButton` gained a `variant: "tile" | "row"` prop.
*   **Removed `wheat`**: subset of `gluten`; the wheat→gluten synonym still routes wheat ingredients to gluten.
*   **Added `halal`** (dietary preference, column `HALAL`) and **`nightshades`** (allergen, column `NIGHTSHADE FREE`).
*   **Data model** (`allergens.ts`): added `PRIMARY_ALLERGEN_IDS` / `PRIMARY_ALLERGENS` / `SECONDARY_ALLERGENS`; removed `ALLERGEN_GROUPS` / `GROUPED_ALLERGEN_IDS` / `STANDALONE_ALLERGENS`.
*   **New tool**: `execution/classify_nightshades.py` fills the NIGHTSHADE FREE column from ingredients (paste-ready output; no Google write creds in project).
*   **Bugs fixed**: BUG-008 (rows rendered as squares — CSS specificity), BUG-009 (Halal column not detected — header case mismatch `HALAL` vs `Halal`).
*   **Files Modified**: `allergens.ts`, `AllergenGrid.tsx`, `AllergenButton.tsx`, `filter-menu.ts`, `globals.css`; `execution/classify_nightshades.py` (new).
*   **Related Directives**: `allergen_management.md` §5 (form layout), `classify_nightshades.md` (new tool), `css_styling_system.md` §5 (row specificity), `known_issues_and_fixes.md` BUG-008/009 + FEATURE-003.

### v4.4 - Venue Invite Codes & Team Membership (2026-02-20)

**Major Feature**: Venue owners can now invite team members using shareable invite codes. Each venue gets a unique 8-character code auto-generated on creation.

*   **Problem Solved**: New users who should belong to an existing venue had no way to join it. They could only create new venues, not join existing teams. Now team members can join by entering the venue's invite code.

*   **Feature 1: Auto-Generated Invite Codes**
    *   Format: `XXXX-XXXX` (8 uppercase hex characters)
    *   Generated automatically when venue is created via database trigger
    *   Stored in `venues.invite_code` column
    *   Unique and permanent per venue
    *   **Migration**: `supabase/migrations/20260220_add_venue_invite_codes.sql`

*   **Feature 2: Invite Code Display in Sidebar**
    *   Shows below each venue name in dashboard sidebar
    *   One-click copy button with "Copied!" feedback
    *   Visible to all venue members (so anyone can share it)
    *   **Files Modified**: `DashboardNav.tsx`, `dashboard/layout.tsx`

*   **Feature 3: Join Venue Form**
    *   "Join with Code" button in venues page header
    *   Reveals compact inline form when clicked
    *   Validates code and adds user as `editor` role
    *   Shows prominently for users with no venues
    *   **Files Added**: `JoinVenueForm.tsx`, `VenueActions.tsx`

*   **Feature 4: Secure Join via RPC**
    *   `join_venue_by_code(code TEXT)` PostgreSQL function
    *   `SECURITY DEFINER` to bypass RLS for self-join
    *   Returns venue info on success, error message on failure
    *   Prevents duplicate membership
    *   **Files Added**: `supabase/migrations/20260220_add_venue_invite_codes.sql`

*   **Database Changes**:
    *   Added `invite_code` column to `venues` table (UNIQUE, NOT NULL)
    *   Modified `handle_new_venue()` trigger to generate code on insert
    *   Added `join_venue_by_code()` RPC function
    *   Added index on `invite_code` for lookup performance

*   **CSS Classes Added**:
    *   `.venue-invite-code`, `.venue-invite-code__label`, `.venue-invite-code__code`, `.venue-invite-code__copy`
    *   `.venue-actions`, `.venue-actions__buttons`, `.venue-actions__join-form`
    *   `.join-venue-form`, `.join-venue-form__*` variants

*   **Multi-Venue Support**:
    *   Users can join multiple venues (already supported in DB)
    *   "Join with Code" available even when user has existing venues
    *   Sidebar lists all venues user belongs to

*   **Feature 5: Other Allergens Dropdown (UI Consistency)**
    *   Converted "Other Allergens" section from static grid to collapsible dropdown accordion
    *   Now matches the style of named allergen groups (Nuts, Seafood, Aromatics, Spicy)
    *   Click "🍽️ Other" header to expand and see 9 allergens (eggs, dairy, gluten, etc.)
    *   Selection count badge shows selected items (e.g., "2/9")
    *   Reduces visual clutter on initial page load
    *   **Implementation**: Inline `AllergenGroup` component using `STANDALONE_ALLERGENS.map(a => a.id)` for members
    *   **Files Modified**: `AllergenGrid.tsx` only (reuses existing `AllergenGroup` component)
    *   **No Data Model Changes**: `allergens.ts` unchanged - "Other" group computed dynamically

*   **Related Directives**:
    *   See `directives/dashboard_admin.md` §14 for team membership docs
    *   See `directives/supabase_integration.md` §13 for migration details
    *   See `directives/allergen_management.md` §5 for allergen group documentation
    *   See `directives/known_issues_and_fixes.md` FEATURE-002 for implementation details

*   **Status**: **Live** (Local). Run migration in Supabase SQL Editor.

---

### v4.3 - UI Polish & Severity Slider (2026-02-19)

**UI Improvements**: Several small but impactful UX enhancements to the severity modal, loading states, results display, and responsive layout.

*   **Feature 1: Severity Slider (Replaces P/A/L Buttons)**
    *   Replaced three separate buttons (P A L) with a draggable slider
    *   Labels above slider: "Preference" | "Intolerance/Allergy" | "Life Threatening"
    *   Track shows gradient (green → orange → red)
    *   Thumb color changes based on current selection
    *   Modal item layout changed to vertical (allergen name above, slider below) for better UX
    *   **Files Modified**: `SeverityModal.tsx`, `globals.css`

*   **Fix 1: Loading Spinner Not Animating**
    *   The LoadingSpinner SVG component had no CSS animation defined
    *   Added `@keyframes spin` and `.loading-spinner` animation styles
    *   **Files Modified**: `globals.css`

*   **Fix 2: Desktop Width Expansion**
    *   App container was expanding to full width on desktop (768px+)
    *   Changed `max-width: 100%` to `max-width: 500px` in desktop media query
    *   App now remains centered and phone-sized on larger screens
    *   **Files Modified**: `globals.css`

*   **Enhancement 1: Allergen Group Arrow Position**
    *   Moved expand/collapse chevron from after count badge to far right of row
    *   Changed `margin-left: auto` from `.allergen-group__count` to `.allergen-group__chevron`
    *   **Files Modified**: `globals.css`

*   **Enhancement 2: Caution Section Title**
    *   Changed "Can Be Modified" to "Modification Suggestions - Subject to kitchen approval"
    *   More accurate and sets proper expectations
    *   **Files Modified**: `MenuResults.tsx`

*   **Browser Support**: Added Firefox (`-moz-range-thumb`) styles for severity slider

*   **Related Directives**:
    *   See `directives/css_styling_system.md` for updated slider styles
    *   See `directives/allergen_management.md` §6 for severity slider docs
    *   See `directives/known_issues_and_fixes.md` for BUG-004 and BUG-005

*   **Status**: **Live** (Local). Build passes.

---

### v4.2 - CSS Visual Regression Fix (2026-02-19)

**Critical Fix**: Restored broken styling across all pages. Multiple components were unstyled due to missing CSS class definitions and improper Tailwind v4 configuration.

*   **Problem Solved**: Visual regression where pages appeared completely unstyled:
    *   Allergen tiles showed as tiny chips instead of large square tiles
    *   Allergen groups (Nuts, Seafood, etc.) had no styling
    *   Results page showed raw text without cards/accordions
    *   Dashboard sidebar and forms were invisible/unstyled
    *   Login form inputs invisible on light background

*   **Root Causes Identified**:
    1. BEM CSS classes used in components but never defined in `globals.css`
    2. Tailwind v4 `@theme` block missing - semantic colors (`bg-surface`, `text-text-muted`) didn't work
    3. Dashboard components used Tailwind semantic colors instead of BEM classes
    4. Login form used dark-theme Tailwind classes (`bg-white/5`, `text-white`) on light background
    5. Allergen grid used flexbox instead of CSS grid, causing inconsistent tile sizes

*   **Fix 1: Allergen Selection Page**
    *   Changed `.allergen-grid__buttons` from flexbox to CSS grid (2-column)
    *   Added `aspect-ratio: 1 / 0.85` to `.allergen-option` for consistent tile sizing
    *   Added ~70 lines of `.allergen-group*` styles for collapsible groups

*   **Fix 2: Results Page**
    *   Added ~100 lines of accordion, menu-item, and selection-summary styles
    *   Added severity pill styling (`.selection-pill--life_threatening`, etc.)

*   **Fix 3: Dashboard**
    *   Added `@theme` block to globals.css mapping CSS variables to Tailwind
    *   Converted `DashboardNav.tsx` from Tailwind semantic classes to BEM
    *   Added ~200 lines of dashboard layout, sidebar, mobile header styles
    *   Added form styling (`.dashboard-form__*`)

*   **Fix 4: Login Page**
    *   Rewrote `LoginForm.tsx` to use BEM classes instead of dark-theme Tailwind
    *   Changed `login/page.tsx` from gradient background to `.auth-page` wrapper
    *   Added ~100 lines of auth styles (`.auth-card`, `.auth-form__*`)

*   **Files Modified**:
    *   `src/app/globals.css` - Added ~800 lines of missing styles, added `@theme` block
    *   `src/app/login/page.tsx` - Simplified to use `.auth-page` wrapper
    *   `src/app/login/LoginForm.tsx` - Converted to BEM classes
    *   `src/components/dashboard/DashboardNav.tsx` - Converted to BEM classes

*   **Documentation Created**:
    *   `directives/css_styling_system.md` - NEW: Comprehensive CSS architecture docs (~560 lines)
    *   `directives/known_issues_and_fixes.md` - Added BUG-003 entry

*   **Related Directives**:
    *   See `directives/css_styling_system.md` for full CSS reference
    *   See `directives/known_issues_and_fixes.md` BUG-003 for detailed analysis

*   **Status**: **Fixed** (Local). Build passes.

---

### v4.1 - Confidence-Based Severity Filtering (2026-02-19)

**Major Feature**: Allergen severity levels now control filtering thresholds. Life-threatening allergies require higher confidence than preferences.

*   **Problem Solved**: Previously, severity (preference/allergy/life_threatening) was collected but discarded at line 63 of route.ts. All allergens filtered identically regardless of severity. Now confidence thresholds ensure stricter filtering for serious allergies.

*   **Severity Thresholds**:
    *   Preference: >25% confidence required (low bar, show most items)
    *   Allergy: >80% confidence required (high bar, fairly certain)
    *   Life-threatening: >95% confidence required (near certainty)

*   **Feature 1: Pre-Computed Confidence Scores**
    *   Rule-based scoring (no LLM at query time)
    *   Stored in `allergen_confidence` JSONB column
    *   Factors: explicit allergen flags, ingredient keywords, cross-contamination
    *   **Files Added**:
        *   `src/lib/confidence.ts` - Threshold constants and helpers
        *   `src/lib/compute-confidence.ts` - Calculation logic

*   **Feature 2: Cross-Contamination Adjustments**
    *   Venue-level risk settings per allergen
    *   Adjusts confidence: +20% (none), +10% (low), 0% (medium), -20% (high)
    *   **Database Table**: `venue_cross_contamination`

*   **Feature 3: AI Confidence Scores**
    *   AI now returns confidence 0-100 for custom tags
    *   Same severity thresholds apply
    *   Strictest severity from all custom tags determines threshold
    *   **Files Modified**: `src/lib/ai-filter.ts`

*   **API Route Changes**:
    *   Line 63 now preserves severity: `allergensWithSeverity` instead of `allergenIds`
    *   New routing: `filterMenuWithConfidence()` for Supabase venues with confidence data
    *   **Files Modified**: `src/app/api/submit/route.ts`

*   **Database Schema**:
    *   `menu_items.allergen_confidence` JSONB column
    *   `venue_cross_contamination` table with RLS policies
    *   **Migration**: `supabase/migrations/20260219_add_allergen_confidence.sql`

*   **Related Documentation**:
    *   `directives/confidence_scoring.md` - Full directive (NEW)
    *   `directives/backend_menu_filter.md` - Updated with §15

---

### v4.0 - Dashboard Admin Portal with Supabase (2026-02-19)

**Major Feature**: Added protected admin portal for venue and menu management, powered by Supabase authentication and PostgreSQL database.

*   **Problem Solved**: Previously, menu data was managed manually in Google Sheets. Now venue owners can manage their menus through a web dashboard, with multi-user support and role-based access.

*   **Feature 1: Supabase Authentication**
    *   Email/password signup and login
    *   Session management via cookies and middleware
    *   Protected routes at `/dashboard/*`
    *   Auth callback handler for OAuth (future expansion)
    *   **Files Added**:
        *   `src/lib/supabase/client.ts` - Browser client
        *   `src/lib/supabase/server.ts` - Server client with cookies
        *   `src/lib/supabase/middleware.ts` - Session refresh helper
        *   `src/lib/supabase/types.ts` - TypeScript type definitions
        *   `src/middleware.ts` - Route protection middleware
        *   `src/app/login/page.tsx` - Login page wrapper
        *   `src/app/login/LoginForm.tsx` - Login/signup form component
        *   `src/app/auth/callback/route.ts` - OAuth callback handler

*   **Feature 2: Multi-Venue Support**
    *   Users can create and manage multiple venues
    *   Each venue has unique URL slug (e.g., `/v/the-blue-door`)
    *   Venue membership with roles: owner, admin, editor
    *   **Database Tables**: `venues`, `venue_members`
    *   **Files Added**:
        *   `src/app/dashboard/venues/page.tsx` - Venue list
        *   `src/app/dashboard/venues/new/page.tsx` - Create venue form
        *   `src/app/dashboard/venues/[venueId]/page.tsx` - Venue detail
        *   `src/app/dashboard/venues/[venueId]/settings/page.tsx` - Venue settings

*   **Feature 3: Menu Item Management**
    *   Full CRUD for menu items per venue
    *   Allergen toggle grid using existing `ALL_FILTERS`
    *   Stored as JSONB allergen profiles in database
    *   CSV import tool for bulk menu upload
    *   **Database Table**: `menu_items`
    *   **Files Added**:
        *   `src/app/dashboard/venues/[venueId]/menu/new/page.tsx` - Add item
        *   `src/app/dashboard/venues/[venueId]/menu/[itemId]/page.tsx` - Edit item
        *   `src/app/dashboard/venues/[venueId]/import/page.tsx` - CSV import
        *   `src/components/dashboard/MenuItemForm.tsx` - Reusable form

*   **Feature 4: Public Venue Pages**
    *   URL pattern: `/v/[slug]` (e.g., `ai-llergy.co.nz/v/the-blue-door`)
    *   Server component fetches venue + active menu items
    *   Client component handles allergen filtering
    *   Reuses existing allergen selection and filtering logic
    *   **Files Added**:
        *   `src/app/v/[slug]/page.tsx` - Server component loader
        *   `src/app/v/[slug]/VenueMenuClient.tsx` - Client filtering

*   **Feature 5: Dashboard Layout**
    *   Responsive sidebar navigation
    *   User info header with logout
    *   BEM-style CSS classes for dashboard components
    *   **Files Added**:
        *   `src/app/dashboard/layout.tsx` - Dashboard shell
        *   `src/app/dashboard/page.tsx` - Dashboard home

*   **Database Schema** (`supabase/schema.sql`):
    *   Row Level Security (RLS) for multi-tenant isolation
    *   Triggers for auto-creating user profiles and venue ownership
    *   JSONB allergen profiles for flexible allergen storage

*   **CSS Additions** (~400 lines in `globals.css`):
    *   Dashboard layout, sidebar, header styles
    *   Venue grid and card components
    *   Data tables and form styling
    *   Button variants (primary, secondary, danger)
    *   Empty states and loading indicators

*   **Dependencies Added**:
    *   `@supabase/supabase-js` - Supabase client
    *   `@supabase/ssr` - Server-side rendering helpers

*   **TypeScript Workarounds**:
    *   Without generated types, used explicit type casting for Supabase queries
    *   Pattern: `as { data: Type | null; error: unknown }` for SELECT
    *   Pattern: `(supabase as any).from('table')` for INSERT/UPDATE/DELETE
    *   See `directives/known_issues_and_fixes.md` for details

*   **Related Directives**:
    *   See `directives/dashboard_admin.md` for dashboard functionality
    *   See `directives/supabase_integration.md` for Supabase setup
    *   See `directives/known_issues_and_fixes.md` for TypeScript issues

*   **Status**: **Live** (Local). Build passes. Ready for testing.

---

### v3.0 - Batch Severity Selection Flow (2026-02-19)

**Major UX Overhaul**: Replaced per-allergen modal popup with batch severity assignment. Users now select allergens freely, then assign severity levels for all selections in a single modal before submission.

*   **Problem Solved**: Previous flow interrupted user with a modal popup on every allergen click. This was friction-heavy for users with multiple allergies. New flow allows rapid selection, with severity assignment consolidated into one step.

*   **New Flow**:
    1. User clicks allergens freely (toggle on/off, no popup)
    2. Adds custom tags via autocomplete
    3. Clicks Submit → **SeverityModal** opens showing all selections
    4. Assigns severity for each item using 3-button segmented control
    5. Checks responsibility acknowledgment checkbox
    6. Confirms → Submits to API

*   **Feature 1: 3-Level Severity System**
    *   **Preference** (Green) - "I prefer to avoid this"
    *   **Intolerance/Allergy** (Orange) - "I cannot eat this safely"
    *   **Life Threatening** (Red) - "Medical emergency risk"
    *   Default: All items pre-selected as "Preference" for quick confirmation
    *   **Data Model**: `SeverityType = "preference" | "allergy" | "life_threatening"`

*   **Feature 2: Batch SeverityModal Component**
    *   Shows all pending allergens, custom allergen IDs, and custom tags
    *   Each item displays: Icon + Name (left), Segmented Control P|A|L (right)
    *   Scrollable list for many selections
    *   Responsibility checkbox required before confirm
    *   **Files Added**: `src/components/SeverityModal.tsx`

*   **Feature 3: Pending Selection State**
    *   Allergens clicked but not yet confirmed show "pending" state
    *   Generic highlight (no severity color until modal confirmed)
    *   **State**: `pendingAllergenIds: string[]` separate from `selectedAllergens: SelectedAllergen[]`

*   **Feature 4: Responsibility Acknowledgment**
    *   Checkbox: "I take full responsibility that the information submitted is as accurate as possible"
    *   Confirm button disabled until checked
    *   Prevents accidental submission

*   **Color Scheme Change** (Breaking):
    *   **Old**: Yellow (Saffron) for preferences, Red (Margaux) for allergies
    *   **New**: Green → Orange → Red severity gradient
    *   CSS variables:
        *   `--color-severity-preference: #22c55e` (Green)
        *   `--color-severity-allergy: #f97316` (Orange)
        *   `--color-severity-critical: #dc2626` (Red)

*   **Files Added**:
    *   `src/components/SeverityModal.tsx` - Batch severity assignment modal

*   **Files Modified**:
    *   `src/lib/allergens.ts` - Added `SeverityType`, `SEVERITY_OPTIONS`, extended `CustomTag` with `type?`
    *   `src/app/page.tsx` - New state management, removed old modal logic
    *   `src/components/AllergenButton.tsx` - Added pending state, `life_threatening` support
    *   `src/components/AllergenGrid.tsx` - Added `pendingAllergenIds` prop
    *   `src/components/AllergenGroup.tsx` - Added `pendingAllergenIds` prop
    *   `src/components/SelectionSummary.tsx` - Three severity categories display
    *   `src/app/globals.css` - New severity colors, modal styles, checkbox styles

*   **Files Deprecated**:
    *   `src/components/AllergenTypeModal.tsx` - No longer used (can be deleted)

*   **API Unchanged**: Backend still extracts IDs for filtering. `life_threatening` type is UI-only for now.

*   **Related Directives**:
    *   See `directives/allergen_management.md` §6 for updated severity documentation
    *   See `directives/known_issues_and_fixes.md` for any issues

*   **Status**: **Live** (Local). Build passes.

---

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
*   [x] ~~Add 3-level severity system (Preference, Intolerance/Allergy, Life Threatening)~~ (Done in v3.0)
*   [x] ~~Batch severity assignment modal instead of per-click popup~~ (Done in v3.0)
*   [x] ~~Add responsibility acknowledgment checkbox before submit~~ (Done in v3.0)
*   [x] ~~Add ability to change allergy/preference type after selection~~ (Done in v3.0 - batch modal allows adjustment)
*   [ ] Add corresponding columns to Google Sheet for new allergens (peanuts, eggs, fish, etc.)
*   [ ] Mobile responsive testing adjustments (375px, 414px breakpoints)
*   [ ] Add PDF export for filtered menu
*   [ ] Add analytics/logging for submissions
*   [ ] Deploy to Vercel or similar hosting
*   [ ] Add item images (if available in Google Sheet)
*   [ ] Add "Share results" feature (deep link with allergen params)
*   [ ] Add "Select All" option for allergen groups (e.g., "All Nuts")
*   [ ] Learn from AI interpretations: log successful matches, bulk-add to local synonym map
*   [ ] Add voice input for allergen entry ("I'm allergic to shellfish and nuts")
*   [ ] Persist user's allergen selections in localStorage for returning users
*   [ ] Cache AI filtering results for common custom tag combinations
*   [ ] Add progress indicator for AI filtering (batch progress)
*   [ ] Backend severity handling (different filtering/warnings per severity level)
*   [ ] Delete deprecated AllergenTypeModal.tsx component
*   [x] ~~Severity slider UI (replace P/A/L buttons with draggable slider)~~ (Done in v4.3)
*   [x] ~~Fix loading spinner animation~~ (Done in v4.3)
*   [x] ~~Fix desktop width expansion issue~~ (Done in v4.3)
*   [x] ~~Move allergen group chevron to far right~~ (Done in v4.3)
*   [x] ~~Add dashboard admin portal for venue management~~ (Done in v4.0)
*   [x] ~~Integrate Supabase for authentication~~ (Done in v4.0)
*   [x] ~~Add multi-venue support with role-based access~~ (Done in v4.0)
*   [x] ~~Add menu item CRUD with allergen toggles~~ (Done in v4.0)
*   [x] ~~Add CSV import tool for bulk menu upload~~ (Done in v4.0)
*   [x] ~~Add public venue pages at /v/[slug]~~ (Done in v4.0)
*   [x] ~~Convert "Other Allergens" grid to dropdown accordion for UI consistency~~ (Done in v4.4)
*   [ ] Generate Supabase types with CLI for proper TypeScript support
*   [ ] Add user profile page with password change
*   [x] ~~Add team member invites to venues~~ (Done in v4.4 via invite codes)
*   [ ] Add venue branding/logo upload
*   [ ] Add menu categories/sections
*   [ ] Add drag-and-drop menu item reordering
*   [ ] Add analytics dashboard for venue owners
*   [ ] Add QR code generator for venue URLs
*   [ ] Migrate existing Google Sheet menu to first Supabase venue
