# Directive: Set Menu Builder

**Goal**: A standalone web app for group-booking set menus. The user picks a venue, a
set-menu tier, a guest count, and per-guest dietary requirements; the app builds a shared
set menu that scales to the party size (under the target spend-per-head) and works out which
dishes each allergic guest can safely eat — substituting within the same tier where possible.

This is a **separate product** from the allergen app (`ai-llergy-webapp`), but it reuses the
SAME data (one Google Sheet) and the SAME allergen logic. v1 is deliberately simple — no
creative cross-tier substitutions.

---

## 1. Architecture & deployment

- **Location**: `set-menu-builder/` (sibling to `ai-llergy-webapp/`). Next.js 16 + React 19 + TS
  + Tailwind v4. No Supabase / no Anthropic — the builder is fully deterministic.
- **Own nested git repo** `devesesam/set-menu-builder` (branch `master`), own Netlify site →
  **setmenu.ai-lergy.co.nz**. Mirrors how `ai-llergy-webapp` deploys. See
  `github_deployment.md` (now THREE repos).
- **Env**: `GOOGLE_SHEET_ID` = the SAME sheet the allergen app reads
  (`1xxS6NRa16fptx3c4CJ5-V6mp-yDIHDGb7RnLx03isaw`). Set it in Netlify and in
  `set-menu-builder/.env.local` for dev (gitignored).
- **Do NOT disturb** the allergen app, its Netlify site/env, the existing menu/subs tabs/gids,
  or the apex DNS. We only ADD set-menu tabs + a subdomain.

### Deployment checklist (first time)
1. `cd set-menu-builder && git init`, commit, create `devesesam/set-menu-builder`, push `master`.
2. New Netlify site from that repo (build `next build`, Next.js runtime, no `netlify.toml`).
3. Netlify env: `GOOGLE_SHEET_ID=<same as prod>`.
4. DNS: `CNAME setmenu → <new-site>.netlify.app`; add `setmenu.ai-lergy.co.nz` as a custom
   domain on the new site.

---

## 2. Data: one "Set Menu" tab per venue (shared Google Sheet)

Each venue gets a `<Venue> Set Menu` tab, stored **normalized** (one row per tier-dish):

`Tier | Tier Per Head | Dish | Dish Key | Qty | Price | Course | Notes`

- **Tier / Tier Per Head**: tier label + headline target spend per head (e.g. `38`).
- **Dish**: set-menu display name (verbatim from the venue).
- **Dish Key** *(safety-critical join)*: `normalizeDishName(menu dish name)` =
  `trim().toLowerCase()` of the matching MENU-tab dish. **Blank = allergen-unknown** (the dish
  is shown in the spread but NEVER marked safe for any allergy).
- **Qty**: portions in the base (4-person) spread (decodes `x2`/`+1` markers).
- **Price**: price for the listed Qty (as the venue listed it). Unit price = Price ÷ Qty.

Register the tab's gid as `setMenuGid` in `set-menu-builder/src/lib/venues.ts`. Until that is
set, `getSetMenu()` falls back to the **bundled CSV** in `src/data/set-menus/<slug>.csv`
(identical content) via `src/data/set-menus.generated.ts`.

### Ingesting the source spreadsheet
Run `python execution/ingest_set_menus.py`. It reads `resources/Mosaic Set Menu's*.xlsx` +
the LIVE menu tabs, decodes quantity markers, resolves each `Dish Key` against the live menu
names (curated alias map for tricky cases), and writes:
- `set-menu-builder/src/data/set-menus/<slug>.csv` — paste into the Sheet tab.
- `set-menu-builder/src/data/set-menus.generated.ts` — bundled dev fallback.
It prints a reconciliation report and validates each tier's `Σ Price` against the spreadsheet
`TOTAL` and `Σ Price ÷ 4` against `PER PERSON`.

### The Dish Key join (safety-critical) — uses `looseKey`, not exact match
The join uses an **explicit Dish Key** authored from the live sheet — never runtime fuzzy
matching. Both sides go through `looseKey()` (in `set-menu.ts`): lowercase + strip accents +
fold every dash variant (–, —, −) to "-" + collapse whitespace. So the Sheet's Dish Key can be
typed with plain ASCII hyphens and still match menu names that use en-dashes (and it survives
copy-paste encoding damage — see §8). A blank Dish Key = allergen-unknown (never marked safe).

### Dish-name reconciliation (drive blanks to zero)
Still UNRESOLVED (need chef confirmation), left blank = allergen-unknown:
- **Mr Go's**: `MUSHROOM 'XO' FRIED RICE` (is it "Vege Fried Rice"?), `CHILLI & COCONUT CHICKEN
  SALAD` (is it "Chicken Salad"?).
- **Ombra**: `Slow cook lamb…` (no lamb dish on the live Ombra menu tab).

RESOLVED: Kisa `URFA X2` → "Lamb Urfa Kebab" (confirmed by owner). `PITA/YUFKA` → "Pita" as a
representative (confirm if it matters for an allergy). All other dishes resolved by the
ingest's curated alias map.

To resolve a blank: confirm the matching menu dish with the chef, then set `Dish Key` =
`looseKey(that menu name)` — i.e. lowercase, plain hyphens, no accents (or add the dish to the
menu tab). Re-run the ingest, or edit the tab directly. **`GET /api/health` lists every
unresolved key and reads `ok:true` at zero.**

---

## 3. Builder algorithm (v2, deterministic) — `src/lib/build-set-menu.ts`

Inputs: `venue`, `tier`, `guestCount` G, `guests[]` (each = allergen IDs; **only guests with
dietary needs are submitted** — the rest of the party is assumed non-dietary). Loaded: set-menu
dishes + tier, `menuByKey` (tier allergen flags), `subsByDish`, and the **full à-la-carte menu**
(`getMenu`) as the candidate pool.

**Prices:** tier dishes use their real prices; any à-la-carte dish with no price uses
`DEFAULT_DISH_PRICE = $20` (placeholder until real menu prices exist — see §7).

**Step A/B — standard menu** (unchanged from v1): build the tier, scale portions for the party
under `totalBudget = tierPerHead × G` (`ceil(G/4)` cap per dish; `G ≥ 12` → estimate banner).

**Coverage metric (Tom's, 0–1, threshold 0.80):** for each submitted guest,
`coverage = min(1, ( Σ over dishes they can eat of  lineValue(dish) / eaters(dish) ) / tierPerHead)`.
`eaters` of a *shared* dish = `tableSize − (submitted dietary guests who can't eat it)` (so a
dish shared by the whole table dilutes value across everyone). A **dedicated** dish's eaters =
the guest(s) it's plated for → full value. "Can eat" = safe OR modifiable (substitution); NOT
excluded, caution, or allergen-unknown. Non-dietary guests can eat everything (incl. unknown).

**Optimiser (`optimiseForGuests`) — shared-first waterfall:**
1. **Phase 1 (shared):** while any dietary guest < 0.80, apply the best budget-feasible *shared*
   action — **add** an à-la-carte dish within budget headroom, or **swap** (reduce a dish the
   guest can't eat → fund one they can). Ranked by coverage-gain-per-dollar; coherence guard never
   pushes an already-covered guest back under. Shared dishes dilute (eaters = table), so this lifts
   guests only modestly — fine for mild/moderate restrictions.
2. **Phase 2 (dedicated, capped):** for guests still < 0.80, plate up to
   `MAX_DEDICATED_PER_GUEST = 2` **dedicated portions** (eaters = 1 → full value), swap-funded to
   hold price/head. A dedicated portion **may duplicate a dish already on the shared table** (a
   guest's own bowl of rice) — that's how it concentrates value. Stop at 0.80.
3. **Best-effort:** if a guest still can't reach 0.80 within budget/cap, keep the shared table and
   flag `coverage.bestEffort` + an honest recommendation. Never fabricate coverage.

**Badge:** "Covered · 0.84" (≥ 0.80) / "Best effort · 0.62". Determinism: explicit stable
tie-breaks (score → shared-before-dedicated → guests-helped → net cost → name); no reliance on
Map/Set iteration order. Same inputs → same output.

**Result shape:** `SharedDish.source = tier|added|dedicated` (+ `intendedFor` for dedicated);
`GuestResult.coverage` + `safe/modifiable(amber)/caution/excluded/unknown/dedicated` lists;
`BuildResult.optimiser {ran, actionsApplied, overBudget, allGuestsCovered}`.

---

## 4. API + screens

- **`POST /api/build`** `{venue, tier, guestCount, guests:[{id, allergens[]}]}` → `{venue, tier,
  budget, sharedMenu[] (with source/intendedFor), guests[] (with coverage + dish lists),
  warnings[], meta, optimiser}`. 400 on unknown venue/tier.
- **`GET /api/health`** — per-venue data diagnostics: source (sheet/bundled), per-tier
  count/total/per-person, and **unresolvedDishes** (drive to zero before launch). `ok:true`
  when zero unresolved.
- **Screens**: `/` venue picker → `/<venue>` builder (tier chips, guest stepper, per-guest
  dietary rows) → `BuiltMenuResult`, which has a **"Guest view" ↔ "Kitchen docket"** toggle:
  - *Guest view* — summary stats, shared table (with "added"/"dedicated for Guest N" badges),
    a "Dietary additions" card, and per-guest panels (coverage badge + made-for-them / can-eat /
    with-modification / not-suitable / no-data lists).
  - *Kitchen docket* — decisive, no working notes: **Set Menu** (dish ×qty), **Dietary dishes**
    (dedicated, "for Guest N"), **Dietary orders** per guest (plate / modify / do-not-serve).
  Both print-friendly.

---

## 5. Copied-lib sync obligation (drift risk)

These files are COPIES of `ai-llergy-webapp/src/lib/` (header comment in each). If the allergen
app changes them, **re-sync**:
- **`allergens.ts`** — the allergen ID → Sheet column map. MUST stay identical or safe/unsafe
  verdicts diverge from the live menu.
- **`substitutions.ts`** — parsing + `normalizeDishName` (also the set-menu JOIN key).
- `google-sheets.ts`, `menu-service.ts`, `filter-menu.ts` are ported/trimmed (AI + confidence
  paths dropped). Less churn-prone but keep the column logic aligned.
A future improvement is extracting these into a shared package; out of scope for v1.

---

## 6. Verification

- `cd set-menu-builder && npm run build` passes; `npm run start` then `POST /api/build`:
  - **No-dietary** → optimiser no-ops; menu identical to the scaled tier.
  - **Moderate** (Mr Go's `44`, G=4, gluten+dairy) → covered ~0.83 via shared swaps, **0 dedicated**.
  - **Heavy** (Mr Go's `44`, G=4, 7 allergies) → 2 **dedicated** portions, covered ~0.86, price/head ≤ $44.
  - **Multi-guest** (Kisa `68`, G=8, vegan + gluten/dairy) → both covered, ≤ budget.
  - Amber substitutions show real venue swaps for all three venues; same request twice → identical.

---

## 7. Status & roadmap

- **v2 — Live.** Deployed to Netlify (`devesesam/set-menu-builder` → setmenu.ai-lergy.co.nz),
  tested across all three venues. Set-menu tabs wired in `venues.ts` (kisa `395901294`,
  mr-gos `1707387833`, ombra `321541246`); substitution tabs now wired for all three
  (kisa `1265271651`, mr-gos `1639397504`, ombra `1976184234`). Mr Go's dish keys all resolved.
- **v2 delivered (per Tom's brief, "Phase A"):** full-menu **dietary optimiser** (shared-first
  waterfall → capped dedicated portions → best-effort), **Tom's 0–1 coverage score** (0.80
  threshold), and a **kitchen-docket** view. Replaces v1's tier-only fair-share.
- **⚠ Prices are a $20 placeholder.** Full à-la-carte menu prices are empty, so any dish the
  optimiser pulls in is costed at `DEFAULT_DISH_PRICE = $20`. Budget math + coverage are
  directionally right but not exact until real prices are added to the menu tabs' `Price` column
  (then remove/relax the placeholder in `build-set-menu.ts`).
- **Open**: real menu prices (above); chef to confirm the remaining Ombra `Slow cook lamb`
  Dish Key (§2); confirm Netlify `GOOGLE_SHEET_ID` + `setmenu` DNS.
- **Roadmap (Phase B / later)**: interactive drag-drop editor (two panels, live totals, per-guest
  green/amber/red/grey grid), course grouping/dessert handling, saved bookings, >2 dedicated,
  extracting copied libs into a shared package (§5).

---

## 8. Known issues & fixes

- **Copy-paste mojibake of en-dashes (FIXED via `looseKey`).** Pasting the Ombra CSV into
  Google Sheets mangled en-dashes (`–`) into `â€“` (UTF-8 read as Windows-1252), so those Dish
  Keys stopped matching the menu tab → dishes wrongly became allergen-unknown. Fix: the join
  now runs both sides through `looseKey()` (dash/accent-insensitive), and the ingest writes
  clean ASCII keys (plain hyphens). If it recurs: re-paste the clean keys from
  `src/data/set-menus/<slug>.csv` (a column-wide find-replace of the mangled string also
  works), then check `GET /api/health`.
- **Live menu drifts from the root CSVs.** The root `*_menu.csv` files are stale snapshots; the
  ingest resolves Dish Keys against the **live** sheet tabs, not those CSVs. Always re-run the
  ingest against live data (it fetches the menu tabs by gid).
- **Setting `setMenuGid` makes the app trust the Sheet over the bundle.** If a tab is empty the
  app falls back to the bundle, but if a tab is half-populated/mangled the app uses that. Use
  `/api/health` (source = sheet/bundled) to see what each venue is actually reading.
- **`source: "bundled"` in `/api/health`/`/api/build` means a gid is missing or the tab is
  empty** — expected only before a venue's tab exists; otherwise investigate the gid.
