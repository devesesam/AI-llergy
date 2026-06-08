# Directive: Chef Substitutions / "Can be modified" feature

## Goal
Let a venue tell diners that a dish — which otherwise contains an allergen and would be
excluded — **can be modified** to suit them, using the chef's own specific swaps and
removals. The app reads this data deterministically (no LLM at request time) and surfaces
matching dishes in a **"Can be modified for you"** results section.

## Where the data lives
A second tab named **Substitutions** inside the same menu Google Sheet (same
`GOOGLE_SHEET_ID`). The app fetches it via the public CSV export using the tab's `gid`,
configured as env var `GOOGLE_SUBSTITUTIONS_GID`.

- If `GOOGLE_SUBSTITUTIONS_GID` is unset/empty, the feature is dormant and the app behaves
  exactly as before (no "Can be modified" section).
- Cached in-memory for 10 minutes, same as the menu. Edits appear within ~10 min (or on redeploy).

To get the gid: open the Substitutions tab, look at the URL — `...#gid=123456789` — that number
is the gid.

## Tab schema (columns, exact headers)
| Column | Required | Meaning |
|---|---|---|
| `Dish` | yes | Must EXACTLY match a menu `Item` (case-insensitive, trimmed). Join key. |
| `Action` | yes | `Remove` or `Substitute` |
| `Ingredient` | recommended | The ingredient being removed / replaced out (shown to diner) |
| `Substitute` | substitute only | The replacement ingredient (leave blank for `Remove`) |
| `Solves` | yes | Allergen id(s) this modification makes safe — comma-separated |
| `Introduces` | substitute only | Allergen id(s) the substitute ADDS — comma-separated, blank if none |

One row = one modification. A dish can have multiple rows.

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
3. Paste the validated rows into a new **Substitutions** tab in the Kisa Google Sheet.
4. Grab the tab's `gid` and set `GOOGLE_SUBSTITUTIONS_GID` in `.env.local` (local) and Netlify
   (production), then redeploy.

## Files (code)
- `ai-llergy-webapp/src/lib/google-sheets.ts` — `fetchSubstitutionsFromSheets()` (reads the tab)
- `ai-llergy-webapp/src/lib/menu-service.ts` — `getSubstitutions()` (parse + 10-min cache, dish-keyed map)
- `ai-llergy-webapp/src/lib/substitutions.ts` — parsing, viability/conflict logic, instruction formatting
- `ai-llergy-webapp/src/lib/filter-menu.ts` — rescue step → `modifiableItems`
- `ai-llergy-webapp/src/app/api/submit/route.ts` — returns `modifiedItems`
- UI: `MenuResults.tsx`, `MenuItem.tsx`, `AccordionSection.tsx`, `globals.css` (seafoam section)

## Known limitations / future work
- Only dishes excluded by column-based allergens are rescued; AI/custom-tag exclusions are not.
- Not surfaced on the `/v/[slug]` Supabase venue pages (separate data path).
- No chef-dashboard editor yet — substitutions are edited directly in the Sheet.
