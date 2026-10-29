# Browser tests

Playwright checks of what staff and guests actually see, on real device profiles (iPad and
iPhone/Android, WebKit = Safari's engine, plus Chrome). They complement the battery
(`execution/set_menu_battery.py`), which only calls the builder API.

Setup once: `cd tests/browser && npm i` (browsers live in `%LOCALAPPDATA%\ms-playwright`; the
WebKit build must match playwright-core 1.64.1). Chrome uses the `CHROME` env var.

Run against a local build (`npm run build && npx next start -p 3000` in the app) or the live
site by setting `BASE`.

| Test | App | What it checks |
|---|---|---|
| `builder/safety.mjs` | Builder | Random orders + random edits (allocate, reassign, remove). Every individual allocation on the docket names exactly its guests, their diets, every modification and "not for sharing"; shared lines say who can't share and every needed modification; no "plate(d)" wording. `SEED=7 BASE=http://localhost:3000 node builder/safety.mjs` (also seeds 11, 23). |
| `builder/flow.mjs` | Builder | The waiter flow: no suggestions; add a dish for a guest, reassign it, remove it, with "Changed for dietaries" following live; docket; refresh; old `#kitchen` link. `node builder/flow.mjs ipad` (also `ipad-landscape`, `chrome`). |
| `menukey/accordion_check.mjs` | MenuKey | Results sections open to full height (none cut off), close fully, and the last dish of a long list can be added. `BASE=https://menukey.co.nz node menukey/accordion_check.mjs iphone` (also `android`). |
| `menukey/clip_probe.mjs` | MenuKey | Measures every results section on five venue/selection cases and lists any dish hidden by clipping. |

Lesson (2026-10-29): text checks and Playwright taps both "see" content that is clipped out of
view, so visibility must be measured (rendered height vs scrollHeight).
