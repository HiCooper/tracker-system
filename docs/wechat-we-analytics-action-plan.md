# We 分析借鉴实施方案

> 基于 [wechat-we-analytics-benchmark.md](./wechat-we-analytics-benchmark.md) 的研究结论
> 排除经营工具，聚焦三大方向：**体验分析** · **性能质量** · **数据分析增强**

---

## 一、总体路线图

```
Phase 1 (2-3 周)        Phase 2 (4-6 周)          Phase 3 (8-12 周)
┌─────────────────┐    ┌──────────────────┐     ┌──────────────────┐
│ SDK 采集增强     │    │ 体验分析落地      │     │ 质量平台成型     │
│ • Core Web Vitals│───▶│ • 热力图页面      │────▶│ • 异常聚合+告警   │
│ • JS 异常捕获    │    │ • 转化分析升级    │     │ • Source Map 反解 │
│ • 接口性能打点   │    │ • 用户画像页面    │     │ • 性能趋势报表    │
└─────────────────┘    └──────────────────┘     └──────────────────┘
```

---

## 二、Phase 1：SDK 采集增强

### 2.1 SDK 增加 Core Web Vitals 采集

**现状**：SDK 完全不采集页面性能数据。
**微信做法**：We 分析内置性能模块，自动采集启动耗时、网络耗时、运行帧率、体验评分。

**实施方案**：在 `tracker-sdk.js` 增加 `setupPerformanceTracking()` 函数：

```javascript
function setupPerformanceTracking() {
  // LCP (Largest Contentful Paint)
  new PerformanceObserver(function(list) {
    var entries = list.getEntries();
    var last = entries[entries.length - 1];
    enqueue(buildEvent('perf_lcp', null, {
      pageUrl: location.href,
      properties: { value: last.startTime, rating: last.startTime < 2500 ? 'good' : last.startTime < 4000 ? 'needs-improvement' : 'poor' }
    }));
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // FID / INP (Interaction to Next Paint)
  new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) {
      enqueue(buildEvent('perf_inp', null, {
        pageUrl: location.href,
        properties: { value: entry.duration, rating: entry.duration < 200 ? 'good' : entry.duration < 500 ? 'needs-improvement' : 'poor' }
      }));
    });
  }).observe({ type: 'first-input', buffered: true });

  // CLS (Cumulative Layout Shift)
  var clsValue = 0;
  new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) { if (!entry.hadRecentInput) clsValue += entry.value; });
    enqueue(buildEvent('perf_cls', null, {
      pageUrl: location.href,
      properties: { value: clsValue, rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor' }
    }));
  }).observe({ type: 'layout-shift', buffered: true });

  // Navigation Timing（DNS、TCP、TTFB、DOM Ready、Page Load）
  if (performance.timing) {
    var t = performance.timing;
    var dnsTime = t.domainLookupEnd - t.domainLookupStart;
    var tcpTime = t.connectEnd - t.connectStart;
    var ttfb = t.responseStart - t.requestStart;
    var domReady = t.domContentLoadedEventEnd - t.navigationStart;
    var pageLoad = t.loadEventEnd - t.navigationStart;
    enqueue(buildEvent('perf_timing', null, {
      pageUrl: location.href,
      properties: { dnsTime: dnsTime, tcpTime: tcpTime, ttfb: ttfb, domReady: domReady, pageLoad: pageLoad }
    }));
  }
}
```

**配套后端**：
- `EventRecord` 已有 `Map<String, Object> properties`，`perf_*` 事件直接走 Kafka → ClickHouse 管道
- 无需改 Schema，无需改 tracker-service
- `HealthMonitorPage` 新增「性能概览」tab，从 ClickHouse 查询聚合

### 2.2 SDK 增加 JS 异常捕获

**现状**：SDK 不捕获前端异常。
**微信做法**：JS 异常分析 + Source Map 反解。

**实施方案**：在 SDK 增加 `setupErrorTracking()`：

```javascript
function setupErrorTracking() {
  // 同步异常
  var origOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    enqueue(buildEvent('error_js', null, {
      pageUrl: location.href,
      properties: {
        message: String(message).substring(0, 500),
        source: String(source).substring(0, 200),
        lineno: lineno, colno: colno,
        stack: error && error.stack ? String(error.stack).substring(0, 2000) : '',
        errorType: 'onerror'
      }
    }));
    if (origOnError) origOnError.apply(window, arguments);
  };

  // Promise 异常
  window.addEventListener('unhandledrejection', function(event) {
    enqueue(buildEvent('error_js', null, {
      pageUrl: location.href,
      properties: {
        message: String(event.reason || '').substring(0, 500),
        stack: event.reason && event.reason.stack ? String(event.reason.stack).substring(0, 2000) : '',
        errorType: 'unhandledrejection'
      }
    }));
  });
}
```

**配套后端**：
- `error_js` 事件进 ClickHouse，按 stack 指纹聚合去重
- Source Map 反解是 Phase 3 的事，先做堆栈聚合 + 趋势告警

### 2.3 SDK 增加 fetch/XHR 接口性能打点

**现状**：不监测业务接口。
**微信做法**：接口监控（官方 API + 自定义业务接口）。

**实施方案**：在 SDK 增加 `setupNetworkTracking()`：

```javascript
function setupNetworkTracking() {
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input.url || '');
    var start = now();
    return origFetch.apply(window, arguments).then(function(resp) {
      var duration = now() - start;
      if (url.indexOf(location.host) !== -1 || url.indexOf('/api/') !== -1) {
        enqueue(buildEvent('api_call', null, {
          pageUrl: location.href,
          properties: { url: url.replace(/\?.*/, '').substring(0, 200), method: (init && init.method) || 'GET', status: resp.status, duration: duration, success: resp.ok }
        }));
      }
      return resp;
    }, function(err) {
      var duration = now() - start;
      if (url.indexOf(location.host) !== -1 || url.indexOf('/api/') !== -1) {
        enqueue(buildEvent('api_call', null, {
          pageUrl: location.href,
          properties: { url: url.replace(/\?.*/, '').substring(0, 200), method: (init && init.method) || 'GET', status: 0, duration: duration, success: false, error: String(err).substring(0, 200) }
        }));
      }
      throw err;
    });
  };
}
```

**配套后端**：`api_call` 事件进 ClickHouse，Dashboard 新增「接口监控」面板。

### 2.4 SDK 补上 clickX/clickY

**现状**：`EventRecord` 预留了 `clickX`、`clickY` 字段，但 SDK 的 `buildEvent()` 没有写入。
**修改**：在 `buildEvent` 中增加这两个字段，并在 click 事件中传入 `event.clientX`/`event.clientY`。这是热力图的基础数据。

---

## 三、Phase 2：体验分析落地

### 3.1 热力图页面（新建）

**SDK 已有数据**：`clickX`、`clickY`、`elementId`、`exposureDuration`、`exposureRatio`（补上 clickX/Y 后即可用）

**新建页面**：`ExperienceHeatmapPage.tsx`

核心设计：
- 用户选择页面 URL（从 ClickHouse 拉取页面列表）
- 后端聚合：按 20px 网格分桶聚合 click 事件
- 前端 Canvas 渲染径向渐变热力圆点（参考 `simpleheat` 算法）
- 支持切换：点击热力图 / 曝光热力图 / 停留时长热力图

**后端 API**：

```sql
-- 点击热力图聚合
SELECT
  floor(clickX / 20) * 20 AS x_bucket,
  floor(clickY / 20) * 20 AS y_bucket,
  count() AS cnt
FROM events
WHERE eventType = 'click' AND pageUrl = ? AND clickX IS NOT NULL
GROUP BY x_bucket, y_bucket
```

### 3.2 转化分析可视化升级

**现状**：`PathAnalysisPage` 有 Sankey 图（页面流转）+ Top Paths 表格，偏技术化。
**微信做法**：交互式可视化转化分析，「探索页面与事件的流量流转，绘制用户体验地图」。

**改造方案**（主要是前端渲染升级）：

1. **Sankey 图增强**：点击节点高亮相关路径、连接线标注转化率
2. **新增「用户旅程地图」tab**：水平时间轴 + 步骤卡片视图
3. **新增「流失节点分析」tab**：高亮流失率最高的页面，标注关联的 error_js 事件

### 3.3 用户画像页面（新建）

**SDK 已有数据**：`deviceType`、`os`、`browser`、`language`、`screenWidth`、`screenHeight`、`pageReferrer`、`utmSource/Medium/Campaign`

**新建页面**：`UserPortraitPage.tsx`

```
┌──────────────────────────────────────────────┐
│ 用户画像概览              [日期选择器]         │
├─────────────┬────────────┬───────────────────┤
│ 设备分布     │ 浏览器分布  │ 来源渠道           │
│ 桌面 65%    │ Chrome 58% │ 直接访问 40%       │
│ 手机 32%    │ Safari 22% │ 搜索 25%           │
│ 平板 3%     │ ...        │ 社交媒体 18%        │
├─────────────┼────────────┼───────────────────┤
│ OS 分布      │ 屏幕分辨率  │ 语言分布           │
│ Windows 55% │ 1920×1080  │ zh-CN 82%         │
│ MacOS 30%   │ 1440×900   │ en-US 12%         │
│ ...         │ ...        │ ...               │
├─────────────┴────────────┴───────────────────┤
│ 用户活跃时段热力图（按小时 × 星期）             │
└──────────────────────────────────────────────┘
```

**数据来源**：全部来自已有事件字段，只需 ClickHouse 聚合查询。不需要采集新数据。

---

## 四、Phase 3：质量平台成型

### 4.1 HealthMonitor 升级

**现状**：`HealthMonitorPage` 只是服务 UP/DOWN 检查。
**目标**：变成 We 分析那样的「性能 + 质量」聚合视图。

**改造后**：

```
HealthMonitorPage 改造：
┌──────────────────────────────────────────────┐
│ 系统健康                    [自动刷新 30s]     │
├──────────────────────────────────────────────┤
│ 基础设施健康（已有，保留）                      │
│ [Tracker Admin ✓] [Tracker Service ✓] [CH ✓] │
├──────────────────────────────────────────────┤
│ 应用性能概览（新增）                           │
│ ┌─────────┬──────────┬──────────┬──────────┐ │
│ │ P50 LCP │ P50 FID  │ P50 CLS  │ 首屏时间  │ │
│ │ 1.2s ✓  │ 45ms ✓   │ 0.05 ✓   │ 2.1s      │ │
│ └─────────┴──────────┴──────────┴──────────┘ │
├──────────────────────────────────────────────┤
│ JS 异常趋势（新增）                             │
│ [折线图 - 近 24h]                              │
├──────────────────────────────────────────────┤
│ 接口异常 TOP 10（新增）                         │
│ [表格：路径 | 错误率 | P50耗时 | 趋势]         │
├──────────────────────────────────────────────┤
│ 采集管道健康（新增）                             │
│ [Kafka lag | 事件 QPS | DLQ 堆积 | 去重率]     │
└──────────────────────────────────────────────┘
```

### 4.2 Source Map 反解（P2）

- 用户在「SDK 配置」页面上传 Source Map 文件
- 后端存储到 MinIO/本地文件系统
- 异常堆栈中的文件名 + 行列号反解出源码位置
- 独立功能模块，P2 做

---

## 五、具体文件改动清单

### SDK 改动（1 个文件）

| 文件 | 改动 | 说明 |
|---|---|---|
| `apps/admin/public/tracker-sdk.js` | +120 行 | 新增 `setupPerformanceTracking()`、`setupErrorTracking()`、`setupNetworkTracking()`、click 事件补 `clickX`/`clickY` |

### 前端新增（4 个文件）

| 文件 | 说明 |
|---|---|
| `apps/admin/src/pages/tracker/experience/HeatmapPage.tsx` | 热力图页面 |
| `apps/admin/src/pages/tracker/experience/UserPortraitPage.tsx` | 用户画像页面 |
| `apps/admin/src/stores/experienceStore.ts` | 体验分析状态管理 |
| `apps/admin/src/services/experienceApi.ts` | 体验分析 API |

### 前端改造（2 个文件）

| 文件 | 改动 | 说明 |
|---|---|---|
| `apps/admin/src/pages/tracker/HealthMonitorPage.tsx` | 大幅改造 | UP/DOWN → 性能+异常+接口+管道聚合视图 |
| `apps/admin/src/pages/tracker/advanced/PathAnalysisPage.tsx` | 增加 tab | Sankey 升级 + 用户旅程地图 + 流失分析 |

### 后端新增

| 服务 | 文件 | 说明 |
|---|---|---|
| tracker-admin | `ExperienceAnalysisService.java` | 热力图聚合、用户画像聚合 |
| tracker-admin | `PerformanceAnalysisService.java` | 性能趋势聚合、异常聚合 |
| tracker-admin | ExperienceAnalysisController / PerformanceAnalysisController | REST API |
| tracker-service | **无需改动** | `perf_*`/`error_js`/`api_call` 事件走现有 Kafka → ClickHouse 管道 |

### 路由注册

| 路由 | 页面 |
|---|---|
| `/tracker/experience/heatmap/:appCode` | HeatmapPage |
| `/tracker/experience/portrait/:appCode` | UserPortraitPage |
| `/tracker/advanced/:appCode/path` | PathAnalysisPage（改造） |
| `/tracker/health` | HealthMonitorPage（改造） |

---

## 六、按投入产出比排序

| 优先级 | 事项 | 预估工时 | 关键收益 |
|---|---|---|---|
| 🔴 P0 | SDK 采集 Core Web Vitals + JS 异常 | 1d | SDK 天然能做，不改 Schema，不改后端 |
| 🔴 P0 | HealthMonitor 升级为性能+质量聚合页 | 1.5d | 视觉冲击力强，Demo 效果好，整合所有新数据 |
| 🔴 P0 | 点击热力图（前端为主） | 2d | 差异化最强，SDK 数据基本够用，后端简单 |
| 🟡 P1 | 用户画像页面 | 1d | 纯查询聚合，不需要采集新数据 |
| 🟡 P1 | SDK 接口性能打点 + Dashboard 面板 | 1d | 用户痛点强（接口挂了不知道） |
| 🟡 P1 | 路径分析可视化升级 | 1.5d | 不改后端，纯前端渲染升级 |
| ⚪ P2 | Source Map 反解 | 3d | 独立功能，难度较高 |
| ⚪ P2 | 会话回放 | 10d+ | 需评估产品 ROI 和存储成本 |

**核心亮点**：P0+P1 合计约 **8 个工作日**，能在下列方面产生显著差异化——

- **热力图**：市场上埋点产品少有的可视化能力（Mixpanel/Amplitude 都没有原生热力图）
- **一体化质量监控**：埋点 SDK 同时做性能和错误采集，用户不用另接 Sentry/Datadog
- **零 Schema 变更**：所有新增事件类型（`perf_*`、`error_js`、`api_call`）利用已有的 `properties` JSON 字段，不需要改 ClickHouse 表结构或 Kafka topic
