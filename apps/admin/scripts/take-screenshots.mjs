#!/usr/bin/env node
/**
 * Take screenshots of all admin pages and save to docs/images/
 * Usage: node scripts/take-screenshots.mjs [baseUrl]
 * Default baseUrl: http://localhost:5180
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:5180';
const OUT = resolve(__dirname, '../../../../docs/images');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  // 1. SPM — App List
  await page.goto(`${BASE}/tracker/setup`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, 'admin-setup-apps.png') });
  console.log('✓ admin-setup-apps.png');

  // 2. SPM — Page List (click first "进入")
  await page.click('table button:has-text("进入")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, 'admin-setup-pages.png') });
  console.log('✓ admin-setup-pages.png');

  // 3. Analysis — App Overview
  await page.goto(`${BASE}/tracker/analysis`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(OUT, 'admin-analysis-apps.png') });
  console.log('✓ admin-analysis-apps.png');

  // 4. Analysis — Page Analysis
  await page.click('.ant-card');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(OUT, 'admin-analysis-pages.png') });
  console.log('✓ admin-analysis-pages.png');

  // 5. Analysis — Block Analysis
  await page.click('table a');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(OUT, 'admin-analysis-blocks.png') });
  console.log('✓ admin-analysis-blocks.png');

  // 6. Analysis — Function + Trend Modal
  await page.click('table a');
  await page.waitForTimeout(1000);
  const trendBtns = page.locator('button:has-text("查看趋势")');
  if (await trendBtns.count() > 0) {
    await trendBtns.first().click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: resolve(OUT, 'admin-analysis-functions.png') });
  console.log('✓ admin-analysis-functions.png');

  console.log('\nDone — 6 screenshots saved to docs/images/');
} finally {
  await browser.close();
}
