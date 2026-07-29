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
  **set.menukey.co.nz**. Mirrors how `ai-llergy-webapp` deploys. See
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
4. DNS: `CNAME set → <new-site>.netlify.app`; add `set.menukey.co.nz` as a custom
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

**Prices:** the menu tabs are priced, so à-la-carte candidates use their real prices. A dish with
**no price is excluded from consideration** (`isPriced` filter) — never added, dedicated, or shown
(e.g. Kisa's Ezmesi). No placeholder price. Tier dishes are always priced from the set-menu tab.

**"Include in set menu" flag (opt-in auto-populate).** Each venue's MAIN menu tab has an **"Include
in set menu"** column (YES/NO; **blank ⇒ NO**), parsed into `MenuItem.includeInSetMenu`
(`menu-service.ts` `readIncludeInSetMenu`, tolerant header match, only exact "YES" ⇒ true). The
**optimiser's auto candidate pools are gated on this flag** — `candidateItems` (Phase 1 shared adds)
and the Phase 2 dedicated candidates both require `item.includeInSetMenu`. This keeps **desserts (all
venues) and Kisa "lunch plates" out of every auto-generated draft** (standard + dietary). They are
**still manually addable** — `buildCatalog` and the tier build are NOT gated, so the full priced menu
(incl. desserts/lunch plates) still appears in the editor dropdowns. ⚠ Because blank ⇒ NO, the column
**must be populated with YES on every set-menu-eligible dish** or the optimiser has nothing to
auto-add; the flag is safe for the allergen app (it ignores unknown columns).

**Step A/B — standard menu** (unchanged from v1): build the tier, scale portions for the party
under `totalBudget = tierPerHead × G` (`ceil(G/4)` cap per dish; `G ≥ 12` → estimate banner).

**Coverage metric (Tom's, 0–1, SPLIT threshold — 0.90 non-dietary / 0.85 dietary):** for each guest,
`coverage = min(1, ( Σ over dishes they can eat of  lineValue(dish) / eaters(dish) ) / tierPerHead)`.
`eaters` of a *shared* dish = `tableSize − (submitted dietary guests who can't eat it)` (so a
dish shared by the whole table dilutes value across everyone). A **dedicated** dish's eaters =
the guest(s) it's plated for → full value. "Can eat" = safe OR modifiable (substitution); NOT
excluded, caution, or allergen-unknown. Non-dietary guests can eat everything (incl. unknown).
**Threshold is per-guest (`thresholdFor(isDietary)` in `coverage-core.ts`):**
- **Non-dietary → 0.90** (the ~10% is the tier's built-in margin — Tom's figure; also the intended
  "fill the table properly" level). A non-dietary guest is "under-covered" whenever the *table itself*
  is under-filled, so the optimiser fills the table to ≥ 0.90/head **by definition** — no top-up step.
- **Dietary → 0.85.** The even-split metric **under-counts** a restricted guest: they eat more of
  their few safe dishes than a `1/eaters` share (they skip everything else), so their true
  satisfaction is higher than the score shows. The lower bar compensates for that shared-dish
  dilution (rather than a made-up consumption multiplier). Non-dietary guests can eat everything → the
  most alternatives → never the under-counted one (conservation: whatever the metric under-credits a
  restricted guest, it over-credits the unrestricted ones), so their bar stays at 0.90. Net effect:
  the optimiser stops topping dietary guests up sooner → fewer dedicated/added dishes for them, less
  over-catering. (Decided with Tom after he noted dietary guests naturally take more of what they can
  eat; modelling that per-guest is arbitrary, so we moved the pass-line instead.)

**Optimiser (`optimise`) — priority ladder (each guest to THEIR threshold). Tom's rule (Phase E):
prefer an extra of an on-menu dish the guest eats SAFELY, then off-menu SAFE, and a MODIFIED dish is
the absolute last resort.** Every candidate `Action` carries a **`tier`** (primary sort in `pickBest`,
below score): Phase 1 keeps looping while any guest is under their threshold, gathering:
- **Tier 0 — on-menu safe extra** (`onMenuSafeExtraActions`): a **dedicated portion of a dish already
  on the set menu** that an under-covered *dietary* guest eats **safely** (`safeKeys`, not merely
  modifiable). Full value to that guest; scoped to dietary need (all-non-dietary drafts are unchanged);
  capped by `MAX_DEDICATED_PER_GUEST`; picks a *different* safe dish for a 2nd extra (variety). We first
  tried a shared qty **bump** per Tom's read of "a whole extra dish", but a bump dilutes across all
  eaters → in testing it spent the whole budget inching one guest up while over-catering everyone, so a
  dedicated portion is used (mechanism isolated in that one helper). Off-menu-gutting is avoided — the
  standard tier stays intact.
- **Tier 1 — off-menu safe:** the existing off-menu shared **add** / **swap** (`candidateItems`) when
  ≥1 under-covered guest eats it **safely** (`safeHelps`) — this also covers non-dietary table-fill
  (they eat everything safely).
- **Tier 2 — modified, last resort:** an add/swap whose only benefit to a dietary guest is via a
  **modifiable** dish. Chosen only when no Tier-0/1 action helps.

**Phase 2 (dedicated, capped) — the concentrator fallback** for *dietary* guests still < 0.85 that
Phase 1 couldn't cover: plate up to `MAX_DEDICATED_PER_GUEST = 2` dedicated portions (eaters = 1 → full
value), swap-funded; within it, **prefer a dish the guest eats safely (tier 1) over a modifiable one
(tier 2)**. May duplicate a shared dish. Stop at 0.85. **Best-effort:** still short within budget/cap →
keep the table, flag `coverage.bestEffort` + honest recommendation. Never fabricate coverage.

**Badge:** "Covered" once a guest is ≥ their threshold (0.90 / 0.85) / else "Best effort · 0.8x"
(`GuestResult.coverage.threshold` carries the per-guest bar). Determinism: explicit stable tie-breaks
(**tier → score → kind (bump/add/swap/ded) → guests-helped → net cost → name**); no reliance on
Map/Set iteration order. Same inputs → same output.

> **⚠ Phase F (current) supersedes the "prefer safe" wording above — read this.** The optimiser now
> **drives off SAFE coverage** (`toCoverageGuest` uses `safeKeys`, not `canEat`): a dietary guest "can
> eat" a dish only if it's *safe* for them, so a modifiable dish never raises coverage and is never
> added for coverage. The optimiser feeds each dietary guest **real safe food** (dedicated safe plates,
> **shared** between same-restriction guests, `MAX_DEDICATED_PER_GUEST = 4`) — **flexing the tier** to
> fund it (trims dishes the guest can't eat) — until their **safe** coverage hits threshold, or it runs
> out of room. **Modifications are the waterfall's last rung:** they only count (and show) for a guest
> that couldn't be safe-covered, and then they're genuinely served. The **shown score is EFFECTIVE**:
> `safe` coverage if we safe-covered them (mods dropped), else `full` (`safe ∪ modifiable`, mods
> served) — computed in `buildGuestResult` (server) and `liveCoverage` (client) from `safeNum`/`fullNum`
> so **the number always matches the final served menu** (no "count-then-hide" — a hard requirement
> from Sam). The client derives safe keys as `menuAccess.canEat` **minus** `modInstr` keys and
> **suppresses MODIFY notes** (docket + waiter + draft) for guests it safe-covered; the waiter card
> treats a safe-covered guest as NOT eating dishes they'd only take modified.
>
> **Irreducible trade-off (measured, documented so nobody "fixes" it):** to feed a restricted guest
> near budget the tool MUST reallocate budget from standard dishes they can't eat → so **you cannot**
> have all of {fewer mods, fewer off-menu adds, standard tier untouched} at once. Protecting the tier
> was tried and **starves restricted guests** (0.38–0.61 best-effort — a party of 4 has no scaled
> excess to reclaim). Decision (Sam): **feed the guests, let the tier flex.** Cost: big near-budget
> parties get a busier, more à-la-carte menu (standard dishes trimmed); a genuinely un-feedable guest
> (e.g. 7 allergies at a meat venue) reads honestly as best-effort with the mods they need.

> **⚠ Phase G (current) — keep the draft ON THE BASE SET MENU (Tom: "first draft ≈ 95% of final").**
> The team saw off-menu à-la-carte dishes added for dietary guests when the base set menu already had
> dishes they could eat. Two bugs caused it: (a) a **no-repeats variety guard** (Phase 1 tier-0 + Phase
> 2 `dedForG`) refused a *second* portion of the same on-menu dish, so coverage fell through to off-menu;
> (b) **Phase 2 stamped every safe dish `dedTier = 1`**, so an on-menu and an off-menu dish tied. Fixes:
> - **On-menu dishes now REPEAT freely** (both guards removed). A dietary guest gets as many dedicated
>   portions of the same on-menu safe dish as needed — repeats self-limit (each survives only if it adds
>   coverage; the loop stops at threshold). `MAX_DEDICATED_PER_GUEST = 12` is now a generous runaway
>   backstop only; the real limiters are the coverage-threshold stop + budget guard. `MAX_ITERATIONS = 120`.
> - **On-menu strictly beats off-menu everywhere.** Phase 2 tags a candidate already on the base menu
>   `dedTier = 0` (off-menu = 1). Two new Phase-1 tier-0 helpers keep table-fill on the base menu:
>   `onMenuSharedBumpActions` (bump an on-menu shared dish's qty — mainly re-covers a non-dietary guest
>   after a swap) and `onMenuSwapBumpActions` (**near-budget only**: reduce a dish the dietary guests
>   can't eat → serve one MORE portion of an on-menu dish they can, instead of adding off-menu). The
>   swap-bump is gated to `nearBudget` (no plain on-menu add fits) so it doesn't shrink the table and
>   bank the budget — while headroom exists we spend it on on-menu dishes, keeping the table full.
> - **Ranked replacements (`MenuItem.setMenuPriority`, `readSetMenuPriority`).** A single **"Set menu
>   priority"** column on each venue's MENU tab (lower = preferred; blank ⇒ `UNRANKED_PRIORITY`, sorts
>   last). It orders the **off-menu fallback only** — `candidateItems`/Phase-2 sorts and a `pickBest`
>   tiebreak *after* tier (on-menu extras carry the neutral UNRANKED so it never reorders them). A single
>   column acts "within each allergy category" automatically, because a guest is only offered dishes they
>   can safely eat. Inert until the sheet has the column.
> - **`pickBest` sort is now:** tier → **priority** → score → typeRank → helped → netCost → name.
> - **Result (verified, Kisa/Mr Go's/Ombra):** dietary parties covered with **zero off-menu dishes** —
>   the draft is the base tier + repeated on-menu portions/extras, near budget, deterministic. Off-menu
>   is now only reachable when the base menu genuinely has no safe dish for a guest (then priority-ranked).
>
> **UI (Phase G):** the "Set Menu draft" card is split into **Base set menu** (shared dishes + dedicated
> extras OF a base dish, grouped under it as "extra for …") and **Dietary-specific dishes** (dedicated
> plates NOT on the base menu; shown only when non-empty) — `BuiltMenuResult.tsx`, partitioned on the
> ORIGINAL `menu` index so steppers stay correct. Printed dockets unchanged (on-screen only).

> **⚠ Phase H (current) — hold EVERY guest to threshold; protect the base set menu; allow bounded
> over-budget.** Two issues in the Phase-G results drove this: (a) near budget the optimiser could
> **drop a base-tier main** (e.g. Kisa Short Rib) to fund dietary coverage; (b) it could land **under
> budget / under-deliver** because **only the *submitted* dietary guests were held to threshold** — the
> non-dietary majority entered only via `tableSize`/`eaters`, never checked, so once the dietary guests
> passed 0.85 the optimiser stopped even if the table had shrunk. Fixes:
> - **Track the whole party.** `buildSetMenu` adds ONE representative **non-dietary** guest
>   (`buildGuestAccess("__party__", …, [])`) to the optimiser's `coverageGuests` when
>   `guestCount > submitted` — so the optimiser lifts the non-dietary rest to 0.90 too (fills an
>   under-full table). It's exact (non-submitted guests are identical; a shared add lifts them equally;
>   non-dietary ⇒ doesn't change `eaters`). **Never a result row** — assembly + reported scores still use
>   the real `access` only.
> - **Protect the whole base set menu.** The three `withReduced` swap sites (Phase-1 swap, Phase-2
>   swap-funded dedicated, `onMenuSwapBumpActions`) now **skip `source === "tier"` dishes** — the base
>   tier is never trimmed. Dietary coverage is **added on top** instead. (No course data exists to single
>   out "mains", so the whole tier is protected — which also satisfies "don't go below the minimums".)
> - **Bounded over-budget.** `BUDGET_OVERAGE = 0.10`; `budgetCeiling = totalBudget × 1.10`. Every
>   optimiser add/bump/swap guard uses `budgetCeiling` (Step B party-scaling still fills the base to
>   `totalBudget`). A guest still short at the ceiling → honest best-effort. `optimise` returns a
>   **truthful `overBudget`** (`spend > totalBudget`); the client already shows an "over per head" tile.
> - **Net trade-off:** dietary parties now typically run a little over the target (the full set menu is
>   kept AND everyone is fed), surfaced to the planner — vs the Phase-G behaviour of trimming the tier /
>   under-filling. **Verified** — 18-run battery (6 scenarios × 3 venues, party 4–10): **no tier dish
>   ever dropped**, **spread ≤ 1.10×budget** always, every guest **covered or honest best-effort**,
>   deterministic, off-menu near-zero. Kisa Case A now keeps Short Rib and covers both guests (0.94/0.91)
>   at +10%, vs Phase-G dropping Short Rib at $434. Hard guests (7-allergy, vegan, dairy+eggs at an
>   Italian venue) are honest best-effort at/near the ceiling.

> **⚠ Phase I (current) — per-dish cap on dedicated portions.** The Phase-H battery showed a hard guest
> could be covered by many portions of ONE cheap dish plated individually for them (Jasmine Rice ×9 for a
> 7-allergy guest, Rocket salad ×7 for dairy+eggs) — those are per-guest *dedicated repeats*, not shared.
> Unrealistic ("nobody eats 7 bowls of rice") and cluttered the docket. Fix: **`MAX_SAME_DISH_PER_GUEST
> = 3`** + helper `dedCountForDish(working, guestId, dishKey)`, gating the two dedicated-creation sites
> (`onMenuSafeExtraActions` intendedFor filter + the Phase-2 candidate filter). A guest gets **≤3 of any
> one dish**; **different** dedicated dishes stay unlimited (`MAX_DEDICATED_PER_GUEST = 12` is now a pure
> runaway backstop); **no per-table cap** (shared dishes uncapped). Optimiser-only — the editor's manual
> "＋ just for them" is a human override. **Verified** (re-run battery): no dish >3× for any guest;
> determinism + tier-protection + ceiling intact. **Trade-off (makes coverage HONEST):** where a
> guest's Phase-H score was propped up by repetition it now drops — Mr Go's 7-allergy 0.74→0.36 (can only
> eat rice; 3 is the realistic max → staff handle manually), Ombra gluten+garlic **0.98→0.78 (covered →
> best-effort)** because Ombra genuinely lacks GF variety (menu-data gap). Well-covered venues (Kisa,
> easy cases) unchanged. If the cap feels too tight on constrained menus, it's a one-constant bump.

> **⚠ Phase J (current) — HARD budget cap, 1× set-menu floor, per-category priorities, status labels.**
> Tom's round-4 feedback. Four changes:
> - **The budget is now a HARD cap.** `BUDGET_OVERAGE` is **deleted** — the tool must never exceed the
>   customer's stated budget (`budgetCeiling = totalBudget`; Step B unchanged). `optimise` still returns a
>   truthful `overBudget` (now ~always false unless the base tier itself exceeds budget for a small party).
> - **Dietary coverage is funded by REALLOCATION, floored at 1×.** Phase H's blanket tier protection is
>   replaced by **`MIN_TIER_DISH_QTY = 1`**: a base set-menu dish MAY be reduced to pay for dietary
>   dishes but **never below 1 portion**, so no set-menu dish ever drops off the draft (Tom's "don't drop
>   the short rib"). Applied at all three `withReduced` sites.
> - **Per-dietary-category priorities, applied to ON-MENU increases.** `MenuItem.priorityByAllergen`
>   (`readPriorityByAllergen`) reads **"<Allergen> Priority"** columns (tolerant: "Gluten Priority",
>   "GLUTEN FREE Priority", "Egg Priority" → `eggs`, …); the old single **"Set menu priority"** is the
>   general fallback. `priorityFor(item, guests)` = best (lowest) rank across those guests' allergens,
>   else general, else unranked. **Now applied to on-menu extras/bumps too** (previously they were forced
>   neutral, which is exactly why cheap salads kept winning), plus off-menu adds/swaps and Phase-2
>   dedicated. `pickBest`: **tier → priority → score → unitValue(desc) → typeRank → helped → cost → name**.
> - **Per-dish portion cap on optimiser bumps (the real "balanced menu" fix).** The optimiser previously
>   ignored the base-scaling cap, so bumping one widely-safe dish ballooned it (measured: a single dish at
>   **49–54% of the whole budget**, e.g. Fried Rice ×12 / Brussels sprouts ×12, everything else at ×1).
>   `maxQtyByKey` (base portions × `ceil(G/4)`, the SAME cap Step B uses) is now passed into
>   `onMenuSharedBumpActions` / `onMenuSwapBumpActions`. Worst single dish dropped to **28%** (which is
>   the base menu itself, not an optimiser artifact).
> - **Status labels replace decimals** (`BuiltMenuResult.tsx`): **`✓ Covered`** at ≥ **0.85**, **`● Needs
>   review`** below (`.smb-fair--review`, orange). `STATUS_THRESHOLD = 0.85` applied **uniformly** (the
>   optimiser still internally aims for 0.90 on non-dietary); the raw score stays in the hover `title`.
>   `liveCoverage.met` + the "Needs review" list use the same boundary so nothing can disagree.
> - ⚠ **Measured deviation from the brief:** Sam asked for "prefer more substantial dishes" as the interim
>   tiebreak *ahead of* value-for-money. Measurement showed that ordering was worse on BOTH axes —
>   10/36 guests needing review (vs 8–9) **and** a worse worst-case pile (54% vs 49%). Balance is fixed by
>   the portion cap, not by that ordering, so `unitValue` sits **after** `score` as a genuine tiebreak.
>   Flagged to Sam; one-line swap to restore if wanted.
> - **Verified — 18-run battery** (6 scenarios × 3 venues, party 4–10): **never over budget** (max +0%),
>   **no set-menu dish ever dropped**, ≤3 same dish per guest, deterministic, off-menu near-zero.
>   9/36 guests need review — same as Phase H but now **entirely within budget** and far better balanced.
>
> **Priority columns — LIVE with placeholder values (as of 2026-07-30).** A **`Set menu priority`** column
> now exists on all three menu tabs with a handful of ranked dishes; the per-category `<Allergen> Priority`
> columns are **not** in use yet. ⚠ The current numbers are **Sam's arbitrary test values** — Tom will
> replace them with chef-approved rankings, so don't treat any specific ordering as intentional. Re-running
> the battery with them: still all-pass, 10/36 need review (up from 9 — expected, since priority
> deliberately outranks value-for-money).
>
> **Verified behaviour + the data lesson.** Priority demonstrably drives selection *when the ranked dish is
> a valid candidate* — Kisa picks `Yufka` (prio 3) repeatedly for gluten+dairy guests (it's the GF bread);
> Mr Go's gives `Tofu Bao` (prio 2) to the vegetarian guest. **BUT a ranked dish is only used if it's SAFE
> for the under-covered guest**, so a general ranking barely steers dietary substitutions when the ranked
> dishes aren't allergen-friendly: Mr Go's prio-1/2 dishes are all bao (`GLUTEN FREE=NO`, `DAIRY FREE=NO`)
> → unusable for gluten/dairy guests, so the optimiser correctly falls back to unranked safe dishes
> (Popcorn Tofu, Bok Choy, Jasmine Rice). Likewise Kisa's prio-1/2 dishes are already ON the base tier, so
> they get *bumped* rather than added. **Lesson:** the general column steers table-fill; to steer *dietary*
> swaps you must either rank dishes that are actually GF/DF/veg-safe, or add the per-category
> `<Allergen> Priority` columns. (Tom's original instinct about per-category columns was right.)

**Coverage lives in `src/lib/coverage-core.ts` (pure, shared).** The scoring formula
(`eatersForShared`, `coverageNumerator`, `coverageScore`, `coverageMap`, `canEatShared`, the
`COVERAGE_THRESHOLD = 0.9` / `COVERAGE_THRESHOLD_DIETARY = 0.85` / `DESIGNED_FOR = 4` constants, and
the `thresholdFor(isDietary)` helper) was extracted so the **browser** can recompute coverage +
pass/fail live as the planner edits the menu (Phase B), with **zero drift** — the server build imports
the exact same functions/constants. Inputs are plain data (`CoverageDish`, `CoverageGuest`);
`build-set-menu.ts` adapts its `WorkingDish`/`GuestAccess` at the call sites (for a known dish,
`itemKey === dishKey`, so the adaptation is lossless). Changing the metric = edit `coverage-core.ts`
once; both server and client follow.

**Coverage lives in `src/lib/coverage-core.ts` (pure, shared).** The scoring formula
(`eatersForShared`, `coverageNumerator`, `coverageScore`, `coverageMap`, `canEatShared`, the
`COVERAGE_THRESHOLD = 0.9` / `COVERAGE_THRESHOLD_DIETARY = 0.85` / `DESIGNED_FOR = 4` constants, and
the `thresholdFor(isDietary)` helper) was extracted so the **browser** can recompute coverage +
pass/fail live as the planner edits the menu (Phase B), with **zero drift** — the server build imports
the exact same functions/constants. Inputs are plain data (`CoverageDish`, `CoverageGuest`);
`build-set-menu.ts` adapts its `WorkingDish`/`GuestAccess` at the call sites (for a known dish,
`itemKey === dishKey`, so the adaptation is lossless). Changing the metric = edit `coverage-core.ts`
once; both server and client follow.

**Result shape:** `SharedDish.source = tier|added|dedicated` (+ `intendedFor` for dedicated);
`GuestResult.coverage` + `safe/modifiable(amber)/caution/excluded/unknown/dedicated` lists;
`BuildResult.optimiser {ran, actionsApplied, overBudget, allGuestsCovered}`. For the interactive
editor (Phase B), the result also carries **`catalog: CatalogDish[]`** (every priced à-la-carte dish,
deduped by `looseKey`, sorted by name — the "add a dish" pool) and per-guest
**`menuAccess {canEat[], modInstr{}, caution{}, excluded[]}`** (that guest's classification of the
FULL menu by `looseKey`). `menuAccess.canEat` is the full safe∪modifiable set (incl. unpriced
dishes) so client coverage matches the server; `excluded` is restricted to catalog dishes.

---

## 4. API + screens

- **`POST /api/build`** `{venue, tier, guestCount, guests:[{id, allergens[]}]}` → `{venue, tier,
  budget, sharedMenu[] (with source/intendedFor), catalog[] (addable priced dishes),
  guests[] (with coverage + dish lists + menuAccess), warnings[], meta, optimiser}`. 400 on
  unknown venue/tier. Stateless (10-min cache); the client edits its result in-browser and never
  re-calls per edit (coverage recomputes locally via `coverage-core`).
- **`GET /api/health`** — per-venue data diagnostics: source (sheet/bundled), per-tier
  count/total/per-person, and **unresolvedDishes** (drive to zero before launch). `ok:true`
  when zero unresolved.
- **Screens**: `/` venue picker → `/<venue>` builder → `BuiltMenuResult`.
  - *Builder* — tier chips, guest-count stepper, and **one guest row per guest** (auto-populated
    from the count, kept in sync as it changes). Each row has an **editable name** (→ "Guest N"
    fallback) + allergen chips. No add/remove buttons; leave non-dietary guests blank. (Internal
    tool — the old "tables of 12+ arranged with the venue" hint was removed; 12+ still scales
    silently via `ceil(G/4)`.)
  - *Results = a 2-stage flow* (`BuiltMenuResult.tsx`): **Edit → Confirm menu → Kitchen docket**
    (replaces the old free Guest-view↔docket toggle). The editable menu is held in React state
    (`menu: SharedDish[]`, seeded from `sharedMenu`); budget, per-head, coverage badges, and modify
    notes all recompute live from that state via `coverage-core` — no server round-trip.
    - *Edit stage* — centrepiece **"Set Menu draft"** (renamed from "The table — everything to
      make"): ONE complete list (tier + added + dedicated), Title-cased names (`prettyName`), each
      row with **− / + qty steppers** (remove at 0) and a live price; badges **"only for <name>"**
      (dedicated), **"modified"** + inline **"↳ MODIFY for <name>: <sub>"**, and **"no allergen
      data"**. A **general "Add another dish from menu" dropdown** sits at the foot of the draft card
      (divided off) — lists the full `catalog` (incl. desserts/lunch plates) with a single **＋ add**
      → `addDish(key, "shared")`, for non-dietary/operational changes. The financial stat row shows
      per-head / total food / target budget + a **contextual tile** ("remaining balance" under
      budget, flips to "over per head" when over) + guest count; an amber over-budget notice shows
      the factual amount (no "you have the final say" reassurance copy). The **guest roster** rows are expandable
      dropdowns**: collapsed = name + allergens + live coverage badge; expanded = that guest's
      AI-llergy breakdown from `menuAccess` (**Can eat / With a modification / Ask the kitchen /
      Not suitable**), each eatable/modifiable dish with **＋ shared** and **＋ just for them**
      buttons (`addDish` → increments an existing shared line, or appends `source:"added"` /
      `source:"dedicated", intendedFor:[guestId]`). This **absorbs** the old standalone "Dietary
      requirements" panels. A **Confirm menu** button (never disabled — **warn but allow**: an
      amber summary flags under-covered guests / over-budget but the planner has final say).
    - *Confirmed stage* — the printable cards below, **fed the edited menu**, with a **"← Back to
      edit"** button (Confirm isn't a dead-end), **Print**, and a **"Kitchen docket ↔ Waiter card"**
      toggle (`docView`). Both cards render under `body.smb-docket-mode` (chrome stripped) and print
      via the same button. `onReset` ("← Start over") returns to the inputs.
  - *Kitchen docket* — a **plain black-on-white one-page document** (no logo / venue title /
    tagline / background). "SET MENU — PARTY OF N" heading + a bordered Qty / Dish / Notes table + a
    GUESTS roster table. Each dish is shown **once at its costed qty**; modifications are grouped
    plating notes on that row — **"MODIFY for <guests>: <swap> (reason)"** — and dedicated dishes read
    **"ONLY for <name>"**. `shortMod` keeps the **reason** (e.g. "…→ Garlic Toum (dairy-free)" — Tom's
    ask) and drops only the "— note: adds …" tail (the introduced allergen is already guaranteed safe
    for that guest). Each guest's plate is evaluated against their OWN allergens, so a swap that adds
    an allergen only ever lands on the plate of a guest who doesn't avoid it. Prints straight to a
    chef's docket.
  - *Waiter card* (front-of-house, printable) — "DISH PLACEMENT — PARTY OF N": per dish, **who to
    place it for** — dedicated → **"ONLY <name>"**; shared → **"whole table"** or **"NOT <names>
    (<their allergens>)"** (the dietary guests who can't eat it), plus a light **"<name>: modified
    portion"** note where a guest gets a tweaked plate. Reuses `canEatShared` from `coverage-core` so
    "who can eat what" matches the coverage engine exactly; allergen-unknown shared dishes list all
    dietary guests as "NOT" (never served to an allergy guest unconfirmed). Guests referenced by
    name/number (no seating geometry is collected). Component `WaiterCard` in `BuiltMenuResult.tsx`.

---

## 5. Copied-lib sync obligation (drift risk)

These files are COPIES of `ai-llergy-webapp/src/lib/` (header comment in each). If the allergen
app changes them, **re-sync**:
- **`allergens.ts`** — the allergen ID → Sheet column map. MUST stay identical or safe/unsafe
  verdicts diverge from the live menu.
- **`substitutions.ts`** — parsing + `normalizeDishName` (also the set-menu JOIN key).
- `google-sheets.ts`, `menu-service.ts`, `filter-menu.ts` are ported/trimmed (AI + confidence
  paths dropped). Less churn-prone but keep the column logic aligned.
- ⚠ **`menu-service.ts` has DIVERGED from prod** — it adds `MenuItem.includeInSetMenu` +
  `readIncludeInSetMenu()` (the "Include in set menu" opt-in flag, §3), which the allergen app does
  NOT have. When re-syncing from prod, **re-apply that addition** — don't blindly overwrite the file.
- **`coverage-core.ts` is NOT a copy** — it's a set-menu-builder-only pure module (the single source
  of truth for Tom's coverage metric, imported by both the server build and the client editor). No
  prod equivalent; nothing to sync.
A future improvement is extracting the shared copies into a package; out of scope for v1.

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

- **v2 — Live.** Deployed to Netlify (`devesesam/set-menu-builder` → set.menukey.co.nz),
  tested across all three venues. Set-menu tabs wired in `venues.ts` (kisa `395901294`,
  mr-gos `1707387833`, ombra `321541246`); substitution tabs now wired for all three
  (kisa `1265271651`, mr-gos `1639397504`, ombra `1976184234`). Mr Go's dish keys all resolved.
- **v2 Phase A delivered (per Tom's brief):** full-menu **dietary optimiser** (shared-first
  waterfall → capped dedicated portions → best-effort), **Tom's 0–1 coverage score** (0.90
  threshold), and a **kitchen-docket** view. Replaces v1's tier-only fair-share.
- **v2 Phase B delivered — interactive edit→confirm→docket flow.** The results screen is now a
  planning surface: qty steppers with live price/coverage, per-guest dropdowns (their can-eat
  breakdown) with **＋ shared / ＋ just-for-them** add buttons, then **Confirm menu** → the
  print-ready docket (fed the edited menu; "← Back to edit" preserves edits). Coverage recomputes
  in-browser via the extracted pure `src/lib/coverage-core.ts` (imported by the server too — no
  drift); the build result now carries `catalog[]` + per-guest `menuAccess`. Confirm is
  **warn-but-allow** (amber flags under-coverage / over-budget but never blocks). Drag-and-drop
  from Tom's original brief was intentionally dropped in favour of steppers + ＋ (simpler, covers
  the need).
- **v2 Phase C delivered — internal-tool tweaks (Tom).** For team-only internal use: removed
  guest-facing/reassurance copy (the "tables of 12+" hint + the "you have the final say" / "guide,
  not a hard limit" sentences); added a **contextual budget tile** ("remaining balance" under budget,
  "over per head" when over); renamed the draft section to **"Set Menu draft"**; added a general
  **"Add another dish from menu"** dropdown (foot of the draft card, full catalog, shared add); and
  the **"Include in set menu" opt-in flag** (§3) so **desserts (all venues) + Kisa "lunch plates"
  never auto-populate** (standard draft or dietary optimiser) yet stay manually addable. Tom has
  populated the column (YES/NO) on all three venues' menu tabs. Verified live: optimiser auto-adds
  only YES dishes; catalog still lists desserts + lunch plates for manual add.
- **Split coverage threshold delivered — 0.90 non-dietary / 0.85 dietary** (§3). Dietary guests
  naturally eat more of the fewer dishes they can have, so the even-split score under-counts them; a
  lower bar compensates (vs an arbitrary consumption multiplier). Non-dietary stay at 0.90 (they're
  never the under-counted side — conservation). Implemented via `thresholdFor()` in `coverage-core.ts`,
  used by the optimiser stop/guard, Phase-2 loop, badges, and the client. Verified: dietary guests
  settle ~0.85 with fewer top-up dishes (Kisa 58/party 8/2 dietary: food $449→$419, actions 11→9,
  all covered), non-dietary held at 0.90, a 7-allergy guest at 0.86 now reads "Covered" (was best-effort).
- **v2 Phase D delivered — docket substitution reason + waiter card (Tom).** Front-end only.
  (1) The kitchen docket now shows **WHY** a swap is made — `shortMod` keeps the reason
  ("…→ Garlic Toum (dairy-free)") instead of stripping it. (2) A new printable **Waiter card**
  (dish-placement: "whole table" / "NOT <name> (allergens)" / "ONLY <name>" + "modified portion"
  notes), toggled beside the kitchen docket (`docView`). Reuses `canEatShared` — no backend/coverage
  change. See §4.
- **v2 Phase E delivered — optimiser priority ladder (Tom, staff feedback).** Server-only reorder of
  `optimise()` (§3): cover an under-covered dietary guest with **(0) a dedicated extra of an on-menu
  dish they eat SAFELY** → **(1) an off-menu SAFE dish** → **(2) a modified dish only as a last
  resort**; Phase-2 dedicated also prefers safe. Coverage metric / thresholds / client all unchanged.
  Tried a shared qty **bump** first (Tom's read) but it diluted and maxed the budget, so switched to a
  **dedicated** portion (isolated helper). Verified (Kisa 58/party 8/2 dietary): off-menu adds **7→2**,
  MODIFY notes **6→4**, dietary now get on-menu extras (Hummus→G2, Muhammara+Tursu→G1); moderate case
  1 off-menu / 1 mod. Keeps the standard tier intact (vs the old swap-gutting), so big-party spend runs
  nearer budget — user confirmed that's the desired "deliver the paid-for menu" behaviour.
- **v2 Phase F delivered — feed safe food, modifications as the true last resort (Tom/staff).** The
  optimiser now **drives off SAFE coverage** (§3 ⚠ block): it feeds each dietary guest real dishes they
  can *fully* eat (dedicated safe plates, **shared** between same-restriction guests, cap 4), flexing
  the tier to fund it, so **modifications only remain for a guest that genuinely can't be safe-covered**
  and are then actually served. The shown score is **effective** (safe if safe-covered, else full) so
  it always matches the served menu (Sam's "no count-then-hide" rule); the client suppresses now-
  unneeded MODIFY notes on the docket + waiter + draft. Verified: **0 mods** on party-8 (2 dietary),
  moderate, mild, and multi-dietary (2 gluten guests **share** their plates); a 7-allergy guest is the
  only best-effort (0.06 — honestly un-feedable at a meat venue); determinism + no-dietary unchanged;
  every shown score == server score. **Documented the irreducible trade-off** (can't have fewer mods +
  fewer off-menu + tier untouched near budget); Sam chose feed-the-guests + let-the-tier-flex, so big
  near-budget parties get a busier, more à-la-carte menu.
- **v2 Phase G delivered — keep the draft ON THE BASE SET MENU + ranked replacements + split draft
  (Tom/staff: "first draft ≈ 95% of final").** Optimiser now exhausts on-menu dishes before off-menu:
  removed the no-repeats guards (dietary guests get repeated portions of the same on-menu safe dish,
  `MAX_DEDICATED_PER_GUEST = 12` backstop / `MAX_ITERATIONS = 120`); Phase 2 tags on-menu dishes
  `dedTier = 0`; two new Phase-1 tier-0 helpers (`onMenuSharedBumpActions`, and near-budget-only
  `onMenuSwapBumpActions`) keep table-fill on the base menu without shrinking the table. New single
  **"Set menu priority"** menu-tab column (`MenuItem.setMenuPriority` / `readSetMenuPriority`, blank ⇒
  `UNRANKED_PRIORITY`) orders the **off-menu fallback only** (candidate sorts + a `pickBest` tiebreak
  after tier). Draft card split into **Base set menu** / **Dietary-specific dishes** (on-screen only).
  See §3 ⚠ Phase G block. **Verified** Kisa 58 / Mr Go's 44 / Ombra 49, party 6–8, single + multi +
  7-allergy dietary: **zero off-menu dishes**, guests covered, near budget, determinism holds,
  no-dietary unchanged. ⚠ Priority column is **inert until Tom adds it to each menu tab** (blank ⇒
  unranked, alphabetical fallback) — populate it to make preferred substitutes win when a draft does
  go off-menu.
- **v2 Phase H delivered — hold EVERY guest to threshold + protect the base set menu + bounded
  over-budget (Sam/Tom).** Root causes fixed: (1) only *submitted* dietary guests were held to
  threshold — now `buildSetMenu` adds ONE representative **non-dietary** guest (`"__party__"`) to the
  optimiser's coverage list so the whole party is lifted to 0.90 (fills an under-full table; never a UI
  row); (2) the optimiser could drop a base-tier main — now the three `withReduced` swap sites **skip
  `source === "tier"`**, so the base set menu is never trimmed; dietary coverage is **added on top**
  within a **10% over-budget ceiling** (`BUDGET_OVERAGE`, `budgetCeiling` in every optimiser guard; Step
  B still fills the base to target). `optimise` now returns a truthful `overBudget`. See §3 ⚠ Phase H.
  **Verified — 18-run battery** (6 scenarios × 3 venues, party 4–10): no tier dish ever dropped,
  spread ≤ 1.10×budget always, every guest covered or honest best-effort, deterministic, off-menu
  near-zero. Kisa Case A keeps Short Rib + covers both (0.94/0.91) at +10%. Trade-off: dietary parties
  typically run a little over target (surfaced via the "over per head" tile).
- **v2 Phase I delivered — per-dish cap on dedicated portions (Sam).** `MAX_SAME_DISH_PER_GUEST = 3`:
  no single dish is plated more than 3× for one guest (was piling e.g. Rice ×9 for a 7-allergy guest);
  different dedicated dishes stay unlimited, no per-table cap. Helper `dedCountForDish`, gating
  `onMenuSafeExtraActions` + the Phase-2 candidate filter; optimiser-only (editor manual add uncapped).
  See §3 ⚠ Phase I. **Verified** (re-run 18-run battery): no dish >3×/guest, determinism + tier
  protection + 10% ceiling intact. Makes coverage HONEST → a few repetition-propped scores drop
  (Ombra gluten+garlic 0.98→0.78 crosses to best-effort; Mr Go's 7-allergy 0.74→0.36); Kisa + easy
  cases unchanged. Cap value is a one-constant bump if too tight on constrained menus.
- **v2 Phase J delivered — hard budget cap + 1× floor + per-category priorities + status labels (Tom
  round 4).** (1) `BUDGET_OVERAGE` **removed** — never exceed the customer's budget. (2) Dietary dishes
  are funded by trimming base dishes down to **`MIN_TIER_DISH_QTY = 1`** (never dropped). (3) New
  **"<Allergen> Priority"** menu-tab columns (`priorityByAllergen` / `readPriorityByAllergen`,
  general "Set menu priority" as fallback) now steer **which on-menu dish is increased**, not just the
  off-menu fallback. (4) The optimiser now respects the **base-scaling per-dish portion cap**
  (`maxQtyByKey` = base × `ceil(G/4)`) — this is what actually fixed Tom's "too much salad" complaint
  (worst single dish 49–54% → **28%** of budget). (5) Coverage decimals → **`✓ Covered` / `● Needs
  review`** at a uniform **0.85** (`STATUS_THRESHOLD`), raw score kept in the hover tooltip.
  See §3 ⚠ Phase J. **Verified** 18-run battery: never over budget, no dish dropped, ≤3 same dish per
  guest, deterministic; 9/36 need review (same as Phase H but fully in-budget + better balanced).
  ⚠ `unitValue` deliberately ranks AFTER `score` (measured: ahead-of-score was worse on coverage AND
  balance — see §3).
- **`Set menu priority` column now populated on all 3 menu tabs (2026-07-30) — with PLACEHOLDER values.**
  Sam added arbitrary test numbers to prove the wiring; Tom will replace them with chef-approved rankings.
  Per-category `<Allergen> Priority` columns deliberately **not** added yet. Verified the mechanism works
  (Kisa `Yufka` prio-3 chosen for gluten+dairy guests; Mr Go's `Tofu Bao` prio-2 → the vegetarian), and
  learned the key limitation: a ranked dish is only used if it's **safe for that guest**, so Mr Go's
  bao-heavy top ranks (GLUTEN/DAIRY = NO) can't steer dietary swaps at all. See §3 ⚠ Phase J.
- **Real menu prices live.** Menu tabs are priced for all venues (mr-gos 31/31, ombra 27/27,
  kisa 34/35), so coverage + budget use real prices. Any still-unpriced à-la-carte dish (e.g.
  Kisa's Ezmesi) is excluded from consideration — no placeholder.
- **`Slow cook lamb` (Ombra) is an intentional future dish** — not on the main menu yet, so its
  Dish Key stays blank and it shows as "no allergen data / confirm with venue" on the set menu.
  Leave it until Tom adds it to the menu tab. All other dish keys resolve.
- **Open**: confirm Netlify `GOOGLE_SHEET_ID` = the live sheet + `setmenu` DNS.
- **Known refinement (minor):** for a heavily-restricted guest whose only safe dishes are already
  on the shared table, the optimiser can add both a shared copy AND a dedicated portion of the same
  dish (e.g. two coconut sagos). Correct + within budget, just slightly redundant; the Phase B
  editor will let staff dedupe, or Phase 1 could later prefer swaps over single-guest shared adds.
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
