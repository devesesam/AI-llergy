// Set Menu Builder SAFETY checker: random orders + random edits (add / reassign / remove an
// individual allocation, change shared quantities), saved into the app's storage, then the FOH
// docket and the order screen are read back and checked against the order itself.
//
// For every individual allocation: a block headed "N × Individually allocated for <guests>",
// each guest's diet, EVERY modification for every guest on it, and "only, not for sharing".
// For shared lines: who can't share it, every modification a guest needs on a shared portion.
// The word "plate(d)" never appears to staff (Tom, 2026-10-29).
//
// Usage: SEED=7 BASE=http://localhost:3000 node tests/browser/builder/safety.mjs
import { webkit } from "playwright-core";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const SEED = Number(process.env.SEED || 7);
const N_SCENARIOS = Number(process.env.N || 21);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILDER = path.resolve(HERE, "../../../set-menu-builder");

// The app's own pure helpers, transpiled from source, so expectations use the same rules
// (coverage, kitchen names, short modification text) without trusting the screens.
const ts = createRequire(path.join(BUILDER, "package.json"))("typescript");
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: 99 } }).outputText;
const cov = (() => {
  const m = { exports: {} };
  new Function("module", "exports", "require", js(readFileSync(path.join(BUILDER, "src/lib/coverage-core.ts"), "utf8")))(m, m.exports, () => ({}));
  return m.exports;
})();
const OV = readFileSync(path.join(BUILDER, "src/lib/order-view.ts"), "utf8");
const grab = (sig) => {
  const st = OV.indexOf(sig);
  let d = 0;
  for (let i = OV.indexOf(" {\n", st) + 1; i < OV.length; i++) {
    if (OV[i] === "{") d++;
    else if (OV[i] === "}" && --d === 0) return OV.slice(st, i + 1).replace("export ", "");
  }
};
const fns = new Function(js(grab("export function shortName(") + grab("export function splitName(") + grab("export function shortMod(")) + "; return { shortName, shortMod };")();

// Seeded random
let s = SEED;
const R = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (a) => a[Math.floor(R() * a.length)];

const NAMES = ["Ava", "Ben", "Cat", "Dan", "Eli", "Fay", "Gus", "Hal", "Ivy"];
const DIETS = [["vegan"], ["vegetarian"], ["halal"], ["gluten"], ["dairy"], ["eggs"], ["peanuts", "treenuts"], ["shellfish"], ["gluten", "dairy"], ["sesame"], ["garlic", "gluten"], ["dairy", "eggs"], ["fish"]];
const VENUES = [["kisa", ["58", "68", "78"]], ["mr-gos", ["38", "44", "50"]], ["ombra", ["39", "49", "59"]]];
const WORD = { peanuts: "NUT", treenuts: "NUT", eggs: "EGG", molluscs: "MOLLUSC", nightshades: "NIGHTSHADE", sulfites: "SULFITE" };
const joinAnd = (p) => (p.length <= 1 ? p.join("") : `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`);
const hasName = (t, N) => t.toUpperCase().split(/[^A-Z]+/).includes(N.toUpperCase());
const key = (d) => d.dishKey || `name:${d.displayName}`;
const toCov = (d) => ({ dishKey: d.dishKey, isKnown: d.allergenStatus === "known", source: d.source, intendedFor: d.intendedFor, qty: d.qty, unitPrice: d.unitPrice, price: d.price });

let fails = 0, checks = 0;
const F = (sc, msg) => { fails++; console.log("FAIL", sc, msg); };

const browser = await webkit.launch();
let ctx = null;
for (let n = 0; n < N_SCENARIOS; n++) {
  const [venue, tiers] = pick(VENUES);
  const tier = pick(tiers);
  const party = pick([5, 8, 12, 16, 20]);
  const nd = 1 + Math.floor(R() * Math.min(5, party - 1));
  const guests = Array.from({ length: nd }, (_, i) => ({ id: `d${i + 1}`, name: NAMES[i], allergens: [...pick(DIETS)].sort() }));
  const result = await (await fetch(`${BASE}/api/build`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venue, tier, guestCount: party, guests }) })).json();
  if (result.error) { console.log("ERR", venue, tier, result.error); continue; }
  const menu = result.sharedMenu.map((d) => ({ ...d }));
  const G = result.guests;
  const canEat = (gid, k) => G.find((g) => g.id === gid).menuAccess.canEat.includes(k);
  const edits = [];

  // Random edits a waiter might make in Adjust.
  for (let e = 0; e < 4; e++) {
    const r = R();
    if (r < 0.3) {
      // allocate a dish to one guest who can eat it (from the catalog)
      const g = pick(G);
      const c = pick(result.catalog.filter((c) => canEat(g.id, c.dishKey)).concat([null]));
      if (!c) continue;
      const ex = menu.find((d) => d.source === "dedicated" && !d.toTable && d.dishKey === c.dishKey && (d.intendedFor || []).join() === g.id);
      if (ex) { ex.qty++; ex.price = Math.round(ex.unitPrice * ex.qty * 100) / 100; }
      else menu.push({ displayName: c.displayName, dishKey: c.dishKey, qty: 1, unitPrice: c.unitPrice, price: c.unitPrice, course: c.course, notes: "", allergenStatus: "known", source: "dedicated", intendedFor: [g.id] });
      edits.push(`+${c.displayName.slice(0, 14)} for ${g.name}`);
    } else if (r < 0.5) {
      // reassign an allocation: add another guest who can eat it
      const p = pick(menu.filter((d) => d.source === "dedicated" && !d.locked && !d.toTable).concat([null]));
      if (!p) continue;
      const g = pick(G.filter((g) => !p.intendedFor.includes(g.id) && canEat(g.id, p.dishKey)).concat([null]));
      if (!g) continue;
      p.intendedFor = [...p.intendedFor, g.id];
      edits.push(`${p.displayName.slice(0, 14)} also for ${g.name}`);
    } else if (r < 0.65) {
      // remove an allocation
      const i = menu.findIndex((d) => d.source === "dedicated" && !d.locked && !d.toTable && R() < 0.5);
      if (i < 0) continue;
      edits.push(`removed ${menu[i].displayName.slice(0, 14)}`);
      menu.splice(i, 1);
    } else {
      const d = pick(menu.filter((d) => d.source !== "dedicated" && !d.locked));
      d.qty = Math.max(1, d.qty + (R() < 0.5 ? -1 : 1));
      d.price = Math.round(d.unitPrice * d.qty * 100) / 100;
    }
  }
  // Two allocations of a dish for the same guests are one line in the app (it merges them).
  for (let i = menu.length - 1; i >= 0; i--) {
    const d = menu[i];
    if (d.source !== "dedicated" || d.toTable) continue;
    const j = menu.findIndex((x, k) => k < i && x.source === "dedicated" && !x.toTable && x.dishKey === d.dishKey && [...x.intendedFor].sort().join() === [...d.intendedFor].sort().join());
    if (j >= 0) { menu[j].qty += d.qty; menu[j].price = Math.round(menu[j].unitPrice * menu[j].qty * 100) / 100; menu.splice(i, 1); }
  }

  const S = `[${venue} ${tier}/${party} ${guests.map((g) => `${g.name}:${g.allergens.join("+")}`).join(" ")}${edits.length ? " | " + edits.join("; ") : ""}]`;
  const nm = (id) => G.find((g) => g.id === id).name;
  // Who needs modifications on SHARED portions: guests not covered by safe food alone.
  const tableSize = Math.max(party, G.length);
  const phantom = party > G.length ? [{ id: "__party__", isDietary: false, canEatKeys: new Set() }] : [];
  const safeG = [...G.map((g) => { const mk = new Set(Object.keys(g.menuAccess.modInstr)); return { id: g.id, isDietary: g.allergens.length > 0, canEatKeys: new Set(g.menuAccess.canEat.filter((k) => !mk.has(k))) }; }), ...phantom];
  const fullG = [...G.map((g) => ({ id: g.id, isDietary: g.allergens.length > 0, canEatKeys: new Set(g.menuAccess.canEat) })), ...phantom];
  const safeScores = cov.coverageMap(menu.map(toCov), safeG, result.tier.perHead, tableSize);
  const need = new Set(G.filter((g) => g.allergens.length > 0 && safeScores[g.id] < cov.thresholdFor(true)).map((g) => g.id));

  const rowsExp = new Map();
  for (const d of menu) { const k = key(d); if (!rowsExp.has(k)) rowsExp.set(k, { name: fns.shortName(d.displayName), lines: [] }); rowsExp.get(k).lines.push(d); }

  const saved = { v: 1, savedAt: Date.now(), inputs: { table: "T", tier, countText: String(party), guests: guests.map((g) => ({ id: g.id, label: g.name, allergens: g.allergens })), nextId: guests.length + 1 }, built: { result, menu, guestCount: party, updatedAt: Date.now(), edited: true, usedSuggestions: [] }, view: "docket" };
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${venue}`);
  await page.locator("#smb-table, .smb-k__title, .smb-order__actions").first().waitFor();
  await page.waitForTimeout(1000); // the app clears an empty order slot just after it loads
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`smb.order.v1.${venue}`, JSON.stringify(saved)]);
  await page.goto(`${BASE}/${venue}#docket`);
  await page.reload();
  try {
    await page.locator(".smb-k__title").waitFor({ timeout: 8000 });
  } catch {
    await page.screenshot({ path: path.resolve(HERE, "../../../.tmp/safety_fail.png") });
    F(S, `docket did not open (url ${page.url()})`);
    continue;
  }

  const rows = await page.locator(".smb-k__row").evaluateAll((els) => els.map((e) => ({
    qty: e.querySelector(".smb-k__qty").innerText.trim(),
    name: e.querySelector(".smb-k__name").innerText.trim(),
    notes: [...e.querySelectorAll(".smb-k__note")].filter((x) => !x.closest(".smb-k__plate")).map((x) => {
      const tg = x.querySelector(".smb-k__tag")?.innerText.trim() || "";
      return { tag: tg, text: x.innerText.trim().slice(tg.length).trim() };
    }),
    blocks: [...e.querySelectorAll(".smb-k__plate")].map((b) => ({ head: b.querySelector(".smb-k__plate-head").innerText.trim(), lines: [...b.querySelectorAll(".smb-k__note")].map((x) => x.innerText.trim()) })),
  })));
  const docketText = (await page.locator("body").innerText()).replace(/Lunch Plate/gi, ""); // a real Kisa dish name
  checks++; if (/\bplated?\b/i.test(docketText)) F(S, `docket says "plate(d)": ${docketText.match(/.{0,30}\bplated?\b.{0,30}/i)[0]}`);
  const diet = await page.locator(".smb-k__diet").innerText();
  for (const g of G.filter((g) => g.allergens.length > 0)) {
    checks++;
    const line = diet.split("\n").find((l) => l.startsWith(g.name.toUpperCase() + ":"));
    if (!line) { F(S, `DIETARIES missing ${g.name}`); continue; }
    for (const a of g.allergens) if (!line.toUpperCase().includes(WORD[a] ?? a.toUpperCase())) F(S, `DIETARIES ${g.name} lacks ${a}: ${line}`);
  }
  if (rows.length !== rowsExp.size) F(S, `row count ${rows.length} vs ${rowsExp.size}`);

  for (const [, re] of rowsExp) {
    const kr = rows.find((r) => r.name === re.name);
    if (!kr) { F(S, "missing row " + re.name); continue; }
    const locked = re.lines.filter((d) => d.locked && d.source !== "dedicated");
    const per = locked[0]?.allocation?.unitsPerDish ?? 1;
    const expQty = locked.length
      ? locked.reduce((t, d) => t + d.qty, 0) + re.lines.filter((d) => !locked.includes(d)).reduce((t, d) => t + d.qty, 0) * per
      : re.lines.reduce((t, d) => t + d.qty, 0);
    checks++; if (Number(kr.qty) !== expQty) F(S, `qty ${re.name} ${kr.qty} vs ${expQty}`);

    // Phase O: a to-table extra is part of the shared quantity, never an allocation.
    const isShared = (d) => d.source !== "dedicated" || !!d.toTable;
    const allocs = re.lines.filter((d) => !isShared(d));
    const shared = re.lines.filter((d) => isShared(d) && !d.locked);
    if (allocs.length && shared.length && !locked.length) {
      const sq = shared.reduce((t, d) => t + d.qty, 0);
      checks++; if (!kr.notes.some((x) => x.text === `${sq} × Shared with the table`)) F(S, `${re.name} no "${sq} × Shared with the table"`);
    }

    // Modifications on shared portions
    const expMod = new Set();
    for (const d of re.lines) for (const g of G) {
      const ins = g.menuAccess.modInstr[d.dishKey];
      if (ins === undefined || !isShared(d)) continue;
      if (need.has(g.id) && !(d.locked && d.allocation)) expMod.add(`${g.name}|${ins.map(fns.shortMod).join("; ") || "as required"}`);
    }
    const gotMod = new Set();
    for (const nt of kr.notes.filter((x) => x.tag === "MODIFY")) { const i = nt.text.indexOf(": "); for (const w of nt.text.slice(0, i).split(", ")) gotMod.add(`${w}|${nt.text.slice(i + 2)}`); }
    checks++; if ([...expMod].sort().join() !== [...gotMod].sort().join()) F(S, `${re.name} MODIFY exp ${[...expMod]} got ${[...gotMod]}`);

    // SAFETY: every individual allocation is its own complete block.
    checks++; if (kr.blocks.length !== allocs.length) F(S, `${re.name} ${kr.blocks.length} blocks for ${allocs.length} allocations`);
    const left = [...kr.blocks];
    for (const d of allocs) {
      checks++;
      const names = d.intendedFor.map(nm);
      const head = `${d.qty} × Individually allocated for ${joinAnd(names)}`;
      const bi = left.findIndex((b) => b.head === head);
      if (bi < 0) { F(S, `${re.name} no block "${head}": ${kr.blocks.map((b) => b.head).join(" | ")}`); continue; }
      const b = left.splice(bi, 1)[0];
      const foot = b.lines[b.lines.length - 1];
      checks++; if (!foot.endsWith(` only, not for sharing.`) || !names.every((N) => hasName(foot, N))) F(S, `${re.name} footer: ${foot}`);
      for (const id of d.intendedFor) {
        const g = G.find((x) => x.id === id);
        checks++;
        if (g.allergens.length && !b.lines.some((l) => hasName(l, g.name) && g.allergens.every((a) => l.toUpperCase().includes(WORD[a] ?? a.toUpperCase()))))
          F(S, `${re.name} block diet for ${g.name} missing: ${b.lines.join(" | ")}`);
        const ins = g.menuAccess.modInstr[d.dishKey];
        if (ins === undefined) continue;
        checks++;
        const sig = ins.map(fns.shortMod).join("; ") || "as required";
        if (!b.lines.some((l) => l.startsWith("Modify: ") && l.endsWith(sig) && (names.length === 1 || hasName(l, g.name) || !/^Modify: [^:]+: /.test(l))))
          F(S, `${re.name} block modification missing for ${g.name}: ${sig} | ${b.lines.join(" | ")}`);
      }
    }

    // Who shares it
    for (const d of re.lines.filter(isShared)) {
      const useSafe = (g) => (d.locked && d.allocation) || !need.has(g.id);
      const cannot = G.filter((g) => g.allergens.length > 0).filter((g) => !cov.canEatShared((useSafe(g) ? safeG : fullG).find((x) => x.id === g.id), toCov(d))).map((g) => g.name);
      checks++;
      const shares = kr.notes.filter((x) => x.text.startsWith("Share: "));
      const ok = shares.some((x) => (cannot.length === 0 ? x.text === "Share: whole table" : x.text.startsWith("Share: NOT ") && NAMES.filter((N) => hasName(x.text, N)).sort().join() === [...cannot].sort().join()));
      if (!ok) F(S, `${re.name} share exp NOT [${cannot}] got ${shares.map((x) => x.text).join(" | ")}`);
    }
    if (re.lines.some((d) => d.allergenStatus !== "known")) { checks++; if (!kr.notes.some((x) => /No allergen data/.test(x.text))) F(S, `${re.name} unknown-data note missing`); }
  }

  // Order screen: the same allocations, in Tom's wording, and no "plate(d)".
  await page.getByRole("button", { name: "← Order" }).tap();
  await page.locator(".smb-order__row").first().waitFor();
  const orderText = (await page.locator(".smb-order").innerText()).replace(/Lunch Plate/gi, "");
  checks++; if (/\bplated?\b/i.test(orderText)) F(S, `order screen says "plate(d)": ${orderText.match(/.{0,30}\bplated?\b.{0,30}/i)[0]}`);
  // Each allocation's line names exactly its guests (with diets): "1 × Individually allocated for Dan (halal) and Ava (no dairy)".
  const allocLines = orderText.split(/\r?\n/).filter((l) => / × Individually allocated for /.test(l));
  const unused = [...allocLines];
  for (const d of menu.filter((d) => d.source === "dedicated" && !d.toTable)) {
    checks++;
    const names = d.intendedFor.map(nm).sort().join();
    const i = unused.findIndex((l) => l.startsWith(`${d.qty} × Individually allocated for `) && NAMES.filter((N) => hasName(l, N)).sort().join() === names);
    if (i < 0) F(S, `order screen has no "${d.qty} × Individually allocated for" ${names}`);
    else unused.splice(i, 1);
  }
  checks++; if (unused.length) F(S, `order screen has extra allocation lines: ${unused.join(" | ")}`);
  console.log("done", S);
}
await browser.close();
console.log(`${fails ? "FAIL" : "PASS"} ${checks} checks ${fails} fails over ${N_SCENARIOS} scenarios (seed ${SEED})`);
process.exit(fails ? 1 : 0);
