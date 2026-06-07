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

  // ============ Advanced Analysis: Funnel ============
  http.post(`${BASE}/advanced-analysis/funnel`, async ({ request }) => {
    const body = await request.json() as { steps: { stepName: string; eventType: string; eventFilter?: string }[]; conversionWindowMinutes?: number };
    const steps = body.steps || [];
    let baseUsers = 50000 + r(20000);
    const funnelSteps = steps.map((step, i) => {
      if (i > 0) baseUsers = Math.floor(baseUsers * (0.3 + Math.random() * 0.5));
      return {
        stepIndex: i, stepName: step.stepName, eventType: step.eventType, eventFilter: step.eventFilter,
        count: baseUsers, users: Math.floor(baseUsers * 0.8),
        conversionRate: i === 0 ? 1 : baseUsers / (50000 + 20000),
        stepConversionRate: i === 0 ? 1 : 0.3 + Math.random() * 0.5,
        medianDurationSec: i > 0 ? 10 + r(120) : 0,
      };
    });
    const trend = Array.from({ length: 7 }, (_, d) => ({
      date: new Date(Date.now() - (6 - d) * 86400000).toISOString().slice(0, 10),
      steps: funnelSteps.map((s) => ({
        stepIndex: s.stepIndex,
        count: Math.max(0, s.count + r(5000) - 2500),
        conversionRate: Math.max(0, Math.min(1, s.conversionRate + (Math.random() - 0.5) * 0.1)),
      })),
    }));
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { steps: funnelSteps, overallConversionRate: funnelSteps[funnelSteps.length - 1]?.conversionRate || 0, totalEntrants: funnelSteps[0]?.count || 0, trend },
      timestamp: Date.now(),
    });
  }),

  // ============ Advanced Analysis: Retention ============
  http.post(`${BASE}/advanced-analysis/retention`, async ({ request }) => {
    const body = await request.json() as { retentionDays: number[] };
    const days = body.retentionDays || [1, 2, 3, 7, 14, 30];
    const cohorts = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      const initial = 1000 + r(3000);
      const rates: Record<string, number> = {};
      const counts: Record<string, number> = {};
      days.forEach((day) => {
        const rate = Math.max(0.05, 0.6 * Math.exp(-day * 0.08) + (Math.random() - 0.5) * 0.1);
        rates[`day${day}`] = Math.round(rate * 10000) / 10000;
        counts[`day${day}`] = Math.floor(initial * rate);
      });
      return { cohortDate: d.toISOString().slice(0, 10), initialUsers: initial, retentionRates: rates, retentionCounts: counts };
    });
    const curve = days.map((day) => {
      const avgRate = cohorts.reduce((s, c) => s + (c.retentionRates[`day${day}`] || 0), 0) / cohorts.length;
      return { day, rate: Math.round(avgRate * 10000) / 10000 };
    });
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { cohorts, retentionCurve: curve, summary: { day1Rate: curve[0]?.rate || 0, day7Rate: curve.find((c) => c.day === 7)?.rate || 0, day30Rate: curve.find((c) => c.day === 30)?.rate || 0, totalInitialUsers: cohorts.reduce((s, c) => s + c.initialUsers, 0) } },
      timestamp: Date.now(),
    });
  }),

  // ============ Advanced Analysis: User Path ============
  http.post(`${BASE}/advanced-analysis/path`, async ({ request }) => {
    const body = await request.json() as { depth: number };
    const depth = body.depth || 5;
    const pageNames = ['首页', '商品详情', '购物车', '结算页', '支付成功', '个人中心', '搜索结果', '分类页'];
    const nodes = pageNames.slice(0, Math.min(depth + 2, pageNames.length)).map((name, i) => ({
      name, value: (depth + 2 - i) * (500 + r(200)), depth: i,
    }));
    const transitions: { source: string; target: string; count: number; rate: number }[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 3, nodes.length); j++) {
        const count = 100 + r(800);
        transitions.push({ source: nodes[i].name, target: nodes[j].name, count, rate: Math.round((count / nodes[i].value) * 10000) / 10000 });
      }
    }
    const topPaths = [
      { path: ['首页', '商品详情', '购物车', '结算页', '支付成功'], count: 1200 + r(500), users: 800 + r(300), rate: 0.35 },
      { path: ['首页', '搜索结果', '商品详情', '购物车'], count: 800 + r(400), users: 500 + r(200), rate: 0.22 },
      { path: ['首页', '分类页', '商品详情', '购物车', '结算页'], count: 500 + r(300), users: 300 + r(200), rate: 0.15 },
    ];
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { nodes, transitions, topPaths, summary: { totalSessions: 5000 + r(3000), avgPathDepth: Math.round((3 + Math.random() * 2) * 10) / 10 } },
      timestamp: Date.now(),
    });
  }),

  // ============ Engineering: Plans ============
  http.get(`${BASE}/engineering/plans`, () => {
    const list = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      planName: ['v2.3.0 支付流程埋点', 'v2.3.0 首页改版埋点', 'v2.2.0 搜索优化埋点', 'v2.4.0 社交分享埋点', 'v2.1.0 注册流程埋点', 'v2.3.1 推送通知埋点'][i],
      appId: 1, appName: '主站应用', appVersion: `2.${3 - (i % 2)}.${i % 3}`,
      status: (['draft', 'reviewing', 'approved', 'online', 'draft', 'online'] as const)[i],
      events: [],
      submitter: ['zhangsan', 'lisi', 'wangwu'][i % 3],
      reviewer: i >= 2 ? ['admin', 'admin', undefined, 'admin'][i - 2] : undefined,
      reviewComment: i === 2 ? '方案合理，通过' : i === 5 ? '请补充属性定义' : undefined,
      createdAt: new Date(Date.now() - (5 - i) * 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
    }));
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { list, total: list.length, page: 1, size: 20, pages: 1 },
      timestamp: Date.now(),
    });
  }),

  http.get(`${BASE}/engineering/plans/:id`, ({ params }) => {
    const id = Number(params.id);
    const plan = {
      id, planName: 'v2.3.0 支付流程埋点', appId: 1, appName: '主站应用', appVersion: '2.3.0',
      status: (['draft', 'reviewing', 'approved', 'online'][id % 4]) as 'draft' | 'reviewing' | 'approved' | 'online',
      submitter: 'zhangsan', reviewer: id > 1 ? 'admin' : undefined,
      reviewComment: id === 3 ? '方案合理，通过' : undefined,
      events: [
        { eventKey: 'click_buy_now', eventName: '点击立即购买', category: 'click', description: '商品详情页点击立即购买按钮', properties: [{ propKey: 'product_id', propName: '商品ID', dataType: 'string' }, { propKey: 'price', propName: '价格', dataType: 'number' }], spmCode: 'a_web.b_product.c_action' },
        { eventKey: 'page_view_checkout', eventName: '结算页浏览', category: 'page_view', description: '进入结算页面', properties: [{ propKey: 'cart_size', propName: '购物车商品数', dataType: 'number' }], spmCode: 'a_web.b_checkout.c_info' },
        { eventKey: 'click_submit_order', eventName: '提交订单', category: 'click', description: '点击提交订单按钮', properties: [{ propKey: 'order_amount', propName: '订单金额', dataType: 'number' }, { propKey: 'payment_method', propName: '支付方式', dataType: 'string' }], spmCode: 'a_web.b_checkout.c_action' },
        { eventKey: 'page_view_pay_success', eventName: '支付成功页浏览', category: 'page_view', description: '支付成功后跳转', properties: [{ propKey: 'order_id', propName: '订单ID', dataType: 'string' }, { propKey: 'amount', propName: '实付金额', dataType: 'number' }], spmCode: 'a_web.b_checkout.c_success' },
      ],
      createdAt: '2024-06-01T10:00:00', updatedAt: '2024-06-05T14:30:00',
    };
    return HttpResponse.json({ code: 200, message: 'success', data: plan, timestamp: Date.now() });
  }),

  http.post(`${BASE}/engineering/plans`, async ({ request }) => {
    const body = await request.json() as { planName: string };
    const plan = { id: Date.now(), planName: body.planName, appId: 1, appName: '主站应用', appVersion: '1.0', status: 'draft', events: [], submitter: 'current_user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return HttpResponse.json({ code: 200, message: 'success', data: plan, timestamp: Date.now() }, { status: 201 });
  }),

  http.put(`${BASE}/engineering/plans/:id`, () => {
    return HttpResponse.json({ code: 200, message: 'success', data: { updatedAt: new Date().toISOString() }, timestamp: Date.now() });
  }),

  http.delete(`${BASE}/engineering/plans/:id`, () => {
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  http.post(`${BASE}/engineering/plans/:id/submit`, ({ params }) => {
    const plan = { id: Number(params.id), status: 'reviewing', updatedAt: new Date().toISOString() };
    return HttpResponse.json({ code: 200, message: 'success', data: plan, timestamp: Date.now() });
  }),

  http.post(`${BASE}/engineering/plans/:id/review`, async ({ request, params }) => {
    const body = await request.json() as { action: string; comment?: string };
    const newStatus = body.action === 'approve' ? 'approved' : 'rejected';
    const plan = { id: Number(params.id), status: newStatus, reviewer: 'admin', reviewComment: body.comment, updatedAt: new Date().toISOString() };
    return HttpResponse.json({ code: 200, message: 'success', data: plan, timestamp: Date.now() });
  }),

  http.post(`${BASE}/engineering/plans/:id/online`, ({ params }) => {
    const plan = { id: Number(params.id), status: 'online', updatedAt: new Date().toISOString() };
    return HttpResponse.json({ code: 200, message: 'success', data: plan, timestamp: Date.now() });
  }),

  // ============ Engineering: Lineage ============
  http.get(`${BASE}/engineering/lineage/events`, () => {
    const events = [
      { eventKey: 'click_buy_now', eventName: '点击立即购买', category: 'click', references: [{ refType: 'funnel', refId: 1, refName: '支付转化漏斗' }, { refType: 'dashboard', refId: 1, refName: '整体趋势看板' }, { refType: 'retention', refId: 2, refName: '购买用户留存' }], properties: [{ propKey: 'product_id', propName: '商品ID', dataType: 'string' }] },
      { eventKey: 'page_view_home', eventName: '首页浏览', category: 'page_view', references: [{ refType: 'dashboard', refId: 1, refName: '整体趋势看板' }, { refType: 'path', refId: 1, refName: '用户路径分析' }, { refType: 'dashboard', refId: 2, refName: '首页数据看板' }], properties: [] },
      { eventKey: 'click_add_cart', eventName: '加入购物车', category: 'click', references: [{ refType: 'funnel', refId: 1, refName: '支付转化漏斗' }, { refType: 'retention', refId: 1, refName: '加购用户留存' }], properties: [{ propKey: 'product_id', propName: '商品ID', dataType: 'string' }, { propKey: 'quantity', propName: '数量', dataType: 'number' }] },
      { eventKey: 'page_view_checkout', eventName: '结算页浏览', category: 'page_view', references: [{ refType: 'funnel', refId: 1, refName: '支付转化漏斗' }], properties: [{ propKey: 'cart_size', propName: '购物车商品数', dataType: 'number' }] },
      { eventKey: 'click_search', eventName: '搜索点击', category: 'click', references: [{ refType: 'path', refId: 1, refName: '用户路径分析' }, { refType: 'dashboard', refId: 3, refName: '搜索分析看板' }], properties: [{ propKey: 'keyword', propName: '搜索关键词', dataType: 'string' }] },
      { eventKey: 'exposure_banner', eventName: 'Banner曝光', category: 'exposure', references: [], properties: [{ propKey: 'banner_id', propName: 'Banner ID', dataType: 'string' }, { propKey: 'position', propName: '位置', dataType: 'number' }] },
    ];
    return HttpResponse.json({ code: 200, message: 'success', data: events, timestamp: Date.now() });
  }),

  http.get(`${BASE}/engineering/lineage/events/:eventKey`, ({ params }) => {
    const eventKey = params.eventKey as string;
    const lineage = {
      eventKey, eventName: eventKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), category: 'click',
      references: [{ refType: 'funnel' as const, refId: 1, refName: '支付转化漏斗' }, { refType: 'dashboard' as const, refId: 1, refName: '整体趋势看板' }, { refType: 'retention' as const, refId: 2, refName: '购买用户留存' }],
      properties: [{ propKey: 'product_id', propName: '商品ID', dataType: 'string' }],
    };
    return HttpResponse.json({ code: 200, message: 'success', data: lineage, timestamp: Date.now() });
  }),

  http.get(`${BASE}/engineering/lineage/events/:eventKey/graph`, ({ params }) => {
    const eventKey = params.eventKey as string;
    const graph = {
      nodes: [
        { id: eventKey, name: eventKey, type: 'event', symbolSize: 40 },
        { id: 'product_id', name: 'product_id', type: 'property', symbolSize: 20 },
        { id: 'funnel_1', name: '支付转化漏斗', type: 'funnel', symbolSize: 30 },
        { id: 'dashboard_1', name: '整体趋势看板', type: 'dashboard', symbolSize: 30 },
        { id: 'retention_2', name: '购买用户留存', type: 'retention', symbolSize: 30 },
      ],
      edges: [
        { source: 'funnel_1', target: eventKey, label: '使用' },
        { source: 'dashboard_1', target: eventKey, label: '使用' },
        { source: 'retention_2', target: eventKey, label: '使用' },
        { source: eventKey, target: 'product_id', label: '包含' },
      ],
    };
    return HttpResponse.json({ code: 200, message: 'success', data: graph, timestamp: Date.now() });
  }),

  // ============ Engineering: Debug ============
  http.post(`${BASE}/engineering/debug/sessions`, async ({ request }) => {
    const body = await request.json() as { deviceId?: string; userId?: string };
    return HttpResponse.json({
      code: 200, message: 'success',
      data: { deviceId: body.deviceId || 'device_001', userId: body.userId || 'test_user', platform: 'web', startTime: new Date().toISOString(), eventCount: 0 },
      timestamp: Date.now(),
    });
  }),

  http.delete(`${BASE}/engineering/debug/sessions/:sessionId`, () => {
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),
];
