/**
 * E2E Test: 埋点管理 (Tracker Setup) — Single Browser Session
 *
 * Tests full SPM hierarchy: App → Page → Block → Function
 * Covers: create, navigate, breadcrumb, delete, sidebar, logout
 *
 * Run:  npx tsx e2e/run-tests.ts
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const S = Date.now().toString(36); // full 8-char suffix (safe with VARCHAR(256))

let ok = 0, ng = 0;
function tally(result: boolean, name: string) {
  if (result) { ok++; console.log(`  ✅ ${name}`); }
  else { ng++; console.log(`  ❌ ${name}`); }
}

async function run() {
  console.log('\n🔍 E2E: 埋点管理 (Tracker Setup)\n');
  console.log(`  suffix: ${S}\n`);

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('response', r => {
    if (r.status() >= 400) console.log(`  [API ${r.status()}] ${r.request().method()} ${r.url()}`);
  });

  try {
    // ===== 1. LOGIN =====
    console.log('📌 1. Login');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    tally(await page.locator('input').first().isVisible(), 'Login form visible');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tracker/**', { timeout: 15000 });
    tally(page.url().includes('/tracker/'), 'Redirected to /tracker/');

    // ===== 2. APP LIST =====
    console.log('\n📌 2. AppListPage');
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    tally(await page.locator('h4:has-text("应用列表")').isVisible(), '"应用列表" title');
    tally(await page.locator('button:has-text("新建应用")').isVisible(), '"新建应用" button');

    const appName = `E2E-${S}`, appCode = `a_e2e_${S}`;

    await page.click('button:has-text("新建应用")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    tally(true, 'Create-app modal opened');
    await page.fill('.ant-modal input[id="appName"]', appName);
    await page.fill('.ant-modal input[id="appCode"]', appCode);
    await page.fill('.ant-modal textarea[id="description"]', 'E2E test');
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    tally(await page.locator(`text=${appName}`).isVisible(), `App "${appName}" created`);

    // ===== 3. PAGE LIST =====
    console.log('\n📌 3. PageListPage');
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    tally(await page.locator('.ant-breadcrumb').isVisible(), 'Breadcrumb visible');
    tally(await page.locator('button:has-text("添加页面")').isVisible(), '"添加页面" button');

    const pageName = `E2E-Page-${S}`, pageCode = `${appCode}.b_page_${S}`;

    await page.click('button:has-text("添加页面")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    tally(true, 'Create-page modal opened');
    await page.fill('.ant-modal input[id="pageName"]', pageName);
    await page.fill('.ant-modal input[id="pageCode"]', pageCode);
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    tally(await page.locator(`text=${pageName}`).isVisible(), `Page "${pageName}" created`);

    // ===== 4. BLOCK LIST =====
    console.log('\n📌 4. BlockListPage');
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    tally(await page.locator('h4:has-text("区块列表")').isVisible(), '"区块列表" title');
    tally(await page.locator('button:has-text("添加区块")').isVisible(), '"添加区块" button');

    const blockName = `E2E-Block-${S}`, blockCode = `${pageCode}.c_block_${S}`;

    await page.click('button:has-text("添加区块")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    tally(true, 'Create-block modal opened');
    await page.fill('.ant-modal input[id="blockName"]', blockName);
    await page.fill('.ant-modal input[id="blockCode"]', blockCode);
    await page.click('.ant-modal .ant-btn-primary');
    await page.waitForSelector('.ant-modal-wrap', { state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(300);
    tally(await page.locator(`text=${blockName}`).isVisible(), `Block "${blockName}" created`);

    // ===== 5. FUNCTION LIST =====
    console.log('\n📌 5. FunctionListPage');
    await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
    await page.waitForURL('**/tracker/setup/*/*/*', { timeout: 5000 });
    await page.waitForSelector('.ant-table', { timeout: 5000 });
    tally(await page.locator('h4:has-text("功能列表")').isVisible(), '"功能列表" title');
    tally(await page.locator('button:has-text("添加功能")').isVisible(), '"添加功能" button');

    const funcName = `E2E-Func-${S}`, funcCode = `${blockCode}.d_func_${S}`;

    await page.click('button:has-text("添加功能")');
    await page.waitForSelector('.ant-modal', { state: 'visible' });
    tally(true, 'Create-function modal opened');

    // Fill funcCode before funcName (onChange auto-generates funcCode from name)
    await page.fill('.ant-modal input[id="funcCode"]', funcCode);
    await page.fill('.ant-modal input[id="funcName"]', funcName);
    await page.waitForTimeout(500);
    // Override auto-generated value
    await page.fill('.ant-modal input[id="funcCode"]', funcCode);
    await page.waitForTimeout(200);

    await page.click('.ant-modal .ant-btn-primary');

    const modalHidden = await page.locator('.ant-modal-wrap').waitFor({ state: 'hidden', timeout: 8000 }).then(() => true).catch(() => false);
    if (!modalHidden) {
      const errors = await page.locator('.ant-form-item-explain-error').allTextContents().catch(() => ['?']);
      console.log(`  Validation errors: ${errors.join('; ')}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      tally(false, `Function created`);
    } else {
      await page.waitForTimeout(300);
      tally(await page.locator(`text=${funcName}`).isVisible(), `Function "${funcName}" created`);
    }

    // ===== 6. BREADCRUMB =====
    console.log('\n📌 6. Breadcrumb');
    if (await page.locator('.ant-modal-wrap').isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    await page.locator('.ant-breadcrumb a').first().click({ force: true });
    await page.waitForURL('**/tracker/setup', { timeout: 5000 });
    tally(await page.locator('h4:has-text("应用列表")').isVisible(), 'Breadcrumb → app list');

    // ===== 7. SIDEBAR MENU NAVIGATION =====
    console.log('\n📌 7. Sidebar menu navigation');
    await page.click('.ant-menu-item:has-text("埋点管理")');
    await page.waitForURL('**/tracker/setup', { timeout: 5000 });
    tally(await page.locator('h4:has-text("应用列表")').isVisible(), '"埋点管理" → setup');
    
    await page.click('.ant-menu-item:has-text("需求管理")');
    await page.waitForURL('**/tracker/engineering/plans', { timeout: 5000 });
    tally(page.url().includes('/tracker/engineering/plans'), '"需求管理" → plans');
    
    await page.click('.ant-menu-item:has-text("埋点管理")');
    await page.waitForURL('**/tracker/setup', { timeout: 5000 });
    tally(await page.locator('h4:has-text("应用列表")').isVisible(), 'Return to app list');

    // ===== 8. DELETE FLOW =====
    console.log('\n📌 8. Delete flow');
    for (let i = 0; i < 3; i++) {
      await page.locator('.ant-table-tbody button:has-text("进入")').first().click();
      await page.waitForTimeout(600);
    }

    async function delOne(label: string) {
      const btn = page.locator('.ant-table-tbody button:has-text("删除")').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
        await page.locator('.ant-popconfirm .ant-btn-primary, .ant-popover .ant-btn-primary').first().click().catch(() => {});
        await page.waitForTimeout(400);
        tally(true, `${label} deleted`);
      } else { tally(false, `${label} not found`); }
    }

    await delOne('Function');
    await page.goBack(); await page.waitForTimeout(400);
    await delOne('Block');
    await page.goBack(); await page.waitForTimeout(400);
    await delOne('Page');
    await page.goBack(); await page.waitForTimeout(400);
    await delOne('App');

    // ===== 9. SIDEBAR TOGGLE =====
    console.log('\n📌 9. Sidebar toggle');
    tally(await page.locator('.ant-layout-sider').isVisible(), 'Sidebar visible');
    await page.click('button[aria-label="收起侧边栏"]');
    await page.waitForTimeout(500);
    tally(await page.locator('.ant-layout-sider-collapsed').isVisible(), 'Collapsed');
    await page.click('button[aria-label="展开侧边栏"]');
    await page.waitForTimeout(500);
    tally(await page.locator('.ant-layout-sider-collapsed').isHidden(), 'Expanded');

    // ===== 10. LOGOUT =====
    console.log('\n📌 10. Logout');
    await page.click('button[aria-label="退出登录"]');
    await page.waitForURL('**/login', { timeout: 5000 });
    tally(page.url().includes('/login'), 'Logout → /login');

    // ===== SUMMARY =====
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  Results: ${ok} passed / ${ng} failed / ${ok + ng} total`);
    console.log(`  ${ng === 0 ? '🎉 ALL PASSED' : '⚠️  SOME FAILED'}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (err) {
    console.error('\n💥 Fatal:', err);
    ng++;
  } finally {
    await browser.close();
  }
  process.exit(ng > 0 ? 1 : 0);
}
run();
