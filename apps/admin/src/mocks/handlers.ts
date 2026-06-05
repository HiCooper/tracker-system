import { http, HttpResponse } from 'msw';

const BASE = '/api/v1';

// ============ In-memory seed stores ============
let appId = 1, pageId = 1, blockId = 1, funcId = 1;

interface App { id: number; appCode: string; appName: string; description: string; createdAt: string; }
interface PageItem { id: number; appId: number; appCode: string; pageCode: string; pageName: string; createdAt: string; }
interface BlockItem { id: number; pageId: number; blockCode: string; blockName: string; createdAt: string; }
interface FuncItem { id: number; blockId: number; funcCode: string; funcName: string; createdAt: string; }

const apps: App[] = [];
const pages: PageItem[] = [];
const blocks: BlockItem[] = [];
const functions: FuncItem[] = [];

function seed() {
  const a1: App = { id: appId++, appCode: 'a_web', appName: '主站应用', description: '面向C端用户的主站', createdAt: '2024-06-01T00:00:00' };
  const a2: App = { id: appId++, appCode: 'a_merchant', appName: '商家后台', description: '商家管理后台', createdAt: '2024-06-03T00:00:00' };
  const a3: App = { id: appId++, appCode: 'a_ds', appName: '数据平台', description: '内部数据平台', createdAt: '2024-06-05T00:00:00' };
  apps.push(a1, a2, a3);

  const pagesData: [number, string, string, string][] = [
    [a1.id, 'b_home', '首页', 'a_web'], [a1.id, 'b_product', '商品详情', 'a_web'],
    [a1.id, 'b_cart', '购物车', 'a_web'], [a1.id, 'b_search', '搜索结果', 'a_web'],
    [a1.id, 'b_user', '个人中心', 'a_web'], [a1.id, 'b_checkout', '结算页', 'a_web'],
    [a1.id, 'b_category', '分类页', 'a_web'], [a1.id, 'b_landing', '活动落地页', 'a_web'],
    [a2.id, 'b_dashboard', '首页看板', 'a_merchant'], [a2.id, 'b_goods', '商品管理', 'a_merchant'],
    [a2.id, 'b_order', '订单管理', 'a_merchant'], [a2.id, 'b_data', '数据中心', 'a_merchant'],
    [a2.id, 'b_setting', '店铺设置', 'a_merchant'],
    [a3.id, 'b_overview', '数据概览', 'a_ds'], [a3.id, 'b_reports', '报表中心', 'a_ds'],
    [a3.id, 'b_abtest', 'AB实验', 'a_ds'],
  ];
  for (const [aid, pc, pn, ac] of pagesData) {
    pages.push({ id: pageId++, appId: aid as number, appCode: ac as string, pageCode: `${ac}.${pc}`, pageName: pn, createdAt: '2024-06-0' + (1 + Math.floor(Math.random() * 9)) + 'T00:00:00' });
  }

  const blocksData: [number, string, string][] = [
    [1, 'c_banner', 'Banner区'], [1, 'c_recommend', '推荐区'], [1, 'c_nav', '导航区'], [1, 'c_feeds', 'Feed流'], [1, 'c_search_bar', '搜索栏'],
    [2, 'c_image', '图片区'], [2, 'c_action', '操作区'], [2, 'c_info', '商品信息'], [2, 'c_comment', '评论区'],
  ];
  for (const [pid, bc, bn] of blocksData) {
    const page = pages.find(p => p.id === pid);
    blocks.push({ id: blockId++, pageId: pid as number, blockCode: `${page!.pageCode}.${bc}`, blockName: bn, createdAt: '2024-06-01T00:00:00' });
  }

  const funcsData: [number, string, string][] = [
    [1, 'd_slide_1', '轮播图1'], [1, 'd_slide_2', '轮播图2'], [1, 'd_slide_3', '轮播图3'],
    [2, 'd_pic_1', '主图1'], [2, 'd_pic_2', '主图2'], [2, 'd_btn_buy', '购买按钮'],
  ];
  for (const [bid, fc, fn] of funcsData) {
    const block = blocks.find(b => b.id === bid);
    functions.push({ id: funcId++, blockId: bid as number, funcCode: `${block!.blockCode}.${fc}`, funcName: fn, createdAt: '2024-06-01T00:00:00' });
  }
}
seed();

function r(n: number) { return Math.floor(Math.random() * n); }

// ---- Mock data generators (pure, no React dependency) ----
function genTrendPoint(daysAgo: number): { time: string; exposurePv: number; exposureUv: number } {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return { time: d.toISOString().slice(0, 10), exposurePv: r(200000) + 50000, exposureUv: r(100000) + 20000 };
}

function genTrend(days: number) { return Array.from({ length: days }, (_, i) => genTrendPoint(days - 1 - i)); }

function genDayData(daysAgo: number) {
  const expPv = r(15000) + 5000, expUv = Math.floor(expPv * (0.4 + Math.random() * 0.3));
  const hasClick = daysAgo % 3 !== 0;
  const clkPv = hasClick ? Math.floor(expPv * (0.05 + Math.random() * 0.2)) : 0;
  const clkUv = hasClick ? Math.floor(clkPv * (0.5 + Math.random() * 0.3)) : 0;
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return { date: d.toISOString().slice(0, 10), exposurePv: expPv, exposureUv: expUv, clickPv: clkPv, clickUv: clkUv, ctr: hasClick ? clkPv / expPv : 0, penetrationRate: 0.2 + Math.random() * 0.4 };
}

function genDayDetail(days: number) { return Array.from({ length: days }, (_, i) => genDayData(i)).reverse(); }

export const handlers = [
  // ============ Setup: Apps ============
  http.get(`${BASE}/setup/apps`, () => {
    const list = apps.map(a => ({ ...a, pageCount: pages.filter(p => p.appId === a.id).length }));
    return HttpResponse.json({ code: 200, message: 'success', data: list, timestamp: Date.now() });
  }),
  http.post(`${BASE}/setup/apps`, async ({ request }) => {
    const body = await request.json() as { appName: string; appCode: string; description?: string };
    const a: App = { id: appId++, appCode: body.appCode, appName: body.appName, description: body.description || '', createdAt: new Date().toISOString() };
    apps.push(a);
    return HttpResponse.json({ code: 200, message: 'success', data: { ...a, pageCount: 0 }, timestamp: Date.now() }, { status: 201 });
  }),
  http.get(`${BASE}/setup/apps/:id`, ({ params }) => {
    const a = apps.find(x => x.id === Number(params.id));
    return a ? HttpResponse.json({ code: 200, message: 'success', data: { ...a, pageCount: pages.filter(p => p.appId === a.id).length }, timestamp: Date.now() })
      : HttpResponse.json({ code: 3001, message: '应用不存在', data: null, timestamp: Date.now() }, { status: 404 });
  }),
  http.delete(`${BASE}/setup/apps/:id`, ({ params }) => {
    const idx = apps.findIndex(x => x.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ code: 3001, message: '应用不存在', data: null, timestamp: Date.now() }, { status: 404 });
    apps.splice(idx, 1); return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // Setup: Pages
  http.get(`${BASE}/setup/apps/:appId/pages`, ({ params }) => {
    const list = pages.filter(p => p.appId === Number(params.appId)).map(p => ({ ...p, blockCount: blocks.filter(b => b.pageId === p.id).length }));
    return HttpResponse.json({ code: 200, message: 'success', data: list, timestamp: Date.now() });
  }),
  http.post(`${BASE}/setup/apps/:appId/pages`, async ({ params, request }) => {
    const body = await request.json() as { pageName: string; pageCode: string };
    const app = apps.find(a => a.id === Number(params.appId));
    const p: PageItem = { id: pageId++, appId: Number(params.appId), appCode: app!.appCode, pageCode: body.pageCode, pageName: body.pageName, createdAt: new Date().toISOString() };
    pages.push(p);
    return HttpResponse.json({ code: 200, message: 'success', data: { ...p, blockCount: 0 }, timestamp: Date.now() }, { status: 201 });
  }),
  http.delete(`${BASE}/setup/pages/:id`, ({ params }) => {
    const idx = pages.findIndex(x => x.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ code: 3002, message: '页面不存在', data: null, timestamp: Date.now() }, { status: 404 });
    pages.splice(idx, 1); return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // Setup: Blocks
  http.get(`${BASE}/setup/pages/:pageId/blocks`, ({ params }) => {
    const list = blocks.filter(b => b.pageId === Number(params.pageId)).map(b => ({ ...b, functionCount: functions.filter(f => f.blockId === b.id).length }));
    return HttpResponse.json({ code: 200, message: 'success', data: list, timestamp: Date.now() });
  }),
  http.post(`${BASE}/setup/pages/:pageId/blocks`, async ({ params, request }) => {
    const body = await request.json() as { blockName: string; blockCode: string };
    const p: BlockItem = { id: blockId++, pageId: Number(params.pageId), blockCode: body.blockCode, blockName: body.blockName, createdAt: new Date().toISOString() };
    blocks.push(p);
    return HttpResponse.json({ code: 200, message: 'success', data: { ...p, functionCount: 0 }, timestamp: Date.now() }, { status: 201 });
  }),
  http.delete(`${BASE}/setup/blocks/:id`, ({ params }) => {
    const idx = blocks.findIndex(x => x.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ code: 3003, message: '区块不存在', data: null, timestamp: Date.now() }, { status: 404 });
    blocks.splice(idx, 1); return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // Setup: Functions
  http.get(`${BASE}/setup/blocks/:blockId/functions`, ({ params }) => {
    const list = functions.filter(f => f.blockId === Number(params.blockId));
    return HttpResponse.json({ code: 200, message: 'success', data: list, timestamp: Date.now() });
  }),
  http.post(`${BASE}/setup/blocks/:blockId/functions`, async ({ params, request }) => {
    const body = await request.json() as { funcName: string; funcCode: string };
    const f: FuncItem = { id: funcId++, blockId: Number(params.blockId), funcCode: body.funcCode, funcName: body.funcName, createdAt: new Date().toISOString() };
    functions.push(f);
    return HttpResponse.json({ code: 200, message: 'success', data: f, timestamp: Date.now() }, { status: 201 });
  }),
  http.delete(`${BASE}/setup/functions/:id`, ({ params }) => {
    const idx = functions.findIndex(x => x.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ code: 3004, message: '功能不存在', data: null, timestamp: Date.now() }, { status: 404 });
    functions.splice(idx, 1); return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // ============ Analysis: Apps ============
  http.post(`${BASE}/analysis/apps`, () => {
    const list = apps.map(a => ({
      appCode: a.appCode, appName: a.appName,
      dau: r(500000) + 10000, totalPv: r(2000000) + 100000,
      pageCount: pages.filter(p => p.appId === a.id).length,
    }));
    return HttpResponse.json({ code: 200, message: 'success', data: list, timestamp: Date.now() });
  }),

  // Analysis: Pages (with trend)
  http.post(`${BASE}/analysis/apps/:appCode/pages`, ({ params }) => {
    const appPages = pages.filter(p => p.appCode === params.appCode);
    const pm = appPages.map(p => ({
      pageCode: p.pageCode, pageName: p.pageName,
      pv: r(800000) + 50000, uv: r(300000) + 20000,
      avgStayDuration: 15 + r(120), bounceRate: (20 + r(30)) / 100,
      blockCount: blocks.filter(b => b.pageId === p.id).length,
    }));
    const totalPv = pm.reduce((s, x) => s + x.pv, 0);
    const trend = genTrend(30);
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { trend, summary: { totalPv, totalUv: Math.floor(totalPv * 0.4), avgStay: 45 + r(30), bounceRate: (25 + r(20)) / 100 }, pages: pm },
      timestamp: Date.now(),
    });
  }),

  // Analysis: Blocks (with trend)
  http.post(`${BASE}/analysis/apps/:appCode/pages/:pageCode/blocks`, ({ params }) => {
    const page = pages.find(p => p.pageCode === `${params.appCode}.${params.pageCode}`);
    if (!page) return HttpResponse.json({ code: 3002, message: '页面不存在', data: null, timestamp: Date.now() }, { status: 404 });
    const pageBlocks = blocks.filter(b => b.pageId === page.id);
    const bm = pageBlocks.map((b, i) => {
      const hasClick = i < 2;
      return {
        blockCode: b.blockCode, blockName: b.blockName,
        exposurePv: r(400000) + 50000, exposureUv: r(200000) + 30000,
        clickPv: hasClick ? r(80000) + 10000 : 0,
        clickUv: hasClick ? r(50000) + 5000 : 0,
        ctr: hasClick ? (5 + r(20)) / 100 : 0,
        functionCount: r(5) + 1,
      };
    });
    const totalExp = bm.reduce((s, x) => s + x.exposurePv, 0);
    const trend = genTrend(30);
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { trend, summary: { totalExposurePv: totalExp, totalExposureUv: Math.floor(totalExp * 0.5), blockCount: bm.length }, blocks: bm },
      timestamp: Date.now(),
    });
  }),

  // Analysis: Functions (with trend)
  http.post(`${BASE}/analysis/apps/:appCode/pages/:pageCode/blocks/:blockCode/functions`, () => {
    const fm = Array.from({ length: r(5) + 1 }, (_, i) => {
      const hasClick = i < 2, expPv = r(150000) + 20000;
      return {
        funcCode: `d_func_${i}`, funcName: `功能点位 ${i + 1}`,
        exposurePv: expPv, exposureUv: Math.floor(expPv * 0.5),
        clickPv: hasClick ? r(50000) + 5000 : 0,
        clickUv: hasClick ? r(20000) + 3000 : 0,
        ctr: hasClick ? (10 + r(15)) / 100 : 0,
        penetrationRate: (20 + r(30)) / 100,
      };
    });
    const totalExp = fm.reduce((s, x) => s + x.exposurePv, 0);
    const trend = genTrend(30);
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { trend, summary: { totalExposurePv: totalExp, totalExposureUv: Math.floor(totalExp * 0.5), functionCount: fm.length }, functions: fm },
      timestamp: Date.now(),
    });
  }),

  // Analysis: Trend Detail
  http.post(`${BASE}/analysis/trend-detail`, async ({ request }) => {
    const body = await request.json() as { days: number };
    const detail = genDayDetail(body.days || 7);
    return HttpResponse.json({ code: 200, message: 'success', data: { detail }, timestamp: Date.now() });
  }),
];
