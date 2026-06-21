/**
 * Seed script: simulate tracking events for a_policy_report
 *
 * Generates page_view, exposure, click, and stay events across 7 days
 * for the SPM hierarchy: a_policy_report → homepage → 3 blocks → 3 functions.
 *
 * Usage: npx tsx scripts/seed-events.ts
 */
const COLLECT = 'http://127.0.0.1:8088/api/v1/collect';
const APP = 'a_policy_report';

// ── SPM hierarchy ──
const PAGE = 'a_policy_report.b_homepage';
const BLOCKS = [
  'a_policy_report.b_homepage.c_top_banner',
  'a_policy_report.b_homepage.c_main_body',
  'a_policy_report.b_homepage.c_bottom_msg',
];
const FUNCTIONS = [
  'a_policy_report.b_homepage.c_top_banner.d_title',
  'a_policy_report.b_homepage.c_top_banner.d_report_msg',
  'a_policy_report.b_homepage.c_top_banner.d_github_link',
];

// ── Simulation params ──
const DAYS = 7;
const USERS = 50;
const EVENTS_PER_USER_PER_DAY: Record<string, { min: number; max: number }> = {
  page_view: { min: 2, max: 8 },
  exposure:  { min: 3, max: 15 },
  click:     { min: 0, max: 5 },
  stay:      { min: 1, max: 6 },
};

const NOW = Date.now();
const DAY_MS = 86400000;

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uid() {
  return `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

function makeEvent(
  eventType: string,
  dayOffset: number,
  userId: string,
  spmCode?: string,
  spmLevel?: number,
  extra: Record<string, unknown> = {},
) {
  const ts = NOW - dayOffset * DAY_MS - rand(0, DAY_MS);
  const event: Record<string, unknown> = {
    eventId: uid(),
    eventType,
    userId,
    anonymousId: `anon_${userId}`,
    timestamp: ts,
    clientTime: ts,
    platform: 'web',
    sdkVersion: '1.0.0-e2e',
    page: {
      url: `https://example.com/policy/${dayOffset}`,
      title: 'Policy Report - Home',
      referrer: dayOffset > 0 ? `https://example.com/policy/${dayOffset - 1}` : '',
    },
    session: {
      sessionId: `sess_${userId}_${dayOffset}`,
      startTime: ts - rand(0, 600000),
    },
    device: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      screenWidth: rand(1280, 1920),
      screenHeight: rand(800, 1200),
      language: 'zh-CN',
    },
  };

  if (spmCode) {
    event.data = { spmCode, spmLevel: spmLevel ?? 3, ...extra };
  }

  return event;
}

async function main() {
  console.log('🌱 Seeding events for', APP);
  console.log(`   Days: ${DAYS}, Users: ${USERS}`);

  // 1. Generate & send events day by day (no auth — matches SDK collect flow)
  let totalSent = 0;
  const headers = { 'Content-Type': 'application/json', 'X-App-Key': APP };

  for (let day = 0; day < DAYS; day++) {
    const batch: Record<string, unknown>[] = [];

    for (let u = 0; u < USERS; u++) {
      const userId = `user_${u}`;

      // page_view
      const pvCount = rand(EVENTS_PER_USER_PER_DAY.page_view.min, EVENTS_PER_USER_PER_DAY.page_view.max);
      for (let i = 0; i < pvCount; i++) {
        batch.push(makeEvent('page_view', day, userId, PAGE, 1));
      }

      // exposure (blocks — C位)
      const expCount = rand(EVENTS_PER_USER_PER_DAY.exposure.min, EVENTS_PER_USER_PER_DAY.exposure.max);
      for (let i = 0; i < expCount; i++) {
        const block = pick(BLOCKS);
        batch.push(makeEvent('exposure', day, userId, block, 2, {
          exposureDuration: rand(500, 30000),
          exposureRatio: Math.random() * 0.9 + 0.1,
          elementId: `block-${block.split('.').pop()}`,
          elementType: 'SECTION',
        }));
      }

      // exposure (functions — D位, 独立曝光)
      const funcExpCount = rand(EVENTS_PER_USER_PER_DAY.exposure.min, EVENTS_PER_USER_PER_DAY.exposure.max);
      for (let i = 0; i < funcExpCount; i++) {
        const func = pick(FUNCTIONS);
        batch.push(makeEvent('exposure', day, userId, func, 3, {
          exposureDuration: rand(200, 15000),
          exposureRatio: Math.random() * 0.9 + 0.1,
          elementId: `func-${func.split('.').pop()}`,
          elementType: pick(['BUTTON', 'LINK', 'INPUT']),
        }));
      }

      // click (functions — D位)
      const clickCount = rand(EVENTS_PER_USER_PER_DAY.click.min, EVENTS_PER_USER_PER_DAY.click.max);
      for (let i = 0; i < clickCount; i++) {
        const func = pick(FUNCTIONS);
        batch.push(makeEvent('click', day, userId, func, 3, {
          elementId: `func-${func.split('.').pop()}`,
          elementType: pick(['BUTTON', 'LINK', 'INPUT']),
          elementText: pick(['提交', '查看详情', '了解更多', '立即体验']),
          clickX: rand(100, 1200),
          clickY: rand(100, 800),
        }));
      }

      // stay
      const stayCount = rand(EVENTS_PER_USER_PER_DAY.stay.min, EVENTS_PER_USER_PER_DAY.stay.max);
      for (let i = 0; i < stayCount; i++) {
        batch.push(makeEvent('stay', day, userId, PAGE, 1, {
          stayDuration: rand(5000, 300000),
        }));
      }
    }

    // Send in chunks of 50 with a generous timeout
    const CHUNK = 50;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      const body = JSON.stringify({ events: chunk, clientId: 'seed-script' });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(COLLECT, { method: 'POST', headers, body, signal: controller.signal });
      clearTimeout(timeout);
      const json = await res.json() as { data?: { accepted: number; duplicate: number; rejected: number } };
      totalSent += json.data?.accepted ?? 0;
    }

    const dayLabel = new Date(NOW - day * DAY_MS).toISOString().slice(0, 10);
    console.log(`   Day ${day + 1}/${DAYS} [${dayLabel}]: ${batch.length} events`);
  }

  console.log(`\n✅ Done. ${totalSent} events accepted.`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
