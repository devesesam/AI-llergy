// Closed sections take no space, open/close works, and the LAST dish of a long list is tappable.
// Usage: node accordion_check.mjs [iphone|android]  (BASE env)
import { webkit, chromium, devices } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:3100";
const which = process.argv[2] || "iphone";
const device = which === "android" ? devices["Pixel 7"] : devices["iPhone 13"];
const browser = await (which === "android" ? chromium.launch({ executablePath: process.env.CHROME }) : webkit.launch());
const page = await (await browser.newContext({ ...device })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let fails = 0;
const check = (n, ok, d = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  [${which}] ${n}${d ? " · " + d : ""}`); };

await page.goto(`${BASE}/kisa`);
await page.getByRole("button", { name: "I Understand" }).tap({ timeout: 15000 });
await page.locator("button", { hasText: /^\s*\S*\s*Eggs\s*$/ }).first().tap();
await page.getByRole("button", { name: "Submit" }).tap();
await page.locator(".severity-modal__checkbox").tap();
await page.getByRole("button", { name: "Confirm" }).tap();
await page.locator(".results-container").waitFor({ timeout: 60000 });

const safe = page.locator(".accordion--safe");
const h = () => safe.locator(".accordion__content").evaluate((c) => c.getBoundingClientRect().height);
const open = await h();
const full = await safe.locator(".accordion__content").evaluate((c) => c.scrollHeight);
check("open section shows its full height", Math.abs(open - full) < 2, `${open}px of ${full}px`);
await safe.locator(".accordion__header").tap();
await page.waitForTimeout(500);
check("closed section takes no space", (await h()) < 1, `${await h()}px`);
await safe.locator(".accordion__header").tap();
await page.waitForTimeout(500);
check("re-opened section full height again", Math.abs((await h()) - full) < 2, `${await h()}px`);

const last = safe.locator(".menu-item").last();
const lastName = (await last.locator(".menu-item__name").innerText()).trim();
await last.getByRole("button", { name: "+ Add to My Order" }).tap();
const bar = (await page.locator(".my-order-bar").innerText().catch(() => "")).trim();
check(`last dish (${lastName}) visible and tappable`, /\(1 dish\)/.test(bar), bar);
// Every dish card in every open section is inside its section's visible box.
const hidden = await page.locator(".accordion").evaluateAll((els) =>
  els.flatMap((e) => {
    const c = e.querySelector(".accordion__content");
    if (!c.classList.contains("accordion__content--open")) return [];
    const b = c.getBoundingClientRect().bottom;
    return [...c.querySelectorAll(".menu-item")].filter((i) => i.getBoundingClientRect().bottom > b + 1).map((i) => i.innerText.split("\n")[0]);
  })
);
check("no dish card outside its section", hidden.length === 0, hidden.join(", "));
check("no page errors", errors.length === 0, errors.join("; "));
await browser.close();
console.log(`${which}: ${fails} failures`);
process.exit(fails ? 1 : 0);
