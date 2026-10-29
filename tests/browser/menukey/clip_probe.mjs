// Is any open MenuKey results section clipped? Usage: node clip_probe.mjs [iphone|android]  (BASE env)
import { webkit, chromium, devices } from "playwright-core";
const BASE = process.env.BASE || "https://menukey.co.nz";
const which = process.argv[2] || "iphone";
const device = which === "android" ? devices["Pixel 7"] : devices["iPhone 13"];
const browser = await (which === "android" ? chromium.launch({ executablePath: process.env.CHROME }) : webkit.launch());
// Light selections leave the most dishes in one section, which is when a section gets tall.
const cases = [["kisa", "Dairy"], ["kisa", "Eggs"], ["mr-gos", "Eggs"], ["ombra", "Eggs"], ["ombra", "Dairy"]];
let clipped = 0;
for (const [venue, pick] of cases) {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${venue}`);
  await page.getByRole("button", { name: "I Understand" }).tap({ timeout: 15000 });
  await page.locator("button", { hasText: new RegExp(`^\\s*\\S*\\s*${pick}\\s*$`) }).first().tap();
  await page.getByRole("button", { name: "Submit" }).tap();
  await page.locator(".severity-modal__checkbox").tap();
  await page.getByRole("button", { name: "Confirm" }).tap();
  await page.locator(".results-container").waitFor({ timeout: 60000 });
  for (const h of await page.locator(".accordion__header[aria-expanded=false]").all()) await h.tap();
  await page.waitForTimeout(700);
  const secs = await page.locator(".accordion").evaluateAll((els) =>
    els.map((e) => {
      const c = e.querySelector(".accordion__content");
      const box = c.getBoundingClientRect();
      const items = [...c.querySelectorAll(".menu-item")];
      const cut = items
        .filter((i) => i.getBoundingClientRect().bottom > box.bottom + 1)
        .map((i) => i.querySelector(".menu-item__name").innerText);
      return { title: e.querySelector(".accordion__title").innerText, items: items.length, full: c.scrollHeight, shown: c.clientHeight, cut };
    })
  );
  for (const s of secs) {
    if (s.cut.length) clipped++;
    console.log(
      `${venue} [${pick}] ${s.title}: ${s.items} dishes, ${s.full}px tall, ${s.shown}px shown` +
        (s.cut.length ? `  CLIPPED: ${s.cut.length} hidden (${s.cut.slice(0, 3).join(", ")}...)` : "")
    );
  }
  await ctx.close();
}
await browser.close();
console.log(`${which}: ${clipped} clipped sections`);
process.exit(clipped ? 1 : 0);
