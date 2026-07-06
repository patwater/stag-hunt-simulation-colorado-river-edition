// Full-game smoke test: plays all 10 water years (or until dead pool)
// through the real UI in headless Chromium.
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const MODE = process.env.MODE ?? 'cooperate'; // 'cooperate' | 'defect'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.setDefaultTimeout(15000);

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();

// ── Setup: read all 6 roles ──────────────────────────────────────────────
for (let i = 0; i < 6; i++) {
  await page.getByText('✓').first().waitFor({ state: 'attached', timeout: 100 }).catch(() => {});
  const cards = page.locator('button', { hasText: 'MAF baseline' }).or(
    page.locator('button', { hasText: 'Federal oversight' }));
  await cards.nth(i).click();
  await page.getByRole('button', { name: /Done reading/ }).click();
}
await page.getByRole('button', { name: /Begin Water Year 1/ }).click();
console.log('setup: game started');

// ── Tutorial ─────────────────────────────────────────────────────────────
for (let i = 0; i < 5; i++) {
  const next = page.getByRole('button', { name: /Next|Start Playing/ });
  await next.click();
}
console.log('tutorial: dismissed');

// ── Play years ───────────────────────────────────────────────────────────
for (let yearLoop = 1; yearLoop <= 10; yearLoop++) {
  // Hydrology
  await page.getByTestId('draw-card').click();
  await page.getByTestId('to-federal').click();

  // Federal: keep the pre-filled tier (guidelines minimum)
  await page.getByTestId('to-negotiation').click();

  // Negotiation: skip straight to commitment
  await page.getByTestId('to-commitment').click();

  // Commitment: 6 players
  for (let p = 0; p < 6; p++) {
    await page.getByTestId('im-ready').click();
    if (MODE === 'defect' && p >= 2) {
      // States overdraw aggressively in defect mode
      const overdraw = page.getByTestId('defect-overdraw');
      if (await overdraw.isEnabled().catch(() => false)) await overdraw.check();
      const slider = page.getByTestId('diversion-slider');
      if (await slider.count() > 0) {
        await slider.evaluate(el => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, el.max);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
    }
    await page.getByTestId('lock-commitment').click();
  }

  // Resolution
  await page.getByTestId('resolve-year').click();

  // Game over?
  const over = await Promise.race([
    page.getByTestId('dead-pool-banner').waitFor({ timeout: 1500 }).then(() => 'deadpool'),
    page.getByTestId('game-complete-banner').waitFor({ timeout: 1500 }).then(() => 'complete'),
    page.getByTestId('draw-card').waitFor({ timeout: 1500 }).then(() => 'next-year'),
  ]).catch(() => 'unknown');

  console.log(`year ${yearLoop}: resolved → ${over}`);
  if (over === 'deadpool' || over === 'complete') {
    console.log(`GAME OVER after year ${yearLoop}: ${over}`);
    break;
  }
  if (over === 'unknown') {
    console.log('STUCK — dumping state');
    console.log(await page.content().then(c => c.slice(0, 2000)));
    process.exit(1);
  }
}

// Final assertions
const bodyText = await page.locator('body').innerText();
const finished = /DEAD POOL|Game Complete/.test(bodyText);
console.log(`finished: ${finished}`);
if (errors.length) {
  console.log('RUNTIME ERRORS:');
  errors.slice(0, 10).forEach(e => console.log(' -', e));
}
await browser.close();
process.exit(finished && errors.length === 0 ? 0 : 1);
