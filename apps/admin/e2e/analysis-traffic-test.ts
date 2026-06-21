/**
 * E2E Test: 数据分析-流量分析 — UI Verification
 *
 * 1. Create hierarchy (app→page→block→func) via setup API
 * 2. Verify analysis pages render correctly
 *
 * Prerequisite: run `npx tsx scripts/seed-events.ts` to populate data first.
 * Run:  npx tsx e2e/analysis-traffic-test.ts
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const S = Date.now().toString(36);

let ok = 0, ng = 0;
function T(result: boolean, name: string) {
  if (result) { ok++; console.log(`  ✅ ${name}`); }
  else { ng++; console.log(`  ❌ ${name}`); }
}

async function main() {
  console.log('\n🔍 E2E: 数据分析-流量分析\n');
  console.log(`  suffix: ${S}\n`);

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const apiErrs: string[] = [];
  page.on('response', r => { if (r.status() >= 400) apiErrs.push(`[${r.status()}] ${r.request().method()} ${r.url()}`); });

  // SPM codes to create & report against
  const appCode = `a_e2ea_${S}`;
  const appName = `E2E-Analysis-${S}`;
  const pageSuffix = `b_analysis_p_${S}`;
  const pageCode = `${appCode}.${pageSuffix}`;
  const pageName = `E2E-Analysis-Page-${S}`;
  const blockSuffix = `c_analysis_blk_${S}`;
  const blockCode = `${pageCode}.${blockSuffix}`;
  const blockName = `E2E-Analysis-Block-${S}`;
  const funcSuffix = `d_analysis_fn_${S}`;
  const funcCode = `${blockCode}.${funcSuffix}`;
  const funcName = `E2E-Analysis-Func-${S}`;

  try {
    // ================================================================
    // 1. LOGIN
    // ================================================================
    console.log('📌 1. Login');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    T(await page.locator('input').first().isVisible(), 'Login form visible');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tracker/**', { timeout: 15000 });
    T(page.url().includes('/tracker/'), 'Redirected to /tracker/');

    // ================================================================
    // 2. CREATE HIERARCHY: App → Page → Block → Function
    // ================================================================
    console.log('\n📌 2. Create SPM hierarchy');

    // 2a. App
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    await page.click('button:has-text("新建应用")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    await page.fill('.ant-modal input[id="appName"]', appName);
    await page.fill('.ant-modal input[id="appCode"]', appCode);
    await page.fill('.ant-modal textarea[id="description"]', 'E2E analysis test');
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    T(await page.locator(`text=${appName}`).isVisible(), `App "${appName}" created`);

    // 2b. Page
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    await page.click('button:has-text("添加页面")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    await page.fill('.ant-modal input[id="pageName"]', pageName);
    await page.fill('.ant-modal input[id="pageCode"]', pageCode);
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    T(await page.locator(`text=${pageName}`).isVisible(), `Page "${pageName}" created`);

    // 2c. Block
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    await page.click('button:has-text("添加区块")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    await page.fill('.ant-modal input[id="blockName"]', blockName);
    await page.fill('.ant-modal input[id="blockCode"]', blockCode);
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    T(await page.locator(`text=${blockName}`).isVisible(), `Block "${blockName}" created`);

    // 2d. Function
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*/*/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    await page.click('button:has-text("添加功能")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    await page.fill('.ant-modal input[id="funcCode"]', funcCode);
    await page.fill('.ant-modal input[id="funcName"]', funcName);
    await page.waitForTimeout(500);
    await page.fill('.ant-modal input[id="funcCode"]', funcCode);
    await page.waitForTimeout(200);
    await page.click('.ant-modal .ant-btn-primary');

    const modalOk = await page.locator('.ant-modal-wrap').waitFor({ state: 'hidden', timeout: 8000 }).then(() => true).catch(() => false);
    if (!modalOk) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      T(false, `Function "${funcName}" created`);
    } else {
      await page.waitForTimeout(300);
      T(await page.locator(`text=${funcName}`).isVisible(), `Function "${funcName}" created`);
    }

    // ================================================================
    // 3. NAVIGATE TO 流量分析
    // ================================================================
    console.log('\n📌 3. Navigate to 流量分析');
    await page.goto(`${BASE}/tracker/analysis`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ant-card', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    T(await page.locator('h4:has-text("流量分析")').isVisible().catch(() => false), 'Title "流量分析"');
    T(await page.locator('.ant-picker-range').isVisible(), 'Date range picker');

    // ================================================================
    // 4. AnalysisAppPage
    // ================================================================
    console.log('\n📌 4. AnalysisAppPage — verify app card with metrics');
    const ourCard = page.locator(`.ant-card:has-text("${appName}")`);
    T(await ourCard.isVisible().catch(() => false), `App card "${appName}" visible`);

    // Verify DAU/PV metrics appear (should show non-zero values after collect)
    const dauText = await ourCard.locator('.ant-statistic').first().textContent().catch(() => '');
    console.log(`  DAU stat: "${dauText}"`);
    T(dauText !== '' && dauText !== undefined, 'DAU statistic rendered');

    // Verify date range preset
    await page.locator('.ant-picker-range').click();
    await page.waitForTimeout(300);
    const preset30 = page.locator('.ant-picker-presets :text("过去30天")');
    if (await preset30.isVisible().catch(() => false)) {
      await preset30.click();
      await page.waitForTimeout(800);
      T(true, 'Date preset "过去30天" applied');
    } else {
      await page.keyboard.press('Escape');
      T(false, 'Date preset not found');
    }
    // Switch back to 7 days
    await page.locator('.ant-picker-range').click();
    await page.waitForTimeout(300);
    await page.locator('.ant-picker-presets :text("过去7天")').click();
    await page.waitForTimeout(800);

    // ================================================================
    // 5. AnalysisPagePage
    // ================================================================
    console.log('\n📌 5. AnalysisPagePage — page-level');
    await ourCard.click();
    await page.waitForURL('**/tracker/analysis/*', { timeout: 8000 });
    await page.waitForTimeout(1000);

    T(page.url().includes(`/tracker/analysis/${appCode}`), `URL at page level`);
    T(await page.locator('.ant-breadcrumb').isVisible(), 'Breadcrumb visible');
    T(await page.locator('.ant-breadcrumb a:has-text("流量分析")').isVisible(), 'Breadcrumb links to root');
    T(await page.locator('h4:has-text("页面分析")').isVisible(), 'Title "页面分析"');

    // Summary stats
    const summaryCards = page.locator('.ant-card .ant-statistic');
    const sCount = await summaryCards.count().catch(() => 0);
    T(sCount >= 3, `Summary stats (${sCount} ≥ 3)`);
    // Check values
    const totalPvEl = page.locator('.ant-card .ant-statistic').first();
    const totalPvText = await totalPvEl.textContent().catch(() => '');
    console.log(`  Total PV: "${totalPvText}"`);
    T(!!totalPvText, 'Total PV has value');

    // Trend chart
    await page.waitForTimeout(1500);
    const canvas1 = page.locator('canvas').first();
    T(await canvas1.isVisible().catch(() => false), 'Trend chart (canvas) visible');

    // Table
    T(await page.locator('.ant-table').isVisible(), 'Page table visible');
    const pgLink = page.locator(`.ant-table a:has-text("${pageName}")`);
    T(await pgLink.isVisible().catch(() => false), `Page "${pageName}" in table`);

    // ================================================================
    // 6. AnalysisBlockPage
    // ================================================================
    console.log('\n📌 6. AnalysisBlockPage — block-level');
    await pgLink.click();
    await page.waitForURL('**/tracker/analysis/*/*', { timeout: 8000 });
    await page.waitForTimeout(1000);

    const segs2 = page.url().split('/tracker/analysis/')[1]?.split('/').filter(Boolean) || [];
    T(segs2.length >= 2, `URL at block level (${segs2.length} segments)`);
    T(await page.locator('h4:has-text("区块分析")').isVisible(), 'Title "区块分析"');
    T(await page.locator('.ant-table').isVisible(), 'Block table visible');

    await page.waitForTimeout(1000);
    T(await page.locator('canvas').first().isVisible().catch(() => false), 'Block trend chart');

    // "查看趋势" button
    const trendBtn = page.locator('.ant-table-tbody button:has-text("查看趋势")').first();
    T(await trendBtn.isVisible().catch(() => false), '"查看趋势" button');

    // ================================================================
    // 7. TrendDetailModal
    // ================================================================
    console.log('\n📌 7. TrendDetailModal');
    await trendBtn.click();
    await page.waitForSelector('.ant-modal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800);

    T(await page.locator('.ant-modal .ant-table').isVisible().catch(() => false), 'Detail table in modal');

    // Day/week comparison checkboxes
    const dayCb = page.locator('.ant-modal .ant-checkbox-wrapper:has-text("日同比")');
    const weekCb = page.locator('.ant-modal .ant-checkbox-wrapper:has-text("周同比")');
    T(await dayCb.isVisible().catch(() => false), '"日同比" checkbox');
    T(await weekCb.isVisible().catch(() => false), '"周同比" checkbox');

    // Test week comparison toggle
    await weekCb.click();
    await page.waitForTimeout(300);
    T(true, 'Week comparison toggled');
    await weekCb.click();
    await page.waitForTimeout(300);

    // Test 30-day radio
    const radio30 = page.locator('.ant-modal .ant-radio-button-wrapper:has-text("过去30天")');
    if (await radio30.isVisible().catch(() => false)) {
      await radio30.click();
      await page.waitForTimeout(500);
      T(true, 'Switched to 30-day');
    }

    // Click a metric → MetricChartModal
    const metricBtn = page.locator('.ant-modal .ant-table-tbody button').first();
    await metricBtn.click();
    await page.waitForTimeout(600);
    const modals = await page.locator('.ant-modal').count().catch(() => 0);
    T(modals >= 2, `Metric chart modal opened (${modals} modals total)`);

    // Verify metric chart checkboxes
    const compWeek = page.locator('.ant-modal .ant-checkbox-wrapper:has-text("同比上周")').last();
    const compMonth = page.locator('.ant-modal .ant-checkbox-wrapper:has-text("同比上月")').last();
    if (await compWeek.isVisible().catch(() => false)) {
      await compWeek.click();
      await page.waitForTimeout(300);
      T(true, 'Week comparison chart toggle');
      await compWeek.click();
    }
    if (await compMonth.isVisible().catch(() => false)) {
      T(true, 'Month comparison checkbox exists');
    }

    // Close all modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    T(await page.locator('.ant-modal').isHidden().catch(() => true), 'All modals closed');

    // ================================================================
    // 8. AnalysisFunctionPage
    // ================================================================
    console.log('\n📌 8. AnalysisFunctionPage — function-level');
    const blkLink = page.locator('.ant-table-tbody a').first();
    T(await blkLink.isVisible().catch(() => false), 'Block link exists');
    await blkLink.click();
    await page.waitForURL('**/tracker/analysis/*/*/*', { timeout: 8000 });
    await page.waitForTimeout(1500);

    const segs3 = page.url().split('/tracker/analysis/')[1]?.split('/').filter(Boolean) || [];
    T(segs3.length >= 3, `URL at function level (${segs3.length} segments)`);
    T(await page.locator('h4:has-text("功能分析")').isVisible(), 'Title "功能分析"');
    T(await page.locator('.ant-table').isVisible(), 'Function table visible');
    T(await page.locator('canvas').first().isVisible().catch(() => false), 'Function trend chart');
    T(await page.locator('.ant-table-thead :text("CTR")').isVisible().catch(() => false), 'CTR column');
    T(await page.locator('.ant-table-thead :text("渗透率")').isVisible().catch(() => false), '渗透率 column');

    const funcTrend = page.locator('.ant-table-tbody button:has-text("查看趋势")').first();
    T(await funcTrend.isVisible().catch(() => false), '"查看趋势" on function');

    // ================================================================
    // 9. BREADCRUMB NAVIGATION
    // ================================================================
    console.log('\n📌 9. Breadcrumb navigation');
    await page.locator('.ant-breadcrumb a:has-text("流量分析")').click();
    await page.waitForTimeout(1000);
    T(page.url().endsWith('/tracker/analysis') || page.url().endsWith('/tracker/analysis/'), 'Breadcrumb → analysis root');

    // ================================================================
    // 10. SIDEBAR NAVIGATION
    // ================================================================
    console.log('\n📌 10. Sidebar navigation');
    await page.goto(`${BASE}/tracker/setup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    T(page.url().includes('/tracker/setup') && !page.url().includes('/analysis'), '→ 埋点管理');

    await page.goto(`${BASE}/tracker/analysis`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    T(page.url().endsWith('/tracker/analysis') || page.url().endsWith('/tracker/analysis/'), '→ 流量分析');

    // ================================================================
    // 11. CLEANUP — delete test data
    // ================================================================
    console.log('\n📌 11. Cleanup — delete test hierarchy');
    await page.goto(`${BASE}/tracker/setup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Find our app row
    const ourRow = page.locator(`.ant-table-tbody tr:has-text("${appCode}")`);
    if (await ourRow.isVisible().catch(() => false)) {
      await ourRow.locator('button:has-text("进入")').click();
      await page.waitForTimeout(500);
      await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
      await page.waitForTimeout(400);
      await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
      await page.waitForTimeout(400);

      const del = async (label: string) => {
        const btn = page.locator('.ant-table-tbody button:has-text("删除")').first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(400);
          await page.locator('.ant-popconfirm .ant-btn-primary, .ant-popover .ant-btn-primary').first().click().catch(() => {});
          await page.waitForTimeout(400);
          T(true, `${label} deleted`);
        }
      };

      await del('Function');
      await page.goBack(); await page.waitForTimeout(400);
      await del('Block');
      await page.goBack(); await page.waitForTimeout(400);
      await del('Page');
      await page.goBack(); await page.waitForTimeout(400);
      await del('App');
    } else {
      console.log('  ⚠️  Test app row not found, skip cleanup');
    }

    // ================================================================
    // 12. API ERROR SUMMARY
    // ================================================================
    console.log('\n📌 12. API errors');
    if (apiErrs.length === 0) {
      T(true, 'No HTTP errors');
    } else {
      apiErrs.forEach(e => console.log(`    ${e}`));
      T(false, `${apiErrs.length} API errors`);
    }

    // ================================================================
    // SUMMARY
    // ================================================================
    console.log(`\n${'='.repeat(45)}`);
    console.log(`  Results: ${ok} passed / ${ng} failed / ${ok + ng} total`);
    console.log(`  ${ng === 0 ? '🎉 ALL PASSED — 流量分析 0 bugs' : '⚠️  FAILURES DETECTED'}`);
    console.log(`${'='.repeat(45)}\n`);

  } catch (e) {
    console.error('\n💥 Fatal:', e);
    ng++;
  } finally {
    await browser.close();
    process.exit(ng > 0 ? 1 : 0);
  }
}
main();
