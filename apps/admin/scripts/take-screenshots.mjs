#!/usr/bin/env node
/**
 * Generic frontend screenshot tool.
 * Usage: node take-screenshots.mjs [--out dir] <url1> [url2] [url3]
 */
import { chromium } from 'playwright';
import { resolve } from 'path';
import { mkdirSync } from 'fs';

const args = process.argv.slice(2);
let outDir = resolve('../../docs/images');
const urls = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) {
    outDir = resolve(args[++i]);
  } else {
    urls.push(args[i]);
  }
}

if (urls.length === 0) {
  console.error('Usage: node take-screenshots.mjs [--out dir] <url1> [url2] ...');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  for (const url of urls) {
    const name = url.replace(/https?:\/\//, '').replace(/[:\/]/g, '-').replace(/-$/, '') || 'index';
    console.log(`Capturing ${url} → ${name}.png`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  }
  console.log(`\nDone — ${urls.length} screenshots saved to ${outDir}`);
} finally {
  await browser.close();
}
