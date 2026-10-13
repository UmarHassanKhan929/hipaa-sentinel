import { chromium } from 'playwright-core';
import { tmpdir } from 'os';

const BASE = 'http://localhost:3000';
const SHOT_DIR = process.env.SHOT_DIR ?? tmpdir();
const shots = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1180, height: 950 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const shot = async (name) => {
  const p = `${SHOT_DIR}/${name}.png`;
  await page.screenshot({ path: p, fullPage: true });
  shots.push(name);
};

const badge = (n) => page.locator('.card').nth(n).locator('.status').innerText();
const out = (n) => page.locator('.card').nth(n).locator('.out').innerText();
const click = async (n, buttonLabel) => {
  await page.locator('.card').nth(n).getByRole('button', { name: buttonLabel }).click();
  await page.waitForTimeout(700);
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await shot('qa-1-anonymous');

// anonymous: everything should 401
await click(0, 'load');
await click(1, 'load');
await click(2, 'crash it');
console.log('anon badges:', await badge(0), await badge(1), await badge(2));
if ((await badge(0)) !== '401' || (await badge(1)) !== '401' || (await badge(2)) !== '401')
  throw new Error('anonymous flow did not 401 everywhere');
await shot('qa-2-anonymous-401s');

// sign in as RESEARCHER
await page.selectOption('#role', 'RESEARCHER');
await page.fill('#userId', 'usr_researcher');
await page.getByRole('button', { name: 'sign in' }).click();
await page.waitForTimeout(500);
console.log('identity:', await page.locator('#identity').innerText());

await click(0, 'load');   // 200
await click(1, 'load');   // 403
await click(2, 'crash it'); // 403
await click(3, 'admit');  // 403
await click(4, 'refresh'); // 403 - audit trail is ADMIN only
console.log('researcher badges:', await badge(0), await badge(1), await badge(2), await badge(3), await badge(4));
if ((await badge(0)) !== '200' || (await badge(1)) !== '403' || (await badge(2)) !== '403' || (await badge(3)) !== '403' || (await badge(4)) !== '403')
  throw new Error('researcher flow broken');
await shot('qa-3-researcher');

// sign in as CLINICIAN
await page.selectOption('#role', 'CLINICIAN');
await page.fill('#userId', 'usr_dr_smith');
await page.getByRole('button', { name: 'sign in' }).click();
await page.waitForTimeout(500);

await click(1, 'load');   // 200
await click(2, 'crash it'); // 500 opaque + trackingId
await click(3, 'admit');  // 201 created
console.log('clinician badges:', await badge(1), await badge(2), await badge(3));
if ((await badge(1)) !== '200' || (await badge(2)) !== '500' || (await badge(3)) !== '201')
  throw new Error('clinician flow broken');

const crashText = await out(2);
if (!/trackingId/i.test(crashText)) throw new Error('crash output missing trackingId: ' + crashText);
console.log('crash out:', crashText.replace(/\s+/g, ' ').slice(0, 140));
await shot('qa-4-clinician');

// ADMIN: the audit trail itself
await page.selectOption('#role', 'ADMIN');
await page.fill('#userId', 'usr_admin');
await page.getByRole('button', { name: 'sign in' }).click();
await page.waitForTimeout(500);
await click(4, 'refresh'); // 200 + rows
console.log('admin audit badge:', await badge(4));
if ((await badge(4)) !== '200') throw new Error('audit trail not accessible for ADMIN');
const rowCount = await page.locator('#audit-body tr').count();
if (rowCount < 3) throw new Error('audit trail rows missing: ' + rowCount);
await shot('qa-5-admin-audit');

// sign out -> back to anonymous
await page.getByRole('button', { name: 'sign out' }).click();
await click(0, 'load');
console.log('after sign-out badge:', await badge(0));
if ((await badge(0)) !== '401') throw new Error('sign-out did not clear the token');
await shot('qa-6-signed-out');

console.log('console errors:', errors.length ? errors : 'none');
console.log('ALL QA CHECKS PASSED');
await browser.close();
