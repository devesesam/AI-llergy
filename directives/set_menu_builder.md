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

### Dish-name reconciliation (drive blanks to zero before launch)
The join uses an **explicit Dish Key** authored from the live sheet — never runtime fuzzy
matching (a safety-critical lookup). Currently UNRESOLVED (need chef confirmation), so left
blank = allergen-unknown:
- **Mr Go's**: `MUSHROOM 'XO' FRIED RICE` (is it "Vege Fried Rice"?), `CHILLI & COCONUT CHICKEN
  SALAD` (is it "Chicken Salad"?).
- **Ombra**: `Slow cook lamb…` (no lamb dish on the live Ombra menu).
- **Kisa**: `URFA X2` (ambiguous: "Lamb Urfa Kebab" vs "Lamb Urfa (Lunch Plate)").
  Also `PITA/YUFKA` was mapped to "Pita" as a representative — confirm.
To resolve: confirm the matching menu dish with the chef, then set `Dish Key` =
`normalizeDishName(that menu name)` (or add the dish to the menu tab). Re-run the ingest, or
edit the tab directly. **`GET /api/health` lists every unresolved key.**

---

## 3. Builder algorithm (v1, deterministic) — `src/lib/build-set-menu.ts`

Inputs: `venue`, `tier`, `guestCount` G, `guests[]` (each = allergen IDs). Loaded: set-menu
dishes + tier, `menuByKey` (allergen flags), `subsByDish` (substitutions).

- **Budget**: `totalBudget = tierPerHead × G`. Base spread = all tier dishes (designed for 4);
  unit price = Price ÷ Qty.
- **Step A** — base spread at base portions.
- **Step B — party scaling**: `G < 4` keep base (warn if base cost > budget); `G > 4` add
  portions of highest-unit-price dishes first while `runningCost + unitPrice ≤ totalBudget`,
  capped at `basePortions × ceil(G/4)` per dish; `G ≥ 12` → still estimate, plus a
  "pre-arrange with the venue" banner.
- **Step C — per-allergy guest**: run the ported `filterMenu` over the tier's matched menu
  items → safe / caution (CAN BE) / modifiable (subs rescue) / excluded. A dish with no menu
  match is **allergen-unknown** and never safe.
- **Step D — fair share**: `accessiblePerHead = Σ base price(safe ∪ modifiable) ÷ 4` vs the
  tier target. Adequate at ≥ 85%. (A guest with NO allergens counts ALL dishes, including
  allergen-unknown ones.)
- **Step E — same-tier rescue**: E.1 substitution rescue is folded into Step C. **E.2 from the
  original plan (bump a safe dish's qty for an under-served guest) is intentionally NOT done**:
  within a fixed tier it only duplicates a dish — it adds volume (already handled by Step B) but
  cannot improve which distinct dishes a guest can access, so it would mislead. E.3 → if still
  under-served, return an honest recommendation. It only suggests a different tier when a
  HIGHER tier actually adds a dish the guest can eat (checked via `analyzeTierForGuest` across
  all tiers); otherwise it recommends a dedicated dish. Never fabricate a menu.
- **Fair-share badge**: "Fair share met" (≥85% of target) / "Below fair share" — framed on
  spend, not dish count (a guest can eat most dishes yet still be below the spend target).

Deterministic: ties broken by unit price desc then name. Same inputs → same output.

---

## 4. API + screens

- **`POST /api/build`** `{venue, tier, guestCount, guests:[{id, allergens[]}]}` → `{venue, tier,
  budget, sharedMenu[], guests[], warnings[], meta:{estimateOnly, source}}`. 400 on unknown
  venue/tier.
- **`GET /api/health`** — per-venue data diagnostics: source (sheet/bundled), per-tier
  count/total/per-person, and **unresolvedDishes** (drive to zero before launch). `ok:true`
  when zero unresolved.
- **Screens**: `/` venue picker → `/<venue>` builder (tier chips, guest stepper, per-guest
  dietary rows reusing the allergen chips) → `BuiltMenuResult` (shared table + per-guest
  panels + warnings; print-friendly).

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

- `cd set-menu-builder && npm run build` passes; `npm run dev` then:
  - `GET /api/health` → tier totals match the spreadsheet; unresolved count = the known 4
    until the chef confirms them.
  - `POST /api/build` Mr Go's `38`, G=4, no allergens → 8 dishes, per-head ≈ $35.63.
  - G=6 → portions added, spread ≤ $228.
  - G=4 + a guest `["gluten","dairy"]` → safe list only, fair-share short → honest
    recommendation; Kisa shows substitutions where the chef has them.

---

## 7. Status & roadmap

- **v1 — Built (Local).** App scaffolded, builds clean, all endpoints tested against the live
  sheet using the bundled set-menu data. Set-menu tabs not yet created in the Sheet
  (`setMenuGid` undefined → bundled fallback). Not yet deployed.
- **Next**: (1) chef confirms the 4 unresolved dish names; (2) create the 3 Sheet tabs from the
  CSVs and set `setMenuGid`; (3) first deploy + subdomain; (4) optional: Course grouping,
  dessert handling, per-venue branding.
