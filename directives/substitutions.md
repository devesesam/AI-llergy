# Directive: Chef Substitutions / "Can be modified" feature

## Goal
Let a venue tell diners that a dish — which otherwise contains an allergen and would be
excluded — **can be modified** to suit them, using the chef's own specific swaps and
removals. The app reads this data deterministically (no LLM at request time) and surfaces
matching dishes in a **"Can be modified for you"** results section.

## Where the data lives (PER VENUE)
Each venue has its own **Substitutions** tab inside the shared menu Google Sheet (same
`GOOGLE_SHEET_ID`). The tab's `gid` is declared per venue in the registry
**`ai-llergy-webapp/src/lib/venues.ts`** as `substitutionsGid` (NOT the old
`GOOGLE_SUBSTITUTIONS_GID` env var, which is retired).

- If a venue's `substitutionsGid` is `undefined`, the feature is dormant **for that venue** and it
  behaves exactly as before (no "Can be modified" section). Other venues are unaffected.
- Cached in-memory for 10 minutes per venue (keyed by slug), same as the menu. Edits appear within
  ~10 min (or on redeploy).
- Live status: **Kisa** is wired (`1265271651`). **Mr Go's** (`1639397504`) and **Ombra**
  (`1976184234`) are deliberately `undefined` — those tabs currently hold Kisa example rows the
  chef is using as a template, so wiring them would surface the wrong venue's swaps. Set the gid
  only once the tab holds that venue's own swaps.

To get the gid: open the venue's Substitutions tab, look at the URL — `...#gid=123456789` — that
number is the gid; put it in that venue's entry in `venues.ts`.

## Tab schema (columns)
| Column | Required | Meaning |
|---|---|---|
| `Dish` | yes | Must match a menu dish name (case-insensitive, trimmed). Join key. |
| `Action` | yes | `Remove` or `Substitute` |
| `Ingredient` | recommended | The ingredient being removed / replaced out (shown to diner) |
| `Substitute` | substitute only | The replacement ingredient (leave blank for `Remove`) |
| `Solves` | yes | Allergen id(s) this modification makes safe — comma-separated |
| `Introduces` **or** `Introduces allergy` | substitute only | Allergen id(s) the substitute ADDS — comma-separated, blank if none |

One row = one modification. A dish can have multiple rows.

**Header tolerance (the parser is keyword-matched — `substitutions.ts` `pickCell`).** Mosaic has
repeatedly renamed these columns; the parser now matches by keyword so it survives. Each logical field
is found like this:

| Logical field | Matched header(s) |
|---|---|
| Dish | `Dish` / `Item`, else the **first column** |
| Action | `Action` |
| Ingredient (removed/swapped out) | `Ingredient` **or** `Element` |
| Substitute (replacement) | `Substitute` / `Substitute Element (name…)`; falls back to a `Substitute … ingredient(s)` column; `NO`/blank = none |
| Solves | `Solves` **or** `Solves allergy` (any header containing "solve") |
| Introduces | `Introduces` **or** `Introduces allergy …` (any header containing "introduc" + "allerg") |

- Mosaic's current richer schema is supported: `Dish, Action, Element, Element ingredient(s),
  Substitute Element (name or NO), Substitute Element ingredient(s), Solves allergy,
  Introduces allergy (if substitution)`. The `… ingredient(s)` detail columns are free-text context and
  are not shown to diners (except as a fallback for the substitute name).
- Why this matters: the tab was edited to rename `Introduces`→`Introduces allergy` and `Solves`→
  `Solves allergy`, each of which silently broke the feature (see `known_issues_and_fixes.md` BUG-012
  and BUG-013). The tolerant parser prevents that, but **keep the headers keyword-recognizable**
  (must contain "solve", and the introduced column must contain "introduc"+"allerg").

## Canonical allergen ids (use these in `Solves` / `Introduces`)
`vegetarian, vegan, peanuts, treenuts, gluten, wheat, dairy, eggs, soy, fish, shellfish,
sesame, almond, walnut, pistachio, mustard, sulfites, garlic, onion, celery, chili,
capsicum, lupin, molluscs`

Notes: tree nuts is `treenuts` (plural); a nut swap usually solves/introduces both the
specific nut (e.g. `almond`) AND `treenuts`. A gluten-free flour swap usually solves both
`gluten` and `wheat`.

## How the app uses it (rescue logic)
For a dish that is excluded because it contains allergen(s) the diner selected:
1. Look up the dish's substitution rows.
2. For **every** triggering allergen, require a row whose `Solves` includes it **and** whose
   `Introduces` does **not** contain any allergen the diner ALSO selected.
3. If every triggering allergen is covered → the dish moves to "Can be modified" with the
   specific instructions. Otherwise it stays excluded.

This means a swap that introduces an allergen the diner avoids is never offered (e.g. a
wheat→almond-flour swap is hidden from someone avoiding tree nuts). Modifications show for all
severity levels, keeping the "subject to kitchen approval" + cross-contamination disclaimer.

**Critical prerequisite — the dish must be EXCLUDED to be rescued.** Rescue only runs on dishes the
menu marks as *containing* the triggering allergen (`… FREE = NO`). If the menu marks the dish
`… FREE = YES`, it's already "safe", shows in the normal Safe list, and the substitution row does
nothing. So a substitution row and the menu flags must agree: if a dish has a "swap to make it
gluten-free" row, its `GLUTEN FREE` must be `NO`. (This exact inconsistency was hit during testing —
see `known_issues_and_fixes.md` notes under FEATURE-003.)

Note on `wheat`: it's no longer a standalone filter (folded into `gluten`), but leaving `wheat` in a
row's `Solves`/`Introduces` is harmless — it just never matches a triggering allergen.

## Displayed text (auto-generated, deterministic)
- Substitute → `Swap Wheat flour → Gluten-free flour blend (makes it gluten-free)`
  (if it introduces something: `… — note: adds Almond, Tree Nuts`)
- Remove → `Ask to remove Garlic (makes it garlic-free)`

## Chef hand-off process
1. Send the chef `kisa_substitutions_template.csv` (workspace root) — it has the headers plus
   a few starter examples to edit/replace. Ask them to list, per dish: what they can remove or
   swap, which allergy it solves, and (for swaps) anything the replacement introduces.
2. Validate before publishing:
   `python execution/validate_substitutions.py <their_file>.csv kisa_menu.csv`
   Fix any reported errors (usually a dish name that doesn't match, or a mistyped allergen id).
3. Paste the validated rows into that venue's **Substitutions** tab in the Google Sheet
   (replacing any example/template rows — a duplicated tab may still hold another venue's rows).
4. Grab the tab's `gid` and set `substitutionsGid` on that venue's entry in
   `ai-llergy-webapp/src/lib/venues.ts`, then commit + redeploy. (No env var to set.)

## Files (code)
- `ai-llergy-webapp/src/lib/venues.ts` — per-venue `substitutionsGid` (which tab to read)
- `ai-llergy-webapp/src/lib/google-sheets.ts` — `fetchSubstitutionsFromSheets(subsGid?)` (reads the tab)
- `ai-llergy-webapp/src/lib/menu-service.ts` — `getSubstitutions(venue)` (per-venue parse + 10-min cache, dish-keyed map)
- `ai-llergy-webapp/src/lib/substitutions.ts` — parsing, viability/conflict logic, instruction formatting
- `ai-llergy-webapp/src/lib/filter-menu.ts` — rescue step → `modifiableItems`
- `ai-llergy-webapp/src/app/api/submit/route.ts` — returns `modifiedItems`
- UI: `MenuResults.tsx`, `MenuItem.tsx`, `AccordionSection.tsx`, `globals.css` (seafoam section)

## Verification (current behaviour, tested against the live sheet)
Run `npm run dev` and POST to `/api/submit`; expected with the live Kisa substitutions:
- `gluten` → Pita, Mozzarella Boreks, Lemon Tart appear in `modifiedItems` with swap text.
- `gluten` + `treenuts` → Pita **drops out** (almond-flour swap adds tree nuts); others remain.
- `garlic` → Hummus → "Ask to remove Garlic".
Reminder: this only works on production **after a redeploy**, and only while the menu tab itself is
healthy (see `google_sheet_data_source.md`).

## Known limitations / future work
- Only dishes excluded by column-based allergens are rescued; AI/custom-tag exclusions are not.
- Not surfaced on the `/v/[slug]` Supabase venue pages (separate data path).
- No chef-dashboard editor yet — substitutions are edited directly in the Sheet.
- The `introduces ingredient` column the chef added is not yet shown to diners; the displayed
  "adds …" note is derived from the allergen ids only. Wiring that free-text in is a possible
  enhancement.
