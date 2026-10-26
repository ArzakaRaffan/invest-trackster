// Run against scripts/invest-e2e.mjs --serve and both production frontends (3000 + 3001).
// Uses an installed Playwright tool, not a new application dependency.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const faults = [];
page.on('pageerror', e => faults.push(String(e)));
page.on('response', res => { if (res.status() >= 500 && res.url().startsWith('http://localhost:')) faults.push(`${res.status()} ${res.url()}`); });
let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
async function waitForText(locator, pattern) {
  await locator.waitFor();
  for (let i = 0; i < 60; i++) {
    if (pattern.test(await locator.innerText())) { checks++; return; }
    await page.waitForTimeout(100);
  }
  assert.match(await locator.innerText(), pattern);
}
async function sharedStyle(p, selector) {
  return p.locator(selector).evaluate(el => {
    const css = getComputedStyle(el);
    return { font: css.fontFamily, page: css.getPropertyValue('--page').trim(), card: css.getPropertyValue('--card').trim(), text: css.getPropertyValue('--text').trim(), pad: css.getPropertyValue('--pad').trim(), stack: css.getPropertyValue('--stack').trim(), row: css.getPropertyValue('--row-h').trim() };
  });
}
await mkdir('.artifacts', { recursive: true });
try {
  await page.goto('http://localhost:3001/login');
  await page.getByLabel('Username', { exact: true }).fill('invest_test_a');
  await page.locator('input[autocomplete="current-password"]').fill('synthetic-invest-only');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.waitForURL('**/app');
  await waitForText(page.getByTestId('actual-quota'), /125\.000,05/);
  eq((await context.cookies()).find(c => c.name === 'trackster_jwt').httpOnly, true, 'real shared httpOnly cookie');
  await page.getByRole('button', { name: /^(Konfirmasi|Perbarui) kas bebas$/ }).click();
  const dialog = page.getByRole('dialog');
  await page.getByLabel('Kas bebas (IDR)', { exact: true }).fill('90000.00');
  await page.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await waitForText(page.getByTestId('planning-limit'), /90\.000/);
  await page.reload(); await waitForText(page.getByTestId('planning-limit'), /90\.000/);
  await page.getByRole('button', { name: 'Periksa', exact: true }).first().click();
  await dialog.getByRole('combobox').selectOption('PARTIAL');
  await dialog.getByRole('checkbox').check();
  await dialog.getByLabel('Alasan / catatan pemeriksaan').fill('Synthetic browser reconciliation');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await waitForText(page.getByTestId('planned-quota'), /200\.000/);
  const baseline = await sharedStyle(page, '.invest-root');
  const trackster = await context.newPage();
  await trackster.goto('http://localhost:3000/demo');
  await trackster.locator('[data-screen-label="Trackster v3"] aside').waitFor();
  eq(await sharedStyle(trackster, '[data-screen-label="Trackster v3"]'), baseline, 'same live v3 font/tokens/density');
  eq(Math.round((await page.locator('aside').boundingBox()).width), Math.round((await trackster.locator('aside').boundingBox()).width), 'same desktop sidebar geometry');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.artifacts/desktop-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Perbarui kas bebas', exact: true }).click();
  await dialog.getByLabel('Kas bebas (IDR)', { exact: true }).fill('120000.00');
  await dialog.getByRole('checkbox').check();
  const month = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date());
  const current = await (await context.request.get(`http://localhost:4000/invest/budget?month=${month}`)).json();
  const race = await context.request.put('http://localhost:4000/invest/cash-confirmation', { headers: { Origin: 'http://localhost:3001' }, data: { month, amountIDR: '95000.00', confirmed: true, expectedRevision: current.revision } });
  eq(race.status(), 200, 'concurrent browser update');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  await waitForText(dialog.getByRole('alert'), /Data berubah/);
  eq(await dialog.getByLabel('Kas bebas (IDR)', { exact: true }).inputValue(), '120000.00', 'conflict preserves input');
  await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
  await page.getByRole('button', { name: 'Perbarui kas bebas', exact: true }).click();
  await page.keyboard.press('Escape');
  eq(await page.getByRole('dialog').count(), 0, 'Escape closes dialog');
  eq(await page.evaluate(() => document.activeElement?.textContent), 'Perbarui kas bebas', 'dialog restores keyboard focus');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Lega', exact: true }).click();
  eq((await sharedStyle(page, '.invest-root')).pad, '18px', 'compact density');
  await page.getByRole('button', { name: 'Gelap', exact: true }).last().click();
  eq((await sharedStyle(page, '.invest-root')).page, '#F2ECDD', 'light theme');
  await page.getByRole('button', { name: 'Indonesia', exact: true }).click();
  await waitForText(page.locator('h1'), /^Menu$/);
  eq(await page.locator('html').getAttribute('lang'), 'en', 'language setting');
  await page.reload();
  await page.getByRole('button', { name: 'Compact', exact: true }).waitFor();
  eq((await sharedStyle(page, '.invest-root')).pad, '18px', 'density persists');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await waitForText(page.locator('h1'), /A little at a time/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.artifacts/desktop-light-compact-en.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
  eq(await nav.getByRole('button').count(), 5, 'five mobile slots');
  eq(await page.locator('aside').isVisible(), false, 'desktop sidebar hidden on mobile');
  for (const button of await nav.getByRole('button').all()) assert.ok((await button.boundingBox()).height >= 44);
  checks++;
  eq(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '390px no horizontal overflow');
  await page.screenshot({ path: '.artifacts/mobile-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Update free cash', exact: true }).click();
  await page.getByRole('dialog').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  const bounds = await page.getByRole('dialog').boundingBox();
  eq(Math.round(bounds.x), 0, 'mobile dialog bottom-sheet geometry');
  assert.ok(Math.round(bounds.width) <= 390); checks++;
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Change theme', exact: true }).click();
  await page.screenshot({ path: '.artifacts/mobile-dark.png', fullPage: true });
  await context.setOffline(true);
  await waitForText(page.getByRole('status').first(), /offline/);
  await context.setOffline(false);
  for (const route of ['portfolio', 'market', 'reviews', 'sources']) {
    await page.goto(`http://localhost:3001/app/${route}`);
    await page.locator('h1').waitFor();
    eq(await page.locator('h1').count(), 1, `${route} route renders`);
  }
  await page.goto('http://localhost:3001/app/menu');
  await page.getByRole('button', { name: 'Sign out of the shared session', exact: true }).click();
  await page.waitForURL('**/login');
  eq((await context.cookies()).some(c => c.name === 'trackster_jwt'), false, 'shared session cookie cleared');
  await page.goto('http://localhost:3001/app');
  await page.waitForURL('**/login'); checks++;
  eq(faults, [], 'no runtime errors or server failures');
  console.log(`PASS: ${checks} browser assertions; login, cash, receipt reconciliation, conflicts, v3 parity, 390px navigation, preferences, offline, logout. Screenshots in .artifacts/.`);
} finally {
  await browser.close();
}
