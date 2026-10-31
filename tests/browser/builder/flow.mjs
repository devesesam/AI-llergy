// Set Menu Builder waiter flow, tapping through the real screens (Tom's points, 2026-10-29):
// no suggestions; add a dish for one guest, change who it's for, remove it, with the
// "Adjustments for dietaries" table following every edit live; shared vs individually
// allocated quantities on separate lines; the FOH docket; refresh + old links.
//
// Usage: BASE=http://localhost:3000 node tests/browser/builder/flow.mjs [ipad|ipad-landscape|chrome]
import { webkit, chromium, devices } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE || "http://localhost:3000";
const which = process.argv[2] || "ipad";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.tmp");
const browser = which === "chrome" ? await chromium.launch({ executablePath: process.env.CHROME }) : await webkit.launch();
const opts =
  which === "chrome" ? { viewport: { width: 1180, height: 820 } } : devices[which === "ipad-landscape" ? "iPad (gen 7) landscape" : "iPad (gen 7)"];
const ctx = await browser.newContext(opts);
const page = await ctx.newPage();
const errors = [];
// WebKit logs a cancelled Next.js prefetch on reload as an error; harmless (known since Phase M).
page.on("pageerror", (e) => { if (!/Fetch API cannot load .*_rsc=/.test(String(e))) errors.push(String(e)); });
page.on("dialog", (d) => d.accept());
const tap = (loc) => (which === "chrome" ? loc.click() : loc.tap());
let fails = 0;
const check = (n, ok, d = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  [${which}] ${n}${d ? " · " + d : ""}`); };
const shot = (name) => page.screenshot({ path: `${OUT}/flow_${which}_${name}.png`, fullPage: true });
const changes = async () => (await page.locator(".smb-order__change").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
const dashes = async (where) => { const t = await page.locator("body").innerText(); const d = t.match(/.{0,25}[—–].{0,25}/g) || []; check(`no em/en dashes (${where})`, d.length === 0, d.slice(0, 2).join(" | ")); };
const noPlate = async (where) => { const t = (await page.locator("body").innerText()).replace(/Lunch Plate/gi, ""); const m = t.match(/.{0,25}\bplated?\b.{0,25}/i); check(`no "plate(d)" wording (${where})`, !m, m?.[0] ?? ""); };

// Build: Kisa $68 for 20, Ava vegan, Dan no dairy
await page.goto(`${BASE}/kisa`);
await page.locator("#smb-table").waitFor();
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload();
await page.locator("#smb-table").fill("Table 12");
await tap(page.locator(".smb-order__tier", { hasText: "$68" }).first());
await page.locator("#smb-count").fill("20");
for (const [label, chip] of [["Ava", "Vegan"], ["Dan", "No dairy"]]) {
  await tap(page.getByRole("button", { name: "＋ Add dietary guest" }));
  const card = page.locator(".smb-order__diet").last();
  await card.getByLabel("Seat or name").fill(label);
  await tap(card.getByRole("button", { name: chip, exact: true }));
}
await tap(page.getByRole("button", { name: /^Build order/ }));
await page.getByRole("button", { name: "Show docket →" }).waitFor();

// 1. No suggestions
check("no suggestions at the bottom of the draft", (await page.locator(".smb-order__suggest, .smb-order__suggest-chip").count()) === 0);
check("no 'these are the original changes' note", !/original changes/i.test(await page.locator(".smb-order").innerText()));
await noPlate("order screen");
await dashes("order screen");
// Tom (2026-10-31): "Adjustments for dietaries", always fully open, every name spelled out.
check("heading reads 'Adjustments for dietaries'", /Adjustments for dietaries/.test(await page.locator(".smb-order__changes").innerText()));
check("changes list has no Show all / Show fewer toggle", (await page.getByRole("button", { name: /^Show (all|fewer)/ }).count()) === 0);
const beforeAll = await changes();
check("no 'and N others' in the changes", !beforeAll.some((c) => /and \d+ others/.test(c)), beforeAll.find((c) => /others/.test(c)) ?? "");
check("no ambiguous '1 × … for A and B' allocation line", !/\b1 × Individually allocated for [^\n]* and /.test(await page.locator(".smb-order").innerText()));
await shot("order");

// 2. Phase O: an extra of a dish already on the table goes to the TABLE, never to a guest
const extraNote = beforeAll.find((c) => /more on the table for /.test(c));
check("an extra of an on-table dish reads 'more on the table for …', not an allocation",
  !!extraNote && !beforeAll.some((c) => /^\+\d+ (Hummus|Falafel): individually allocated/.test(c)), extraNote ?? beforeAll.join(" || "));
// The engine's draft never allocates a guest an individual portion of a dish that's also shared.
const mixedRows = (await page.locator(".smb-order__row").allInnerTexts()).filter(
  (t) => /× Shared with the table/.test(t) && /× Individually allocated/.test(t)
);
check("draft: no dish both shared and individually allocated", mixedRows.length === 0, mixedRows.map((t) => t.split("\n")[1]).join(", "));

// 4. Shared vs individual lines (engine allocations)
const order = await page.locator(".smb-order").innerText();
const hasAlloc = /\d+ × Individually allocated for /.test(order);
check("allocations read 'N × Individually allocated for …'", hasAlloc, (order.match(/.{0,40}Individually allocated.{0,40}/) || [""])[0]);
if (hasAlloc) check("and the shared part reads 'N × Shared with the table'", /\d+ × Shared with the table/.test(order) || !/Shared/.test(order));

// 3 + 5. Add a dish for Dan from "Add a dish"; the changes table updates at once
await tap(page.getByRole("button", { name: "Adjust order" }));
await tap(page.getByRole("button", { name: "＋ Add a dish" }));
const forDan = page.locator(".smb-order__cat").filter({ has: page.getByRole("button", { name: "＋ For Dan" }) });
const n = await forDan.count();
check("'+ For Dan' offered on dishes Dan can eat", n > 0, `${n} dishes`);
// a dish that isn't already allocated to Dan, so the change is new
let added = null;
for (let i = 0; i < n && !added; i++) {
  const row = forDan.nth(i);
  const name = (await row.locator("span").first().innerText()).split("\n")[0].replace(/\s*\$[\d.,]+$/, "").trim();
  if (beforeAll.some((c) => c.includes(name.split(/[ ,(-]/)[0]) && /Dan/.test(c))) continue;
  await tap(row.getByRole("button", { name: "＋ For Dan" }));
  added = name;
}
await tap(page.getByRole("button", { name: "＋ Add a dish" }));
const afterAdd = await changes();
const newLine = afterAdd.find((c) => !beforeAll.includes(c));
check("changes table updates live after adding a dish for Dan", !!newLine && /individually allocated for Dan \(no dairy\)/.test(newLine), `added "${added}" → ${newLine ?? afterAdd.join(" || ")}`);

// Expand that dish: allocation line + guest chips
const short = newLine?.match(/^[+−=]\d* ?(.+?): /)?.[1];
const adj = page.locator(".smb-order__adj").filter({ has: page.locator(".smb-order__adj-name", { hasText: short ?? "@@" }) }).first();
await tap(adj.locator(".smb-order__adj-name"));
const allocLine = adj.locator(".smb-order__alloc").filter({ hasText: "Individually allocated for Dan" }).first();
check("Adjust shows 'Individually allocated for Dan (no dairy)'", (await allocLine.count()) === 1, short ?? "");
await shot("adjust");
const avaChip = allocLine.getByRole("button", { name: /^Ava/ });
const avaOk = (await avaChip.count()) === 1 && (await avaChip.isEnabled());
if (avaOk) {
  await tap(avaChip);
  const t = (await allocLine.innerText().catch(() => "")) || (await adj.innerText());
  const ch = await changes();
  // One dish for two people: "To be shared by Dan (no dairy) and Ava (vegan) only" (Tom, 2026-10-31).
  check("reassign: one dish for Dan and Ava reads 'To be shared by … only', table follows",
    /To be shared by (Dan .*and Ava|Ava .*and Dan).* only/.test(await adj.innerText()) && ch.some((c) => /to be shared by/.test(c) && /Dan/.test(c) && /Ava/.test(c)),
    `${t.replace(/\n/g, " | ")} :: ${ch.join(" || ")}`);
  const adjNotes = (await adj.locator(".smb-order__note").allInnerTexts()).join("\n");
  check("Adjust shows the allocation once (no repeated red line)", !/Individually allocated|to be shared by/i.test(adjNotes), adjNotes);
  check("chips read 'Individually allocate to:'", /Individually allocate to:/.test(await adj.innerText()) && !/(^|\n)\s*Allocated to:/.test(await adj.innerText()));
  // Two for Dan and Ava: one each
  await tap(adj.locator(".smb-order__alloc").first().getByRole("button", { name: /^One more / }));
  check("two for Dan and Ava reads '1 each for …'", /Individually allocated: 1 each for/.test(await adj.innerText()), (await adj.innerText()).replace(/\n/g, " | "));
  check("changes: '1 each, individually allocated for …'", (await changes()).some((c) => /1 each, individually allocated for/.test(c)), (await changes()).join(" || "));
  await tap(adj.locator(".smb-order__alloc").first().getByRole("button", { name: /^One fewer / }));
  // take Dan off: only Ava left
  await tap(adj.locator(".smb-order__alloc").first().getByRole("button", { name: /^Dan/ }));
  check("reassign: Dan taken off, now only Ava", /Individually allocated for Ava/.test(await adj.innerText()) && !/allocated for Dan/.test(await adj.innerText()), (await adj.innerText()).replace(/\n/g, " | "));
} else {
  console.log(`      (Ava can't eat ${short}; reassign covered by the safety checker)`);
}
// Remove it
await tap(adj.locator(".smb-order__alloc").first().getByRole("button", { name: "Remove" }));
const afterRemove = await changes();
check("Remove: the allocation and its change line are gone", !afterRemove.some((c) => c === newLine) && afterRemove.join() === beforeAll.join(), `${afterRemove.length} lines vs ${beforeAll.length} before`);
await tap(page.getByRole("button", { name: "Done adjusting" }));

// Docket
await tap(page.getByRole("button", { name: "Show docket →" }));
await page.locator(".smb-k__title").waitFor();
check("no Kitchen/Waiter toggle", (await page.locator(".smb-toggle").count()) === 0);
const heads = await page.locator(".smb-k__plate-head").allInnerTexts();
check("docket blocks: one guest each, or 'to be shared by … only'",
  heads.every((h) => /^\d+ × Individually allocated for [^,]+$/.test(h.trim()) && !/ and /.test(h) || /^\d+ × .+ to be shared by .+ only$/.test(h.trim())), heads.join(" | "));
const blocks = await page.locator(".smb-k__plate").allInnerTexts();
check("every block ends 'not for sharing.' / 'not for the rest of the table.'", blocks.every((b) => / only, not for (sharing|the rest of the table)\.$/.test(b.trim())));
await noPlate("docket");
await dashes("docket");
await shot("docket");
await page.reload();
await page.locator(".smb-k__title, #smb-table").first().waitFor();
check("refresh on the docket keeps the docket", (await page.locator(".smb-k__title").count()) === 1);
await page.goto(`${BASE}/kisa#kitchen`);
await page.reload();
await page.locator(".smb-k__title, #smb-table").first().waitFor();
check("old #kitchen link opens the docket", (await page.locator(".smb-k__title").count()) === 1);
check("no page errors", errors.length === 0, errors.join(" ; "));
await browser.close();
console.log(`${which}: ${fails} failures`);
process.exit(fails ? 1 : 0);
