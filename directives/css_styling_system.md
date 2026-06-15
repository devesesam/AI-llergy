# Directive: CSS Styling System

**Goal**: Document the CSS architecture, naming conventions, and component styles for the AI-llergy web app. This ensures consistent styling and prevents visual regressions.

## 1. Overview

The app uses a hybrid styling approach:
- **Custom CSS**: BEM-style classes in `globals.css` for all custom components
- **Tailwind CSS v4**: Utility classes for layout and quick styling
- **CSS Variables**: Design tokens in `:root` for colors, spacing, typography

### Key Files
- `src/app/globals.css` - All custom styles (~1500 lines)
- `@theme` block at top maps CSS variables to Tailwind utilities

## 2. Design Tokens (CSS Variables)

### Colors
```css
:root {
  /* Background & Surface */
  --color-background: #FDFCF8;     /* Cream/Beige (Garlic) */
  --color-surface: #FFFFFF;         /* White */
  --color-surface-hover: #F9F9F9;   /* Light gray hover */

  /* Text */
  --color-text: #1F2937;            /* Dark charcoal */
  --color-text-muted: #6B7280;      /* Medium gray */
  --color-text-inverse: #FFFFFF;    /* White text on dark bg */

  /* Brand */
  --color-primary: #f4c025;         /* Gold/Amber (Saffron) */
  --color-primary-hover: #e0ac1a;   /* Darker gold */

  /* Severity (Traffic Light) */
  --color-severity-preference: #22c55e;  /* Green */
  --color-severity-allergy: #f97316;     /* Orange */
  --color-severity-critical: #ef4444;    /* Red */

  /* Legacy Accents */
  --color-accent-seafoam: #8fb6ab;
  --color-accent-saffron: #f4b223;
  --color-accent-margaux: #cf4f5d;
}
```

### Typography
```css
:root {
  --font-heading: "Bogart", "Georgia", serif;
  --font-body: "Manrope", "Helvetica Neue", "Arial", sans-serif;
}
```

### Spacing
```css
:root {
  --spacing-xs: 0.5rem;   /* 8px */
  --spacing-sm: 1rem;     /* 16px */
  --spacing-md: 1.5rem;   /* 24px */
  --spacing-lg: 2rem;     /* 32px */
  --spacing-xl: 3rem;     /* 48px */
}
```

### Border Radius
```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 24px;
  --radius-btn: 100px;    /* Pill shape */
}
```

### Borders
```css
:root {
  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-light: rgba(0, 0, 0, 0.1);
}
```

## 3. Tailwind v4 Theme Integration

Tailwind v4 uses CSS-based configuration. The `@theme` block maps CSS variables:

```css
@import "tailwindcss";

@theme {
  --color-background: #FDFCF8;
  --color-surface: #FFFFFF;
  --color-surface-hover: #F9F9F9;
  --color-text: #1F2937;
  --color-text-muted: #6B7280;
  --color-primary: #f4c025;
  --color-primary-hover: #e0ac1a;
  --color-light: rgba(0, 0, 0, 0.1);
  --font-heading: "Bogart", "Georgia", serif;
  --font-body: "Manrope", "Helvetica Neue", "Arial", sans-serif;
}
```

This enables Tailwind classes like:
- `bg-background`, `bg-surface`, `bg-primary`
- `text-text`, `text-text-muted`, `text-primary`
- `border-light`
- `font-heading`, `font-body`

## 4. BEM Naming Convention

All custom CSS uses BEM (Block Element Modifier):

```
.block                    /* Component root */
.block__element           /* Child element */
.block--modifier          /* Component variant */
.block__element--modifier /* Element variant */
```

### Examples
```css
.allergen-option                    /* Allergen tile */
.allergen-option__icon              /* Icon inside tile */
.allergen-option--selected          /* Selected state */
.allergen-option.selected--allergy  /* Allergy severity */
```

## 5. Component Style Reference

### Allergen Selection Page

#### Allergen Grid (Container)
```css
.allergen-grid                     /* Main container */
.allergen-grid__section-title      /* Section header (h3) */
.allergen-grid__buttons            /* 2-column grid for tiles (legacy/dietary fallback) */
.allergen-grid__groups             /* Container for group dropdowns */
.allergen-grid__rows               /* (v4.5) Vertical stack of full-width row buttons */
```

#### Allergen Tiles (Buttons)
```css
.allergen-option                   /* Tile base - square, aspect-ratio 1/0.85, column layout */
.allergen-option .icon             /* Large centered emoji */
.allergen-option .label            /* Text below icon */
.allergen-option:hover             /* Hover lift effect */
.allergen-option.selected          /* Selected base (dark bg) */
.allergen-option.selected--preference   /* Green bg */
.allergen-option.selected--allergy      /* Orange bg */
.allergen-option.selected--life_threatening  /* Red bg */
.allergen-option.selected--pending      /* Gray pending state */
```

#### Allergen Rows (v4.5 — Dietary Preferences & Common Allergens)
```css
.allergen-grid__rows .allergen-option        /* Full-width horizontal row (overrides square base) */
.allergen-grid__rows .allergen-option .icon  /* Smaller inline icon (1.25em) */
.allergen-grid__rows .allergen-option .label /* Centred label */
```

> **⚠️ Specificity gotcha (BUG-008)** — Why these rules are scoped under
> `.allergen-grid__rows` instead of using a `.allergen-option--row` modifier:
> a single BEM modifier class (`.allergen-option--row`) has the **same
> specificity (0,1,0)** as the base `.allergen-option` rule. Because the base
> rule appears **later** in `globals.css`, it won the tie and kept re-imposing
> `aspect-ratio: 1 / 0.85` + `flex-direction: column` → the rows rendered as big
> squares. Scoping under the parent (`.allergen-grid__rows .allergen-option` =
> 0,2,0) makes the row rules win regardless of source order. The
> `AllergenButton` `variant="row"` prop still emits an `allergen-option--row`
> class as a semantic hook, but the *styling* hangs off the container selector.
> **Lesson**: a BEM `--modifier` does NOT out-specify its base block; when an
> override must beat a later same-specificity rule, raise specificity (parent
> scope) or move it after the base rule.

#### Allergen Groups (Expandable)
```css
.allergen-group                    /* Group card container */
.allergen-group__header            /* Clickable header */
.allergen-group__header--has-selection  /* Has selected items */
.allergen-group__icon              /* Group emoji */
.allergen-group__label             /* Group name */
.allergen-group__count             /* Selection count badge */
.allergen-group__chevron           /* Dropdown arrow (v4.3: at far right via margin-left: auto) */
.allergen-group__chevron--up       /* Rotated when open */
.allergen-group__dropdown          /* Expanded content (2-col grid) */
```

### Autocomplete Input

```css
.autocomplete-container            /* Wrapper */
.autocomplete-tags                 /* Selected tags row */
.autocomplete-input-wrapper        /* Input container */
.autocomplete-input                /* Text input */
.autocomplete-input--blocking      /* Has unconfirmed text */
.autocomplete-dropdown             /* Suggestions popup */
.autocomplete-option               /* Suggestion item */
.autocomplete-option__icon         /* Allergen emoji */
.autocomplete-option__content      /* Name + match text */
.autocomplete-option__name         /* Primary text */
.autocomplete-option__match        /* Matched synonym */
.autocomplete-no-match             /* No results state */
.autocomplete-no-match__text       /* Message */
.autocomplete-add-custom           /* Add custom button */
.autocomplete-helper               /* Helper text below input */
```

### Tags (Removable Pills)

```css
.allergen-tag                      /* Standard allergen tag */
.allergen-tag__icon                /* Emoji */
.allergen-tag__label               /* Name */
.allergen-tag__remove              /* X button */

.custom-tag                        /* Custom restriction tag */
.custom-tag__icon                  /* Tag emoji */
.custom-tag__label                 /* Text */
.custom-tag__remove                /* X button */
```

### Modals

#### Modal Backdrop
```css
.modal-backdrop                    /* Full-screen overlay */
```

#### Severity Modal
```css
.severity-modal                    /* Modal card */
.severity-modal__header            /* Header with title */
.severity-modal__title             /* Main heading */
.severity-modal__subtitle          /* Description */
.severity-modal__list              /* Items container */
.severity-modal__item              /* Single allergen row */
.severity-modal__item-info         /* Icon + name */
.severity-modal__item-icon         /* Emoji */
.severity-modal__item-name         /* Label */
.severity-modal__agreement         /* Checkbox row */
.severity-modal__checkbox          /* Checkbox input */
.severity-modal__agreement-text    /* Label text */
.severity-modal__footer            /* Buttons row */
```

#### Severity Slider (v4.3 — ⚠️ UNUSED since v4.7)

> The severity slider was removed from the submit-time modal in v4.7 (severity is
> no longer collected). These classes remain in `globals.css` but are not rendered
> by any component. Safe to delete in a future cleanup pass.

```css
.severity-slider                   /* Full-width slider container */
.severity-slider__labels           /* Label row above slider */
.severity-slider__label--preference    /* "Preference" green text (left) */
.severity-slider__label--allergy       /* "Intolerance/Allergy" orange text (center) */
.severity-slider__label--life_threatening  /* "Life Threatening" red text (right) */
.severity-slider__input            /* Range input with gradient track */
.severity-slider__input--preference    /* Green thumb when at position 0 */
.severity-slider__input--allergy       /* Orange thumb when at position 1 */
.severity-slider__input--life_threatening  /* Red thumb when at position 2 */
```

**Slider Implementation** (v4.3):
- Track shows gradient: green (0-33%) → orange (33-66%) → red (66-100%)
- Thumb color changes based on current value
- Uses `<input type="range" min="0" max="2" step="1">`
- WebKit and Firefox thumb styles defined separately

**Layout Change** (v4.3):
- Modal items changed from horizontal (name left, controls right) to vertical
- `.severity-modal__item` uses `flex-direction: column` for full-width slider

#### Type Modal (Allergy vs Preference)
```css
.type-modal                        /* Modal card */
.type-modal__header                /* Icon + title */
.type-modal__icon                  /* Large emoji */
.type-modal__title                 /* Allergen name */
.type-modal__question              /* "Is this an allergy?" */
.type-modal__buttons               /* Button stack */
.type-modal__btn                   /* Button base */
.type-modal__btn--allergy          /* Orange button */
.type-modal__btn--preference       /* Green button */
.type-modal__btn-desc              /* Button description */
```

### Results Page

#### Results Container
```css
.results-container                 /* Main wrapper */
.results-header                    /* Centered header */
.results-title                     /* "X items available" */
.results-subtitle                  /* "Based on preferences" */
.results-excluded                  /* "Y items excluded" */
```

#### Selection Summary

> **v4.7**: Flattened to a single neutral pill list. Only `.selection-summary`,
> `.selection-summary__title`, `.selection-summary__pills`, `.selection-pill`,
> `.selection-pill__icon`, and `.selection-pill__label` are still used. The
> severity/group classes below are **unused since v4.7** (kept for now).

```css
.selection-summary                 /* Card showing selections — USED */
.selection-summary__title          /* "Your Selections" — USED */
.selection-summary__pills          /* Flat pills row — USED */
.selection-pill                    /* Individual selection (neutral) — USED */
.selection-pill__icon              /* Emoji — USED */
.selection-pill__label             /* Name — USED */

/* --- Unused since v4.7 (severity grouping removed) --- */
.selection-summary__group          /* Severity group wrapper */
.selection-summary__label          /* Severity badge */
.selection-summary__label--life_threatening  /* Red badge */
.selection-summary__label--allergy           /* Orange badge */
.selection-summary__label--preference        /* Green badge */
.selection-summary__label--custom            /* Gray badge */
.selection-pill--life_threatening  /* Red border */
.selection-pill--allergy           /* Orange border */
.selection-pill--preference        /* Green border */
.selection-pill--custom            /* Gray border */
```

#### Accordion Sections
```css
.accordion                         /* Section container */
.accordion--safe                   /* Safe items variant */
.accordion--caution                /* Caution items variant */
.accordion__header                 /* Clickable header */
.accordion__title-group            /* Indicator + title */
.accordion__indicator              /* Colored dot */
.accordion__indicator--safe        /* Green dot */
.accordion__indicator--caution     /* Orange dot */
.accordion__title                  /* Section title */
.accordion__count                  /* "(9)" count */
.accordion__chevron                /* Arrow */
.accordion__chevron--open          /* Rotated arrow */
.accordion__content                /* Collapsible area */
.accordion__content--open          /* Expanded state */
```

#### Menu Items
```css
.menu-item                         /* Item card */
.menu-item--caution                /* Left orange border */
.menu-item__header                 /* Name + price row */
.menu-item__name                   /* Dish name */
.menu-item__header-right           /* Price + toggle */
.menu-item__price                  /* Dollar amount */
.menu-item__toggle                 /* Expand button */
.menu-item__toggle--open           /* Rotated state */
.menu-item__ingredients-wrapper    /* Collapsible */
.menu-item__ingredients-wrapper--open  /* Expanded */
.menu-item__ingredients            /* Ingredient text */
.menu-item__warning                /* Warning banner */
.menu-item__warning-icon           /* ! circle */
```

### Dashboard

#### Layout
```css
.dashboard-layout                  /* Flex container */
.dashboard-main                    /* Content area */
```

#### Sidebar
```css
.dashboard-sidebar                 /* Fixed sidebar */
.dashboard-sidebar--open           /* Mobile open state */
.dashboard-sidebar__header         /* Brand + user */
.dashboard-sidebar__brand          /* "AI-llergy" */
.dashboard-sidebar__user           /* Email */
.dashboard-sidebar__nav            /* Navigation area */
.dashboard-sidebar__section        /* Nav group */
.dashboard-sidebar__section-title  /* "MENU" label */
.dashboard-sidebar__section-header /* Title + add link */
.dashboard-sidebar__add-link       /* "+ Add" link */
.dashboard-sidebar__link           /* Nav item */
.dashboard-sidebar__link--active   /* Current page */
.dashboard-sidebar__link-icon      /* Emoji */
.dashboard-sidebar__active-dot     /* Gold dot */
.dashboard-sidebar__footer         /* Bottom area */
.dashboard-sidebar__signout        /* Sign out button */
```

#### Mobile Header
```css
.dashboard-mobile-header           /* Fixed top bar */
.dashboard-mobile-header__toggle   /* Hamburger button */
.dashboard-mobile-header__brand    /* "AI-llergy" */
.dashboard-overlay                 /* Backdrop when open */
```

#### Forms
```css
.dashboard-form                    /* Form container */
.dashboard-form__group             /* Field group */
.dashboard-form__label             /* Label text */
.dashboard-form__input             /* Input/textarea */
.dashboard-form__help              /* Help text */
.dashboard-form__actions           /* Buttons row */
```

#### Allergen Toggles
```css
.allergen-toggles                  /* Toggle grid */
.allergen-toggle                   /* Single toggle */
.allergen-toggle--active           /* Selected state */
.allergen-toggle__checkbox         /* Hidden checkbox */
```

### Auth/Login Page

```css
.auth-page                         /* Full page wrapper */
.auth-card                         /* Login card */
.auth-card__header                 /* Title area */
.auth-card__title                  /* "Welcome Back" */
.auth-card__subtitle               /* Description */

.auth-form                         /* Form container */
.auth-form__group                  /* Field group */
.auth-form__label                  /* Label */
.auth-form__label-row              /* Label + forgot link */
.auth-form__forgot                 /* "Forgot?" link */
.auth-form__input                  /* Input field */
.auth-form__error                  /* Error message */
.auth-form__success                /* Success message */
.auth-form__submit                 /* Submit button */
.auth-form__toggle                 /* Sign up/in toggle */
.auth-form__toggle-btn             /* Toggle button */
```

### Buttons

```css
.btn                               /* Base button */
.primary-btn                       /* Gold background */
.secondary-btn                     /* White with border */
.full-width                        /* 100% width */
```

### Badges

```css
.type-badge                        /* Small circle badge */
.type-badge--preference            /* On green buttons */
.type-badge--allergy               /* On orange buttons */
.type-badge--life_threatening      /* On red buttons */
```

### Loading Spinner

```css
.loading-spinner                   /* SVG spinner element */
```

**Animation** (v4.3 fix):
```css
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

## 6. Responsive Breakpoints

```css
/* Small phones */
@media (max-width: 380px) {
  /* Tighter spacing, smaller fonts */
}

/* Tablets and up (v4.3 fix) */
@media (min-width: 768px) {
  .app-container {
    max-width: 500px;  /* Keep phone-ish width, centered */
  }
}
```

**Important (v4.3)**: The desktop media query should NOT expand to `max-width: 100%`. Keep the app constrained to phone-width for consistent UX across devices.

## 7. Adding New Components

When adding a new component:

1. **Use BEM naming**: `.component-name__element--modifier`
2. **Use CSS variables**: Never hardcode colors/spacing
3. **Add to globals.css**: Keep styles organized by component
4. **Document here**: Add to the reference above
5. **Test responsively**: Check mobile breakpoints

### Example: Adding a new card component

```css
/* New Feature Card Styles */
.feature-card {
  background-color: var(--color-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.feature-card__title {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.feature-card__description {
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.feature-card--highlighted {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(244, 192, 37, 0.1);
}
```

## 8. Common Patterns

### Card Pattern
```css
background-color: var(--color-surface);
border: 1px solid var(--border-light);
border-radius: var(--radius-md);
padding: var(--spacing-md);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
```

### Hover Lift Effect
```css
transition: all 0.2s ease;

&:hover {
  background-color: var(--color-surface-hover);
  transform: translateY(-1px);
}
```

### Collapsible Animation
```css
.collapsible {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.collapsible--open {
  max-height: 2000px;
}
```

### Chevron Rotation
```css
.chevron {
  transition: transform 0.2s ease;
  transform: rotate(90deg);
}

.chevron--open {
  transform: rotate(-90deg);
}
```

### Severity Color States
```css
.element--preference {
  background-color: var(--color-severity-preference);
  color: white;
}

.element--allergy {
  background-color: var(--color-severity-allergy);
  color: white;
}

.element--life_threatening {
  background-color: var(--color-severity-critical);
  color: white;
}
```

## 9. Debugging Tips

### Finding Missing Styles
```bash
# Search for class usage in components
grep -r "className=" ai-llergy-webapp/src/components/ | grep "new-class"

# Check if class is defined
grep -n "new-class" ai-llergy-webapp/src/app/globals.css
```

### Browser DevTools
1. Inspect element to see computed styles
2. Check if class is applied but empty
3. Look for CSS variable fallbacks

### Common Issues

| Symptom | Likely Cause |
|---------|--------------|
| Element invisible | Missing background/border styles |
| Layout broken | Missing display/flex styles |
| Colors wrong | CSS variable not defined |
| Tailwind class not working | Not in `@theme` block |

## 10. Related Directives

- **Project Overview**: `directives/project_ai_llergy.md` - Full changelog (v4.3 UI polish)
- **Dashboard Admin**: `directives/dashboard_admin.md` - Dashboard component list
- **Allergen Management**: `directives/allergen_management.md` - Severity slider documentation
- **Known Issues**: `directives/known_issues_and_fixes.md` - BUG-003 CSS regression, BUG-004 spinner, BUG-005 desktop width

## 11. Version History

### v4.7 (2026-06-16)
- **Severity UI removed**: `.severity-slider*` classes and the `.selection-pill--*` / `.selection-summary__label--*` / `.selection-summary__group` severity classes are now **unused** (severity slider removed from the submit modal; results summary flattened). Left in place; candidate for deletion.

### v4.5 (2026-06-11)
- **Allergen rows**: Added `.allergen-grid__rows` + `.allergen-grid__rows .allergen-option` for full-width horizontal row buttons (Dietary Preferences + Common Allergens).
- **Specificity fix (BUG-008)**: Row styles are scoped under the container, not a `--row` modifier, so they beat the later same-specificity base `.allergen-option` rule. See §5 "Specificity gotcha".
- **Centred labels**: Row buttons use `justify-content: center` + `text-align: center`.

### v4.4 (2026-02-20)
- **Other Allergens Dropdown**: "Other Allergens" section now uses `AllergenGroup` component
- **No CSS Changes**: Existing `.allergen-group__*` styles apply automatically
- **UI Pattern**: All allergen sections (except Dietary) now use consistent accordion pattern

### v4.3 (2026-02-19)
- **Loading Spinner**: Added missing animation (`@keyframes spin`)
- **Desktop Width**: Fixed `max-width: 100%` → `max-width: 500px` in 768px media query
- **Severity Slider**: Updated styling docs for new slider UI (replaces P/A/L buttons)
- **Allergen Group Chevron**: Documented `margin-left: auto` positioning change
