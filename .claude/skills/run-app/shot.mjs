// Screenshot driver for the local dev app.
// Usage: node shot.mjs <url> <outPath> [--wait <selector>] [--click <selector>] [--full]
//
// Canonical copy lives in the repo; SKILL.md copies it next to the per-user
// playwright install because a bare `import 'playwright'` must resolve against
// that install's node_modules (NODE_PATH does not apply to ESM).
import { chromium } from 'playwright';

const [, , url, outPath, ...rest] = process.argv;

if (!url || !outPath) {
  console.error('usage: node shot.mjs <url> <outPath> [--wait <sel>] [--click <sel>] [--full]');
  process.exit(2);
}

/** @param {string} flag */
function flagValue(flag) {
  const i = rest.indexOf(flag);
  return i === -1 ? undefined : rest[i + 1];
}

const waitFor = flagValue('--wait');
const click = flagValue('--click');
const fullPage = rest.includes('--full');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/** @type {string[]} */
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

try {
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  console.log(`status: ${res?.status() ?? 'unknown'}`);

  if (waitFor) await page.waitForSelector(waitFor, { timeout: 20_000 });
  if (click) {
    await page.click(click, { timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  }

  await page.screenshot({ path: outPath, fullPage });
  console.log(`title: ${await page.title()}`);
  console.log(`screenshot: ${outPath}`);
  if (consoleErrors.length > 0) {
    console.log(`console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors.slice(0, 20)) console.log(`  - ${e}`);
  }
} finally {
  await browser.close();
}
