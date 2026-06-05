import { http, HttpResponse } from 'msw';
import { mockEvents, getEventById } from './events';
import { mockProperties, getPropertiesByEventId } from './properties';
import { mockSpms } from './spm';
import { mockDashboards } from './dashboards';
import { generateMockAnalysis } from './analysis';

const BASE = '/api/v1';

// Helper to create paginated response
function paginate<T>(list: T[], page: number, size: number) {
  const total = list.length;
  const pages = Math.ceil(total / size);
  const start = (page - 1) * size;
  const paged = list.slice(start, start + size);
  return { list: paged, total, page, size, pages };
}

// In-memory stores (for CRUD operations during session)
let eventsStore = [...mockEvents];
let propertiesStore = [...mockProperties];
let spmsStore = [...mockSpms];
let dashboardsStore = [...mockDashboards];
let nextEventId = 200;
let nextPropId = 300;
let nextSpmId = 400;
let nextDashId = 10;

export const handlers = [
  // ==================== Event CRUD ====================
  http.get(`${BASE}/events`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const size = Number(url.searchParams.get('size') || 20);
    const keyword = url.searchParams.get('keyword') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status');

    let filtered = [...eventsStore];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.eventKey.toLowerCase().includes(kw) ||
          e.eventName.toLowerCase().includes(kw) ||
          e.description.toLowerCase().includes(kw),
      );
    }
    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (status !== null && status !== '') {
      filtered = filtered.filter((e) => e.status === Number(status));
    }

    const result = paginate(filtered, page, size);
    return HttpResponse.json({ code: 200, message: 'success', data: result, timestamp: Date.now() });
  }),

  http.get(`${BASE}/events/:id`, ({ params }) => {
    const id = Number(params.id);
    const event = eventsStore.find((e) => e.id === id);
    if (!event) {
      return HttpResponse.json({ code: 3001, message: '事件不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    return HttpResponse.json({ code: 200, message: 'success', data: event, timestamp: Date.now() });
  }),

  http.post(`${BASE}/events`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    if (!body.eventKey || !body.eventName) {
      return HttpResponse.json({ code: 1001, message: '事件标识和名称不能为空', data: null, timestamp: Date.now() }, { status: 400 });
    }
    const duplicate = eventsStore.find((e) => e.eventKey === body.eventKey);
    if (duplicate) {
      return HttpResponse.json({ code: 2001, message: '事件标识重复', data: null, timestamp: Date.now() }, { status: 400 });
    }
    const newEvent = {
      id: nextEventId++,
      eventKey: body.eventKey as string,
      eventName: body.eventName as string,
      description: (body.description as string) || '',
      category: (body.category as 'page_view' | 'click' | 'exposure' | 'custom') || 'custom',
      status: (body.status as number) ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    eventsStore.unshift(newEvent);
    return HttpResponse.json({ code: 200, message: 'success', data: newEvent, timestamp: Date.now() }, { status: 201 });
  }),

  http.put(`${BASE}/events/:id`, async ({ request, params }) => {
    const id = Number(params.id);
    const idx = eventsStore.findIndex((e) => e.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3001, message: '事件不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    const body = await request.json() as Record<string, unknown>;
    eventsStore[idx] = {
      ...eventsStore[idx],
      ...(body.eventName !== undefined && { eventName: body.eventName as string }),
      ...(body.description !== undefined && { description: body.description as string }),
      ...(body.category !== undefined && { category: body.category as 'page_view' | 'click' | 'exposure' | 'custom' }),
      ...(body.status !== undefined && { status: body.status as number }),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ code: 200, message: 'success', data: eventsStore[idx], timestamp: Date.now() });
  }),

  http.delete(`${BASE}/events/:id`, ({ params }) => {
    const id = Number(params.id);
    const idx = eventsStore.findIndex((e) => e.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3001, message: '事件不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    eventsStore.splice(idx, 1);
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // ==================== Property CRUD ====================
  http.get(`${BASE}/events/:id/properties`, ({ params }) => {
    const eventId = Number(params.id);
    const props = getPropertiesByEventId(eventId);
    return HttpResponse.json({ code: 200, message: 'success', data: props, timestamp: Date.now() });
  }),

  http.post(`${BASE}/properties`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const event = eventsStore.find((e) => e.id === body.eventId);
    const newProp = {
      id: nextPropId++,
      eventId: body.eventId as number,
      eventName: event?.eventName || '',
      propKey: body.propKey as string,
      propName: body.propName as string,
      dataType: (body.dataType as 'string' | 'number' | 'boolean' | 'date') || 'string',
      description: (body.description as string) || '',
      createdAt: new Date().toISOString(),
    };
    propertiesStore.push(newProp);
    return HttpResponse.json({ code: 200, message: 'success', data: newProp, timestamp: Date.now() }, { status: 201 });
  }),

  http.delete(`${BASE}/properties/:id`, ({ params }) => {
    const id = Number(params.id);
    const idx = propertiesStore.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3002, message: '属性不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    propertiesStore.splice(idx, 1);
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // ==================== SPM CRUD ====================
  http.get(`${BASE}/spm`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const size = Number(url.searchParams.get('size') || 20);
    const keyword = url.searchParams.get('keyword') || '';

    let filtered = [...spmsStore];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.spmCode.toLowerCase().includes(kw) ||
          s.spmName.toLowerCase().includes(kw),
      );
    }

    const result = paginate(filtered, page, size);
    return HttpResponse.json({ code: 200, message: 'success', data: result, timestamp: Date.now() });
  }),

  http.post(`${BASE}/spm`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    if (!body.spmCode || !body.spmName) {
      return HttpResponse.json({ code: 1001, message: 'SPM编码和名称不能为空', data: null, timestamp: Date.now() }, { status: 400 });
    }
    const duplicate = spmsStore.find((s) => s.spmCode === body.spmCode);
    if (duplicate) {
      return HttpResponse.json({ code: 2002, message: 'SPM编码重复', data: null, timestamp: Date.now() }, { status: 400 });
    }
    const newSpm = {
      id: nextSpmId++,
      spmCode: body.spmCode as string,
      spmName: body.spmName as string,
      spmaLabel: (body.spmaLabel as string) || '',
      spmbLabel: (body.spmbLabel as string) || '',
      spmcLabel: (body.spmcLabel as string) || '',
      spmdLabel: (body.spmdLabel as string) || '',
      description: (body.description as string) || '',
      createdAt: new Date().toISOString(),
    };
    spmsStore.unshift(newSpm);
    return HttpResponse.json({ code: 200, message: 'success', data: newSpm, timestamp: Date.now() }, { status: 201 });
  }),

  http.put(`${BASE}/spm/:id`, async ({ request, params }) => {
    const id = Number(params.id);
    const idx = spmsStore.findIndex((s) => s.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3003, message: 'SPM不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    const body = await request.json() as Record<string, unknown>;
    spmsStore[idx] = {
      ...spmsStore[idx],
      ...(body.spmName !== undefined && { spmName: body.spmName as string }),
      ...(body.spmaLabel !== undefined && { spmaLabel: body.spmaLabel as string }),
      ...(body.spmbLabel !== undefined && { spmbLabel: body.spmbLabel as string }),
      ...(body.spmcLabel !== undefined && { spmcLabel: body.spmcLabel as string }),
      ...(body.spmdLabel !== undefined && { spmdLabel: body.spmdLabel as string }),
      ...(body.description !== undefined && { description: body.description as string }),
    };
    return HttpResponse.json({ code: 200, message: 'success', data: spmsStore[idx], timestamp: Date.now() });
  }),

  http.delete(`${BASE}/spm/:id`, ({ params }) => {
    const id = Number(params.id);
    const idx = spmsStore.findIndex((s) => s.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3003, message: 'SPM不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    spmsStore.splice(idx, 1);
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // ==================== Dashboard CRUD ====================
  http.get(`${BASE}/dashboards`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const size = Number(url.searchParams.get('size') || 20);
    const result = paginate([...dashboardsStore], page, size);
    return HttpResponse.json({ code: 200, message: 'success', data: result, timestamp: Date.now() });
  }),

  http.get(`${BASE}/dashboards/:id`, ({ params }) => {
    const id = Number(params.id);
    const dashboard = dashboardsStore.find((d) => d.id === id);
    if (!dashboard) {
      return HttpResponse.json({ code: 3004, message: '看板不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    return HttpResponse.json({ code: 200, message: 'success', data: dashboard, timestamp: Date.now() });
  }),

  http.post(`${BASE}/dashboards`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newDashboard = {
      id: nextDashId++,
      name: body.name as string,
      config: body.config as never,
      createdBy: 'admin',
      status: (body.status as number) ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dashboardsStore.unshift(newDashboard);
    return HttpResponse.json({ code: 200, message: 'success', data: newDashboard, timestamp: Date.now() }, { status: 201 });
  }),

  http.put(`${BASE}/dashboards/:id`, async ({ request, params }) => {
    const id = Number(params.id);
    const idx = dashboardsStore.findIndex((d) => d.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3004, message: '看板不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    const body = await request.json() as Record<string, unknown>;
    dashboardsStore[idx] = {
      ...dashboardsStore[idx],
      ...(body.name !== undefined && { name: body.name as string }),
      ...(body.config !== undefined && { config: body.config as never }),
      ...(body.status !== undefined && { status: body.status as number }),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ code: 200, message: 'success', data: dashboardsStore[idx], timestamp: Date.now() });
  }),

  http.delete(`${BASE}/dashboards/:id`, ({ params }) => {
    const id = Number(params.id);
    const idx = dashboardsStore.findIndex((d) => d.id === id);
    if (idx === -1) {
      return HttpResponse.json({ code: 3004, message: '看板不存在', data: null, timestamp: Date.now() }, { status: 404 });
    }
    dashboardsStore.splice(idx, 1);
    return HttpResponse.json({ code: 200, message: 'success', data: null, timestamp: Date.now() });
  }),

  // ==================== Analysis ====================
  http.post(`${BASE}/analysis/events`, () => {
    const data = generateMockAnalysis();
    return HttpResponse.json({ code: 200, message: 'success', data, timestamp: Date.now() });
  }),

  http.post(`${BASE}/analysis/events/realtime`, () => {
    const data = generateMockAnalysis();
    return HttpResponse.json({ code: 200, message: 'success', data, timestamp: Date.now() });
  }),

  http.post(`${BASE}/analysis/session`, () => {
    const days = 30;
    const sessionData: { time: string; value: number }[] = [];
    const durationData: { time: string; value: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const timeStr = date.toISOString().split('T')[0];
      sessionData.push({ time: timeStr, value: Math.round(8000 + Math.random() * 4000) });
      durationData.push({ time: timeStr, value: Math.round(180 + Math.random() * 120) });
    }
    const totalSessions = sessionData.reduce((s, p) => s + p.value, 0);
    const avgDur = Math.round(durationData.reduce((s, p) => s + p.value, 0) / days);

    return HttpResponse.json({
      code: 200, message: 'success',
      data: {
        interval: 'day',
        series: [
          { name: '会话次数', groupValue: 'total', data: sessionData },
          { name: '平均时长(秒)', groupValue: 'total', data: durationData },
        ],
        summary: {
          sessionCount: totalSessions,
          userCount: Math.round(totalSessions * 0.6),
          avgDuration: avgDur,
          avgPageDepth: 3.5,
          bounceCount: Math.round(totalSessions * 0.35),
          bounceRate: 0.35,
        },
      },
      timestamp: Date.now(),
    });
  }),
];
