# Directive: Google Sheet Data Source (live menu + substitutions)

**Goal**: Document the live data source that the public `/[venue]` pages read from, the
exact schema they expect, and the failure modes that have repeatedly broken the app when the
sheet is edited. **Read this before touching the Google Sheet or the menu-loading code.**

> Context: Supabase is **paused** (see [[supabase-paused-gsheet-source]] / `supabase_integration.md`).
> The public allergen-filtering experience runs entirely off a **public Google Sheet**, not the DB.
> The `/v/[slug]` venue pages and the dashboard are the only things that still use Supabase.

## 1. Where the data lives (MULTI-VENUE)

**One Google Sheet, many venues.** As of the multi-venue release, every venue is a pair of tabs
in the **same** spreadsheet: a **menu** tab and (optionally) a **substitutions** tab. Which gid
belongs to which venue is declared in the static registry **`ai-llergy-webapp/src/lib/venues.ts`**
(the source of truth — `GOOGLE_SUBSTITUTIONS_GID` is no longer used).

- Spreadsheet ID: `1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw`, set via `GOOGLE_SHEET_ID`
  (shared by all venues). Old sample: `1HNWCErJzCBRfy-oPOqPgg1UYYbhOkD5tuVrLWevryeU`.
- Each venue page lives at `/<slug>` (e.g. `/kisa`); `/` is a landing page that links to each venue.

| Venue | slug | menu tab gid | substitutions tab gid |
|---|---|---|---|
| Kisa | `kisa` | `1377599134` | `1265271651` (live) |
| Mr Go's | `mr-gos` | `361708590` | `1639397504` — **OFF** (holds Kisa example rows for the chef; not wired) |
| Ombra | `ombra` | `1466155614` | `1976184234` — **OFF** (same; not wired) |

- Fetched as **public CSV export**: `https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>`
  — the sheet MUST be shared "Anyone with the link → Viewer". No Google API auth is used.
- Cached in-memory **per venue** for **10 minutes** (`menu-service.ts`, keyed by slug), so edits
  take up to ~10 min to appear (or restart dev / redeploy to flush).
- To add/onboard a venue: add a tab (menu, and optionally substitutions), grab each tab's gid from
  its URL (`...#gid=<number>`), and add a `{ slug, name, menuGid, substitutionsGid? }` entry to
  `venues.ts`. No env-var or other code change needed; the `/<slug>` route appears automatically.
- A venue's `substitutionsGid` should be left `undefined` until that tab holds **that venue's own**
  swaps. A duplicated tab often still contains another venue's example rows — wiring it would serve
  the wrong venue's substitutions (harmless only because the dish-name join misses, but don't rely
  on that).

## 2. Deployment (IMPORTANT)

- Production is on **Netlify** at **https://ai-lergy.co.nz** (single "l"). The `ai-llergy.co.nz`
  strings in code are just the intended venue-URL label and don't resolve. (Directives elsewhere say
  Vercel — that's outdated.)
- Env vars (`GOOGLE_SHEET_ID`, `ANTHROPIC_API_KEY`) live in **Netlify → Site configuration →
  Environment variables**, and in `.env.local` for local dev. (`GOOGLE_SUBSTITUTIONS_GID` is
  **retired** — per-venue gids now live in `src/lib/venues.ts`, not env.)
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
- **`Include in set menu` column (shared with the Set Menu Builder).** A `YES`/`NO` column (blank ⇒
  `NO`) now lives on these menu tabs. The **allergen app ignores it** (it's just another unknown
  column). The **Set Menu Builder** (`setmenu.ai-lergy.co.nz`, `set-menu-builder/`) reads it as an
  **opt-in flag** — only `YES` dishes may be AUTO-added to a generated set menu; `NO`/blank dishes
  (desserts, Kisa "lunch plates") never auto-populate but stay manually addable. ⚠ Because blank ⇒
  `NO`, **every set-menu-eligible dish must be explicitly `YES`**, or that app's optimiser has nothing
  to add. Don't delete/rename this column. See `directives/set_menu_builder.md` §3.

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
| **Every selection returns 0 results; `meta.totalItems: 0`** | The dish name isn't in column A, or the venue's `menuGid` points at the wrong/empty tab | Put the dish name back in column A (any header is fine now); verify the venue's `menuGid` in `src/lib/venues.ts` matches the intended menu tab |
| **A venue shows another venue's dishes / substitutions** | A `menuGid` or `substitutionsGid` in `venues.ts` points at the wrong tab (e.g. a duplicated tab still holding example rows) | Fix the gid in `venues.ts`; leave `substitutionsGid` `undefined` until the tab holds that venue's own data |
| **Whole venue 500s on submit** | The venue's `menuGid` is a placeholder/invalid gid (CSV export fails) | Set a real gid in `venues.ts` |
| A specific allergen filter does nothing / sends everything to slow AI path | Its column was renamed/removed, or isn't registered in `allergens.ts` | Match the sheet header to `allergens.ts` `columnName` exactly, or register it |
| A dish that should be "modifiable" shows as plain Safe | The menu marks it `… FREE = YES`, so it's never excluded → nothing to rescue | Set that allergen column to `NO` for the dish (it must "contain" the allergen to be rescued) |
| Substitution introduces-guard stops blocking unsafe swaps | The introduced-allergen column was renamed beyond `Introduces`/`Introduces allergy` | Keep the header recognizable, or extend the matcher in `substitutions.ts` |
| Works locally, broken on ai-lergy.co.nz | Code fix not redeployed, or env var missing on Netlify | Redeploy; set the env var on Netlify |

**Golden rule for the Sheet:** the menu tab must be the first tab, keep an `Item`/`Dish` name column,
and don't rename/remove allergen column headers unless you also update `allergens.ts`. The app is
tolerant of the name column and the introduces column, but **not** of arbitrary allergen-column renames.

## 6. Code map (multi-venue plumbing)

- `src/lib/venues.ts` — venue registry (`VENUES`, `getVenueBySlug`); slug → menuGid/subsGid/brand.
- `src/lib/google-sheets.ts` — `fetchMenuFromSheets(menuGid?)`, `fetchSubstitutionsFromSheets(subsGid?)`
  (both take a per-call gid; `fetchSheetTab(gid?)` builds the CSV URL).
- `src/lib/menu-service.ts` — per-venue cache; `getMenu(venue)`, `getSubstitutions(venue)`,
  `getAvailableColumns(venue)`, `getCacheStatus(venue)`, `refreshMenu(venue)`.
- `src/app/api/submit/route.ts` — reads `venueSlug` from the POST body, resolves the venue,
  filters that venue's menu + substitutions (defaults to `kisa` if absent).
- `src/app/[venue]/page.tsx` — resolves slug → `notFound()` if unknown → renders `<VenueApp>`.
- `src/components/VenueApp.tsx` — the shared per-venue UI (posts `venueSlug`; branding seam via
  `VenueConfig.brand` CSS-var overrides, unused for now).
- `src/app/page.tsx` — the landing page (lists `VENUES`).

## 7. Related

- `directives/substitutions.md` — the "Can be modified" feature
- `directives/backend_menu_filter.md` — filtering pipeline (fast/column, confidence, AI paths)
- `directives/allergen_management.md` — the canonical allergen list (source of truth)
- `directives/known_issues_and_fixes.md` — BUG-008/009/010, FEATURE-003, schema-drift pattern
- `execution/validate_substitutions.py` — substitutions validator
