# Menukey workspace — agent instructions

Menukey (formerly AI-lergy) is a pair of small Next.js apps for **Mosaic Venues** (Tom) built around a
single shared **Google Sheet** of per-venue menus and allergen flags:

| App | Folder | Live at | Deploys from |
|---|---|---|---|
| **Allergen menu** — a diner picks allergens, sees what they can eat (+ chef substitutions) | `ai-llergy-webapp/` | https://menukey.co.nz (`/kisa`, `/mr-gos`, `/ombra`) | GitHub `devesesam/ai-llergy-webapp`, branch `master` → Netlify |
| **Set Menu Builder** — staff plan a group booking: tier + guest count + per-guest dietaries → costed shared menu + kitchen docket | `set-menu-builder/` | https://set.menukey.co.nz | GitHub `devesesam/set-menu-builder`, branch `master` → Netlify |

Venues: Kisa (the original test venue), Mr Go's, Ombra. Old `ai-lergy.co.nz` hosts 301 to the new domains.
No domain is hardcoded anywhere — don't add one.

## The three git repos (read this before any git command)

- `ai-llergy-webapp/.git` and `set-menu-builder/.git` are **nested, independent repos**. Pushing their
  `master` is what deploys. Always `git remote -v` first; if it shows `AI-llergy.git` you are in the
  wrong directory.
- The **outer** repo (this folder, `devesesam/AI-llergy`, branch `workspace`) holds `directives/`,
  `execution/`, `resources/`, `archive/` and this file. It deploys nothing. **Both app folders are
  gitignored here — never `git add` them into the outer repo.** (Until Sept 2026 it carried a stale copy
  of the webapp; that was removed. History keeps it.)
- "Push all changes" = commit the relevant app repo(s) **and** the outer repo. Avoid `git add .` at the
  root; stage folders explicitly.
- Full detail + known Windows/PowerShell gotchas: `directives/github_deployment.md`.

## Data: the Google Sheet is the only source of truth

- One sheet, one tab per venue for the menu (`<Venue>` tab: Item, Ingredients, Price, `Include in set
  menu`, `Set menu priority`, optional `<Allergen> Priority`, then one YES/NO/CAN BE column per allergen),
  one `<Venue> Substitutions` tab, and one `<Venue> Set Menu` tab for the builder. Tab gids live in each
  app's `src/lib/venues.ts`.
- The sheet **ID lives only in `.env.local` / Netlify env** (`GOOGLE_SHEET_ID`). Never paste an ID from
  docs or history into code or scripts — an old sample sheet exists and reads plausibly but stale.
- Data quality: `GET /api/health` on the builder reports unresolved `Dish Key`s (a set-menu dish that
  no longer matches the menu tab becomes "no allergen data" and is never treated as safe). Drive it to
  zero after any sheet rename. Schema/column rules: `directives/google_sheet_data_source.md`.
- Supabase and the chef dashboard are **retired** (chefs preferred the sheet). Code and docs are in
  `ai-llergy-webapp/_archive/` and `directives/archive/`; don't resurrect them without asking.

## Code layout that matters

- Allergen engine (both apps): `src/lib/allergens.ts` (id ↔ sheet column), `filter-menu.ts` (YES/NO/CAN
  BE + substitution rescue), `substitutions.ts`, `menu-service.ts` (sheet fetch + 10-min cache).
  **`allergens.ts` and `substitutions.ts` are COPIED from the webapp into the builder — keep them in
  sync and run `python execution/check_lib_sync.py` after touching either.** The builder's
  `menu-service.ts` intentionally diverges (extra set-menu columns).
- Builder core: `set-menu-builder/src/lib/build-set-menu.ts` (tier scaling + dietary optimiser),
  `coverage-core.ts` (Tom's coverage metric, shared by server and browser — change it in one place),
  `allocation-rules.ts` (Kisa per-guest bread/skewer/borek rules), `components/BuiltMenuResult.tsx`
  (draft editor, kitchen docket, waiter card). Spec + history: `directives/set_menu_builder.md`.
- Invariants the builder must never break: the party budget is a **hard cap**; **every** guest
  (dietary and not) is held to their coverage threshold or explicitly flagged "Needs review"; a base
  set-menu dish is never dropped below 1 portion; allocation-rule lines are never changed by the
  optimiser; output is deterministic.
- `globals.css` in either app: **append only**, never rewrite (multiple screens share it).

## Execution scripts (`execution/`) — use them, don't redo the work by hand

| Script | When |
|---|---|
| `set_menu_battery.py` | After ANY builder change. `cd set-menu-builder && npm run build && npm run start`, then `python execution/set_menu_battery.py --compare execution/battery_baseline_<latest>.json`. Asserts every invariant above across ~95 scenarios and prints the delta vs the last baseline. `--base https://set.menukey.co.nz` to check production; `--snapshot` to record a new baseline once a change is accepted. |
| `check_lib_sync.py` | After touching `allergens.ts` / `substitutions.ts` in either app. Exit 1 = drift. |
| `ingest_set_menus.py` | Re-ingest Tom's set-menu spreadsheet into the normalised per-venue CSVs / bundled fallback. |
| `validate_substitutions.py` | Validate a chef's substitutions CSV before it goes into the sheet. |
| `classify_nightshades.py` | Fill the NIGHTSHADE FREE column from ingredients. |

Scripts are deterministic Python 3.11, no LLM calls, stdlib only. Intermediate files go in `.tmp/`
(gitignored). On Windows set `PYTHONIOENCODING=utf-8` when output has emoji.

## How to work here

1. Read the relevant directive before changing behaviour; they are the spec. Update the directive with
   what you learn (constraints, edge cases, decisions) in the same change — but don't create or discard
   directives without asking.
2. Verify like this: `npm run build` → `npm run start` → battery (builder) or a manual smoke of
   `/kisa` + `POST /api/submit` (webapp) → push → re-check the live URL. Report what you actually ran.
3. Tom's feedback arrives in numbered phases (builder is at Phase K/L). Each phase gets a ⚠ block in
   `set_menu_builder.md` and a memory note; earlier blocks are history, the latest is the authority.
4. Ask before anything hard to reverse: deleting Netlify sites/env vars, rewriting sheet tabs, force
   pushes, changing thresholds or the coverage metric.

## Data hygiene Tom knows about (no action unless asked)

Kisa `Ezmesi` has no price (excluded from the builder); Kisa tiers 68/78 list BOREKS at $19.50 (the
builder bills $5/borek, so a 4-top shows $20); the `Set menu priority` numbers are Sam's placeholders
until the chefs rank dishes.
