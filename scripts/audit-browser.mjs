// Non-mutating audit of the production app while the live soak continues.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:8000');
  await page.getByRole('heading', { name: 'The live journey' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(() => ({
    width: innerWidth, pageWidth: document.documentElement.scrollWidth,
    fonts: document.fonts.check('12px Manrope') && document.fonts.check('12px "IBM Plex Mono"'),
  }));
  const live = await (await page.request.get('http://127.0.0.1:8000/api/state')).json();
  const timing = await page.evaluate(() => new Promise(resolve => {
    const times = []; let previous; const started = performance.now();
    function frame(now) {
      if (previous !== undefined) times.push(now - previous);
      previous = now;
      if (now - started < 3000) requestAnimationFrame(frame);
      else {
        times.sort((a,b) => a-b);
        resolve({ frames: times.length, duration_ms: now - started,
                  mean_interval_ms: times.reduce((a,b) => a+b,0)/times.length,
                  p95_interval_ms: times[Math.floor(times.length*.95)] });
      }
    }
    requestAnimationFrame(frame);
  }));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) {
      const elements = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 15).map(el => ({ tag: el.tagName, class: el.getAttribute('class'), width: el.getBoundingClientRect().width })));
      throw new Error(`Horizontal overflow at ${width}px: ${JSON.stringify(elements)}`);
    }
  }
  const result = { passed: errors.length === 0 && external.length === 0 && layout.fonts && layout.pageWidth <= layout.width,
                   context: 'Headless Chromium production build; three-second requestAnimationFrame sampling, not a guarantee for every device',
                   errors, external_requests: external, layout,
                   experiment_state: live.state, simulation_speed: live.config.speed, animation_sampling: timing };
  fs.writeFileSync('evaluation/browser-audit.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (!result.passed) process.exitCode = 1;
} finally { await browser.close(); }
