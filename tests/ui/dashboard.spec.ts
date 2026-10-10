import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const review = path.resolve('.impeccable/review');
test.beforeAll(() => fs.mkdirSync(review, { recursive: true }));
test.beforeEach(async ({ request }) => {
  await request.post('/api/control', { data: { action: 'pause' } });
  await request.post('/api/control', { data: { action: 'reset' } });
  await expect.poll(async () => (await (await request.get('/api/state')).json()).metrics.ticks).toBe(0);
  await request.post('/api/control', { data: { preset: 'steady' } });
});

test('desktop live controls, forecasts, fault events, and exports', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start experiment', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '5×', exact: true }).click();
  await page.getByRole('button', { name: 'Start experiment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(async () => (await (await request.get('/api/state')).json()).metrics.suppressed).toBeGreaterThan(4);
  await page.getByRole('switch', { name: 'Heating', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Heating', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('slider', { name: 'Randomness', exact: true }).focus();
  await page.getByRole('slider', { name: 'Randomness', exact: true }).press('End');
  await expect.poll(async () => (await (await request.get('/api/state')).json()).config.randomness).toBe(1);
  await page.getByRole('button', { name: 'Vibration spike', exact: true }).click();
  await expect.poll(async () => (await (await request.get('/api/state')).json()).metrics.events_delivered).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const ticks = (await (await request.get('/api/state')).json()).metrics.ticks;
  await page.getByRole('button', { name: 'Vibration', exact: true }).click();
  await page.getByRole('button', { name: 'Show exact readings' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Hide exact readings' }).click();
  await expect.poll(async () => (await (await request.get('/api/state')).json()).metrics.ticks).toBe(ticks);
  const report = await request.get('/api/export/json');
  expect(report.ok()).toBeTruthy();
  const exported = await report.json();
  expect(exported.samples.length).toBe(exported.snapshot.metrics.ticks);
  expect(exported.snapshot.metrics.events_expected).toBe(exported.snapshot.metrics.events_delivered);
  await page.screenshot({ path: path.join(review, 'desktop.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('mobile controls, keyboard input, reduced motion, and offline assets', async ({ page, request }) => {
  const external: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { external.push(url.href); return route.abort(); }
    return route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Shape the signal' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Motion', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '5×', exact: true }).click();
  await page.getByRole('button', { name: 'Start experiment', exact: true }).click();
  await expect.poll(async () => (await (await request.get('/api/state')).json()).metrics.ticks).toBeGreaterThan(12);
  await page.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect.poll(async () => (await (await request.get('/api/state')).json()).config.randomness).toBe(.85);
  await page.getByRole('slider', { name: 'Operating load' }).focus();
  await page.getByRole('slider', { name: 'Operating load' }).press('Home');
  await expect.poll(async () => (await (await request.get('/api/state')).json()).config.load).toBe(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.evaluate(() => document.fonts.check('12px Manrope') && document.fonts.check('12px "IBM Plex Mono"'))).toBeTruthy();
  expect(external).toEqual([]);
  await page.screenshot({ path: path.join(review, 'mobile.png'), fullPage: true });
});
