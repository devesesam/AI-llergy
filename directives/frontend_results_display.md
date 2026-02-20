# Directive: Frontend Results Display

**Goal**: Display filtered menu results to the user in a beautiful, brand-aligned UI after form submission. The results view replaces the form and shows safe items, caution items, and relevant notes.

## 1. Overview

After the user submits their allergen selections, the form is replaced by a results view that displays:
- **Selection Summary** (v2.3) - User's selected allergens with allergy/preference labels
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
│  │  ├── SelectionSummary (v2.3)              │  │
│  │  │   ├── Allergies group (red pills)      │  │
│  │  │   └── Preferences group (orange pills) │  │
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
| `.selection-summary__group` | Allergies or Preferences group |
| `.selection-summary__label--allergy` | Red "Allergies" badge |
| `.selection-summary__label--preference` | Orange "Preferences" badge |
| `.selection-pill` | Individual allergen pill |
| `.selection-pill--allergy` | Red-bordered pill for allergies |
| `.selection-pill--preference` | Orange-bordered pill for preferences |
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
