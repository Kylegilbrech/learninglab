import { chromium } from "playwright-core";
const OUT = "/tmp/claude-0/-home-user-learninglab/49c08369-8217-5d0b-bf85-673eed685bb0/scratchpad";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:5178/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// close onboarding
if (await page.locator("#intro.on").count()) {
  await page.locator("#intro .sheetbtn.primary").click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${OUT}/01-market.png` });

// add first available player
await page.locator(".prow .btn.add:not([disabled])").first().click();
await page.waitForTimeout(200);

// auto draft via footer
await page.locator(".fbtn.ghost", { hasText: "Auto Draft" }).click();
await page.waitForTimeout(600);
const bank = await page.locator("#bankVal").innerText();
const cnt = await page.locator("#cntVal").innerText();
const score = await page.locator("#scoreVal").innerText();

// go to squad
await page.locator('.tab[data-tab="squad"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-squad.png` });
const fieldPlayers = await page.locator(".field-player:not(.empty)").count();
const benchCount = await page.locator(".benchcard").count();

// open a player sheet, make captain
await page.locator(".field-player:not(.empty)").first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-sheet.png` });
const sheetOpen = await page.locator("#sheet.on").count();
await page.locator("#sheetcard .sheetbtn.ghost").click();
await page.waitForTimeout(200);

// reset → build (incomplete) view, then partial draft render
await page.locator(".fbtn.ghost", { hasText: "Reset" }).click();
await page.waitForTimeout(200);
await page.locator("#sheetcard .sheetbtn.danger").click();
await page.waitForTimeout(300);
const buildCols = await page.locator(".poscol").count();
const addCards = await page.locator(".benchcard").count();
await page.screenshot({ path: `${OUT}/04-build.png` });

console.log(JSON.stringify({
  errors, bank, cnt, score, fieldPlayers, benchCount, sheetOpen, buildCols, addCards,
}, null, 2));

await browser.close();
