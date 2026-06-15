# Directive: Google Sheet Data Source (live menu + substitutions)

**Goal**: Document the live data source that the public app (`/` home page) reads from, the
exact schema it expects, and the failure modes that have repeatedly broken the app when the
sheet is edited. **Read this before touching the Google Sheet or the menu-loading code.**

> Context: Supabase is **paused** (see [[supabase-paused-gsheet-source]] / `supabase_integration.md`).
> The public allergen-filtering experience runs entirely off a **public Google Sheet**, not the DB.
> The `/v/[slug]` venue pages and the dashboard are the only things that still use Supabase.

## 1. Where the data lives

One Google Sheet (the **Kisa** sheet), with **two tabs**:

| Tab | Purpose | Env var | Code entry point |
|---|---|---|---|
| Menu (first/default tab) | Dishes + ingredients + allergen flags | `GOOGLE_SHEET_ID` | `fetchMenuFromSheets()` |
| **Substitutions** | Chef swaps/removals ("Can be modified") | `GOOGLE_SUBSTITUTIONS_GID` | `fetchSubstitutionsFromSheets()` |

- Current Kisa Sheet ID: `1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw`
- Substitutions tab gid: `1265271651`
- Fetched as **public CSV export**: `https://docs.google.com/spreadsheets/d/<ID>/export?format=csv[&gid=<GID>]`
  — the sheet MUST be shared "Anyone with the link → Viewer". No Google API auth is used.
- Both are cached in-memory for **10 minutes** (`menu-service.ts`), so edits take up to ~10 min to
  appear (or restart dev / redeploy to flush).

## 2. Deployment (IMPORTANT)

- Production is on **Netlify** at **https://ai-lergy.co.nz** (single "l"). The `ai-llergy.co.nz`
  strings in code are just the intended venue-URL label and don't resolve. (Directives elsewhere say
  Vercel — that's outdated.)
- Env vars (`GOOGLE_SHEET_ID`, `GOOGLE_SUBSTITUTIONS_GID`, `ANTHROPIC_API_KEY`) live in **Netlify →
  Site configuration → Environment variables**, and in `.env.local` for local dev.
- **Code changes only reach production on redeploy.** Editing the Sheet is instant-ish (10-min cache);
  editing code requires push + Netlify deploy.

## 3. Menu tab schema

Canonical template: `kisa_menu.csv` / `mosaic_menu_template.csv` (workspace root).

Columns: a **name** column, `Ingredients`, `Price`, then one column per allergen/diet, values
`YES` / `NO` / `CAN BE` (case-insensitive).

- **Name column = the first column (column A), whatever its header.** People keep renaming it
  (`Item` → `Dish` → `Element` → …), so `transformMenuItem` (`menu-service.ts`) now reads the dish name
  from the first column by position (explicit `Item`/`Dish` headers still take priority). A row with a
  blank name is dropped. **Keep the dish name in column A** and this won't break again.
- Allergen column headers must **exactly** match the `columnName` values in
  `ai-llergy-webapp/src/lib/allergens.ts` (e.g. `DAIRY FREE`, `TREE NUT FREE`, `NIGHTSHADE FREE`,
  `HALAL`). That file is the **single source of truth** — a column only "works" as a filter if it is
  registered there.
- Value semantics:
  - Dietary prefs (`Vegetarian`, `Vegan`, `HALAL`): `YES` = the dish **is** that → safe.
  - `… FREE` columns: `YES` = **free of** the allergen (safe), `NO` = contains it (excluded),
    `CAN BE` = generic "can be made safe on request" (→ caution).
- `wheat` was intentionally removed as a standalone filter — it is covered by `gluten`. A
  `WHEAT FREE` column in the sheet is simply ignored now. Don't re-add the wheat filter expecting it
  to work without re-registering it in `allergens.ts`.
- Extra columns the app doesn't know are harmless — they're ignored (it only reads columns listed in
  `allergens.ts`).

## 4. Substitutions tab schema

See `directives/substitutions.md` for the full feature. Columns:

| Column | Notes |
|---|---|
| `Dish` | Must match a menu dish name (join key, case-insensitive) |
| `Action` | `Remove` or `Substitute` |
| `Ingredient` | What's removed / replaced out |
| `Substitute` | Replacement (blank for `Remove`) |
| `Solves` | Allergen id(s) it makes safe, comma-separated |
| Introduced allergens | Header may be `Introduces` **or** `Introduces allergy` — both accepted |

- Allergen ids use the canonical lowercase ids from `allergens.ts` (e.g. `gluten`, `treenuts`).
- Any extra column (e.g. a free-text `introduces ingredient`) is ignored by the parser.
- Validate before publishing: `python execution/validate_substitutions.py <subs>.csv <menu>.csv`.

## 5. Failure modes (these have actually happened — check here first)

| Symptom | Likely cause | Fix |
|---|---|---|
| **Every selection returns 0 results; `meta.totalItems: 0`** | The dish name isn't in column A, or the no-gid export is returning the wrong tab | Put the dish name back in column A (any header is fine now); ensure the menu tab is the first/default tab |
| A specific allergen filter does nothing / sends everything to slow AI path | Its column was renamed/removed, or isn't registered in `allergens.ts` | Match the sheet header to `allergens.ts` `columnName` exactly, or register it |
| A dish that should be "modifiable" shows as plain Safe | The menu marks it `… FREE = YES`, so it's never excluded → nothing to rescue | Set that allergen column to `NO` for the dish (it must "contain" the allergen to be rescued) |
| Substitution introduces-guard stops blocking unsafe swaps | The introduced-allergen column was renamed beyond `Introduces`/`Introduces allergy` | Keep the header recognizable, or extend the matcher in `substitutions.ts` |
| Works locally, broken on ai-lergy.co.nz | Code fix not redeployed, or env var missing on Netlify | Redeploy; set the env var on Netlify |

**Golden rule for the Sheet:** the menu tab must be the first tab, keep an `Item`/`Dish` name column,
and don't rename/remove allergen column headers unless you also update `allergens.ts`. The app is
tolerant of the name column and the introduces column, but **not** of arbitrary allergen-column renames.

## 6. Related

- `directives/substitutions.md` — the "Can be modified" feature
- `directives/backend_menu_filter.md` — filtering pipeline (fast/column, confidence, AI paths)
- `directives/allergen_management.md` — the canonical allergen list (source of truth)
- `directives/known_issues_and_fixes.md` — BUG-008/009/010, FEATURE-003, schema-drift pattern
- `execution/validate_substitutions.py` — substitutions validator
