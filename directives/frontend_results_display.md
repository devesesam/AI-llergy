# Directive: Frontend Results Display

**Goal**: Display filtered menu results to the user in a beautiful, brand-aligned UI after form submission. The results view replaces the form and shows safe items, caution items, and relevant notes.

> **⚠ 2026-10-28:** results sections are now Safe to Eat · Can be modified for you (subject to
> kitchen approval) · Can be made to suit you (CAN BE) · **Check with staff** (`checkItems`:
> AI backup unsure, "May contain X. Please check with staff.") · an ingredient-list footer.
> Modified dishes also show any CAN BE / check note they carry. A chef swap's " — note: adds X"
> displays as ". Note: adds X" (`showMod` in `MenuItem.tsx`; `substitutions.ts` stays verbatim).
> The confirm checkbox reads Tom's wording (2026-10-28). See `custom_allergy_input.md` v2.7.
>
> **My Order (Tom, 2026-10-28).** Each dish card has "+ Add to My Order", then a − n + stepper;
> a sticky "View My Order (n dishes) →" bar opens the summary (`MyOrder.tsx`, hash `#my-order`, so
> the phone's Back returns to the menu). The summary: Tom's exact banner ("Please show this
> summary to one of our team … Your order has not yet been placed." (Tom changed "your waiter" to "one of our team", 2026-10-31), `WAITER_MESSAGE` in
> `src/lib/my-order.ts`), the guest's selections under "Dietary requirements", then "2 ×
> Hummus" lines with every required note (chef swaps for modified dishes, CAN BE notes, "May
> contain X. Please check with staff."). **No prices** (Sam: the till sets them). Nothing is sent
> anywhere: the selections, results and order are kept in localStorage per venue
> (`menukey.session.v1.<slug>`, 4 hours) so a refresh at the table restores them; Start Over
> clears it (confirms first when the order isn't empty). A restored guest isn't shown the
> disclaimer again. Tests: `e2e/menukey/w2.mjs` (iPhone + Android profiles, session scratchpad).

> **⚠ 2026-10-29: results sections have no height cap.** Tom reported the dish list "cut off at
> some random point". The accordion's open state was `max-height: 2000px` + `overflow: hidden`, so
> any section taller than 2,000px was silently clipped (Kisa + Eggs: 18 of 32 safe dishes hidden).
> The bug predates My Order (Kisa + Eggs hid 7 dishes before it), but the Add row made each card
> ~56px taller, so it hit ordinary selections. Fix: `.accordion__content` is a one-row grid that
> animates `grid-template-rows` 0fr → 1fr around an `.accordion__inner` wrapper
> (`AccordionSection.tsx`); no cap. **Rule: never cap a list's height with max-height + overflow
> hidden.** Testing lesson: text checks and Playwright taps both "see" clipped content
> (Playwright scrolls a clipped box to reach a button), so a visibility check must compare a
> section's rendered height with its scrollHeight (`accordion_check.mjs`, `clip_probe.mjs`).

## 1. Overview

After the user submits their allergen selections, the form is replaced by a results view that displays:
- **Selection Summary** (v2.3; flattened in v4.7) - User's selected allergens as a single flat pill list (severity grouping removed)
- Summary header with item count
- Collapsible "Safe to Eat" section (expanded by default)
- Collapsible "Modification Suggestions - Subject to kitchen approval" section (collapsed by default) *(renamed in v4.3)*
- Excluded item count
- Custom allergy note (if applicable)
- "Start Over" button to return to form

## 2. Component Architecture

```
┌─────────────────────────────────────────────────┐
│  page.tsx                                       │
│  ┌───────────────────────────────────────────┐  │
│  │  selectedAllergens: SelectedAllergen[]    │  │
│  │  results state (ResultsData | null)       │  │
│  │  if results → <MenuResults />             │  │
│  │  else → <Form />                          │  │
│  └───────────────────────────────────────────┘  │
│                      │                          │
│                      ▼                          │
│  ┌───────────────────────────────────────────┐  │
│  │  MenuResults.tsx                          │  │
│  │  ├── SelectionSummary (v4.7: flat list)   │  │
│  │  │   └── single row of neutral pills      │  │
│  │  ├── ResultsHeader                        │  │
│  │  ├── AccordionSection (Safe)              │  │
│  │  │   └── MenuItem[]                       │  │
│  │  ├── AccordionSection (Caution)           │  │
│  │  │   └── MenuItem[]                       │  │
│  │  ├── ExcludedNote                         │  │
│  │  ├── CustomAllergyNote                    │  │
│  │  └── StartOverButton                      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 3. File Reference

### Components (`ai-llergy-webapp/src/components/`)

| File | Purpose | Props |
|------|---------|-------|
| `MenuResults.tsx` | Main results container | `safeItems`, `cautionItems`, `excludedCount`, `customAllergyNote`, `selectedAllergens`, `onStartOver` |
| `SelectionSummary.tsx` | User selections display (v2.3) | `selectedAllergens` |
| `AccordionSection.tsx` | Collapsible section | `title`, `count`, `variant`, `defaultOpen`, `children` |
| `MenuItem.tsx` | Individual menu item card with expandable ingredients | `name`, `price`, `ingredients`, `warning?` |

### State Management (`page.tsx`)

```typescript
import { SelectedAllergen } from "@/lib/allergens";

interface MenuItemData {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

interface ResultsData {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  excludedCount: number;
  customAllergyNote?: string;
}

// State (v2.3 - uses SelectedAllergen[] instead of Set<string>)
const [selectedAllergens, setSelectedAllergens] = useState<SelectedAllergen[]>([]);
const [results, setResults] = useState<ResultsData | null>(null);

// After successful API response
setResults({
  safeItems: data.safeItems,
  cautionItems: data.cautionItems,
  excludedCount: data.excludedCount,
  customAllergyNote: data.customAllergyNote,
});

// Reset to form view (v2.3 - array instead of Set)
const handleStartOver = () => {
  setResults(null);
  setSelectedAllergens([]);
  setCustomAllergy("");
};
```

## 4. Styling Reference

### CSS Classes (in `globals.css`)

| Class | Purpose |
|-------|---------|
| `.results-container` | Main wrapper, fade-in animation |
| `.selection-summary` | User selections box at top (v2.3) |
| `.selection-summary__pills` | Flat row of selection pills (v4.7) |
| `.selection-pill` | Individual allergen pill — neutral style, used for all selections (v4.7) |
| `.selection-summary__group` | **Unused since v4.7** (was severity group wrapper) |
| `.selection-summary__label--allergy` / `--preference` | **Unused since v4.7** (severity badges) |
| `.selection-pill--allergy` / `--preference` / `--life_threatening` | **Unused since v4.7** (severity-coloured pills) |
| `.results-header` | Centered header section |
| `.results-title` | "X items available for you" heading |
| `.results-excluded` | Subtle excluded count note |
| `.results-note` | Saffron-bordered info box for custom allergy note |
| `.accordion` | Collapsible section wrapper |
| `.accordion__header` | Clickable header with chevron |
| `.accordion__indicator--safe` | Seafoam dot for safe section |
| `.accordion__indicator--caution` | Saffron dot for caution section |
| `.accordion__content` | Animated expand/collapse container |
| `.menu-item` | Individual item card |
| `.menu-item--caution` | Left border accent for caution items |
| `.menu-item__header-right` | Flex container for price + toggle button |
| `.menu-item__toggle` | Circular chevron button to expand ingredients |
| `.menu-item__toggle--open` | Rotated state (-90deg) when expanded |
| `.menu-item__ingredients-wrapper` | Collapsible container for ingredients |
| `.menu-item__ingredients-wrapper--open` | Expanded state with max-height animation |
| `.menu-item__ingredients` | Ingredients text styling |
| `.menu-item__warning` | Saffron warning text with icon |
| `.secondary-btn` | Outlined button style for "Start Over" |

### Brand Colors Used

| Element | Color | Hex |
|---------|-------|-----|
| Safe indicator | Seafoam | `#8FB6AB` |
| Caution indicator | Saffron | `#F4B223` |
| Warning text | Saffron | `#F4B223` |
| Item cards | White | `#FFFFFF` |
| Background | Garlic | `#FDFBF7` |

### Animations

```css
/* Results fade-in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Accordion expand */
.accordion__content--open {
  max-height: 2000px;
  padding-top: var(--spacing-sm);
}

/* Chevron rotation (accordion sections) */
.accordion__chevron { transform: rotate(90deg); }
.accordion__chevron--open { transform: rotate(-90deg); }

/* Menu item ingredient toggle */
.menu-item__toggle { transform: rotate(90deg); }
.menu-item__toggle--open { transform: rotate(-90deg); }

/* Menu item ingredients expand */
.menu-item__ingredients-wrapper { max-height: 0; }
.menu-item__ingredients-wrapper--open { max-height: 200px; }
```

## 5. User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Form View  │────▶│  Loading    │────▶│  Results    │
│  (allergens)│     │  (spinner)  │     │  View       │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               │ "Start Over"
                                               ▼
                                        ┌─────────────┐
                                        │  Form View  │
                                        │  (reset)    │
                                        └─────────────┘
```

### States

1. **Form View**: User selects allergens, enters custom text
2. **Loading**: Spinner shows, button disabled
3. **Results View**: Filtered menu displayed with accordions
4. **Start Over**: Returns to form with cleared selections

## 6. API Data Mapping

### Response → Component Props

```typescript
// API Response (from /api/submit)
{
  safeItems: [...],      // → MenuResults.safeItems
  cautionItems: [...],   // → MenuResults.cautionItems
  excludedCount: 15,     // → MenuResults.excludedCount
  customAllergyNote: "..." // → MenuResults.customAllergyNote
}

// Individual item (from safeItems/cautionItems)
{
  name: "Hummus",        // → MenuItem.name
  ingredients: "...",    // → MenuItem.ingredients
  price: 12,             // → MenuItem.price
  warnings: ["..."]      // → MenuItem.warning (joined)
}
```

## 7. Testing Checklist

### Functional Tests
- [ ] Submit with allergens → results display
- [ ] Submit with custom text → results display
- [ ] "Safe to Eat" accordion expands/collapses
- [ ] "Can Be Modified" accordion expands/collapses
- [ ] Menu item toggle expands to show ingredients
- [ ] Menu item toggle collapses to hide ingredients
- [ ] Multiple menu items can be expanded independently
- [ ] "Start Over" returns to form with cleared state
- [ ] Custom allergy note displays when present
- [ ] Excluded count displays correctly

### Visual Tests
- [ ] Seafoam indicator on safe section
- [ ] Saffron indicator on caution section
- [ ] Warning badges on caution items
- [ ] Fade-in animation on results load
- [ ] Chevron rotates on accordion toggle
- [ ] Menu item toggle chevron rotates on expand/collapse
- [ ] Ingredients expand with smooth animation
- [ ] Toggle button has subtle border and hover state
- [ ] Mobile viewport (375px) displays correctly

### Edge Cases
- [ ] No safe items → section hidden
- [ ] No caution items → section hidden
- [ ] All items excluded → "No items match" message
- [ ] Very long ingredient list → text wraps properly
- [ ] Multiple warnings on one item → joined with period

## 8. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Results not showing | `results` state not set | Check API response parsing in `handleSubmit` |
| Accordion not animating | Missing CSS | Ensure `.accordion__content` has `max-height: 0` by default |
| Chevron not rotating | Missing class toggle | Check `isOpen` state in AccordionSection |
| Prices showing as `$undefined` | Missing price in API | Check `price` field in Google Sheet |
| "Start Over" not working | State not clearing | Verify `setResults(null)` is called |
| "vegan-free" nonsensical text | Backend phrasing bug | Fixed in v2.2.1 - see `filter-menu.ts` §4.1 in backend directive |

### Historical Bugs (Resolved)

| Bug | Version Fixed | Notes |
|-----|---------------|-------|
| "Can be made vegan-free on request" | v2.2.1 | Dietary preferences (vegan, vegetarian) now use "Can be made X on request" without `-free` suffix. See `directives/backend_menu_filter.md` §4.1 for implementation details. |

## 9. Future Improvements

- [ ] Add smooth scroll to results on submit
- [ ] Add item count badges on collapsed accordions
- [ ] Add "Copy to clipboard" for sharing results
- [x] ~~Add filter tags showing active allergens~~ (Done in v2.3 - SelectionSummary)
- [ ] Add skeleton loading state instead of spinner
- [ ] Add haptic feedback on mobile for button taps
- [x] ~~Add toggle to show/hide ingredients on menu items~~ (Done in v2.5)

## 10. Version History

### v4.7 (2026-06-16)
- **Flat Selection Summary**: `SelectionSummary.tsx` rewritten to render one flat "Your Selections" list of neutral pills. Removed the per-severity grouping (Life Threatening / Allergy / Preference / Added-via-Search / Custom Restrictions).
- **Reason**: Severity is no longer collected from the user (submit-time slider removed — see `allergen_management.md` §6 and `SeverityModal.tsx`), so grouping by it was meaningless.
- **Files Modified**: `SelectionSummary.tsx`. Severity-specific CSS classes left in `globals.css` but unused.

### v4.3 (2026-02-19)
- **Caution Section Title**: Changed from "Can Be Modified" to "Modification Suggestions - Subject to kitchen approval"
- **Reason**: More accurate phrasing that sets proper expectations for users
- **Files Modified**: `MenuResults.tsx` (line 77)

### v2.5 (2026-02-13)
- **Expandable Ingredients**: Added dropdown toggle to each menu item to show/hide ingredients
- **MenuItem Component**: Added `useState` for expand state, chevron toggle button
- **Smooth Animation**: Ingredients expand/collapse with max-height CSS transition
- **Accessibility**: Added `aria-expanded`, `aria-label`, `aria-hidden` attributes
- **Pattern Reuse**: Follows same chevron rotation pattern as AccordionSection

### v2.3 (2026-02-10)
- **SelectionSummary**: Added component showing user selections at top of results
- **Allergy/Preference pills**: Different colors for allergies (red) vs preferences (orange)
- **Ingredients hidden**: MenuItem no longer displays ingredients for cleaner UI
- **Updated props**: MenuResults now accepts `selectedAllergens: SelectedAllergen[]`

### v2.2.1 (2026-02-10)
- Fixed "vegan-free" phrasing bug in warning text

### v2.1 (2026-01-21)
- Initial results display with accordions, menu items, animations
