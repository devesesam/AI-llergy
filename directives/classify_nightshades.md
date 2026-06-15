# Directive: Classify Nightshades (NIGHTSHADE FREE column)

**Goal**: Populate the `NIGHTSHADE FREE` column of the Kisa menu Google Sheet
with `YES`/`NO` for every dish, derived from each item's ingredient list.

**Created**: v4.5 (2026-06-11)

## 1. When to use

- A new `NIGHTSHADE FREE` column was added and needs filling.
- The menu changed (new dishes, edited ingredients) and the column needs a refresh.
- Auditing/spot-checking the existing nightshade values.

## 2. Tool

| Item | Value |
|------|-------|
| Script | `execution/classify_nightshades.py` |
| Inputs | None (reads the sheet via public CSV export; `SHEET_ID` is hard-coded in the script) |
| Output | `.tmp/nightshade_free_AB.txt` — one `YES`/`NO` per data row, in sheet order |
| Run | `python execution/classify_nightshades.py` |
| Deps | `requests` (already used by `migrate_gsheet_to_supabase.py`) |

## 3. Meaning of the values

- `YES` = the dish is **free of** nightshades (safe for a nightshade avoider).
- `NO` = the dish **contains** a nightshade ingredient.

This matches the `* FREE` convention of every other allergen column, so the
existing `filterMenu()` logic works unchanged (`YES` passes, `NO` excludes).

## 4. Classification logic

Scan the lowercased `Ingredients` text for nightshade indicators:

**Counts as a nightshade**: tomato, capsicum, eggplant/aubergine, paprika,
cayenne, pimento, tomatillo, goji, chili/chilli, aleppo (pepper/chili),
red/green/yellow/bell/sweet/tinned pepper, **potato**.

**Explicitly NOT nightshades** (stripped before scanning to avoid false hits):
`black pepper`, `white pepper`, `peppercorn(s)` (these are *Piper*, not capsicum);
`sweet potato` / `kumara`.

**Sanity guard**: if the sheet already has `CAPSICUM FREE = NO` or
`CHILI FREE = NO` for a row, the item definitely contains a nightshade, so the
result is forced to `NO`. Any row where the columns imply a nightshade but the
ingredient scan found none is printed under a `[review]` heading for a human to
eyeball (none at time of writing).

> **Judgement calls worth knowing**: paprika, cayenne and Aleppo pepper are
> capsicum-derived and DO count as nightshades — so some dishes marked
> `CAPSICUM FREE = YES` still come out `NIGHTSHADE FREE = NO`. Sumac, black
> pepper and kumara are NOT nightshades.

## 5. How to apply the output

Because the project has **no Google write credentials** (the app only ever
*reads* the sheet via public CSV export), the script does not write cells. Apply
the result manually:

1. Run the script.
2. Open `.tmp/nightshade_free_AB.txt`.
3. In the sheet, click cell **AB2** (first data row) and paste the column. Values
   are in exact row order.

## 6. Limitations / future work

- **No write-back**: To enable direct sheet writes, add a Google service-account
  JSON, share the sheet with its email, and extend the script with `gspread`.
  Until then, applying values is a manual paste.
- **Keyword-based**: New nightshade ingredients not in the keyword list will be
  missed. Update `NIGHTSHADE_KEYWORDS` / `SAFE_PHRASES` in the script as the menu
  evolves, then re-run.
- **Sheet ID is hard-coded** in the script (`SHEET_ID`). If the source sheet
  changes, update it there (and in `ai-llergy-webapp/.env.local` → `GOOGLE_SHEET_ID`).

## 7. Related

- `directives/allergen_management.md` — `nightshades` allergen definition (§3), form layout (§5)
- `directives/backend_menu_filter.md` — how columns drive filtering
- `directives/known_issues_and_fixes.md` — FEATURE-003
- `execution/migrate_gsheet_to_supabase.py` — same CSV-export read pattern
