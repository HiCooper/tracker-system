# Tracker SDK 设计

本文档描述 Tracker 客户端 SDK 的架构设计，包括采集器模块、事件队列和上报机制。

## 模块结构

```
tracker-sdk/src/
├── core/                    # 核心模块
│   ├── Tracker.ts           # 主入口类
│   ├── Context.ts           # 上下文管理
│   └── Config.ts            # 配置管理
├── collectors/              # 采集器
│   ├── PageCollector.ts     # 页面采集 (SPA路由、来源解析)
│   ├── ClickCollector.ts    # 点击采集 (事件代理、坐标)
│   ├── ExposureCollector.ts # 曝光采集 (IntersectionObserver)
│   ├── ScrollCollector.ts   # 滚动采集 (深度、节流)
│   └── SessionCollector.ts  # 会话采集 (生成、超时)
├── queue/                   # 队列模块
│   ├── EventQueue.ts        # 事件队列
│   ├── StorageAdapter.ts    # 存储适配器 (IndexedDB)
│   └── Sender.ts            # 发送器 (batch + retry)
└── utils/                   # 工具函数
    ├── uuid.ts              # ID生成
    ├── parseUrl.ts          # URL解析
    └── throttle.ts          # 节流
```

## 核心接口

```typescript
class Tracker {
  constructor(config: TrackerConfig)
  init(): Promise<void>

  // 手动采集
  track(event: EventData): void
  trackPageView(page: PageData): void
  trackClick(element: Element, data?: ClickData): void
  trackExposure(element: Element, data?: ExposureData): void

  // 批量上报
  flush(): Promise<void>

  // 会话管理
  startSession(): void
  endSession(): void
  destroy(): void
}
```

## 采集器设计

### 页面采集器 (PageCollector)

监听 SPA 路由变化和页面可见性：

- `popstate` + `history.pushState` 拦截 → SPA 路由变化
- `visibilitychange` → 页面隐藏/显示
- `beforeunload` → 页面离开，上报停留时长

### 曝光采集器 (ExposureCollector)

使用 IntersectionObserver，双阈值判断：

| 条件 | 配置参数 | 默认值 |
|------|---------|--------|
| 可见比例阈值 | `thresholdRatio` | 50% |
| 曝光时长阈值 | `threshold` | 500ms |

只有元素在视口中可见 ≥ 50% 且持续 ≥ 500ms 才触发有效曝光事件。

### 点击采集器 (ClickCollector)

事件代理方式监听，300ms 防抖：

- 采集元素标识 (`data-track`、`data-id`)
- 采集元素文本 (`textContent`)
- 采集点击坐标 (`getBoundingClientRect`)

## 上报策略

| 事件类型 | 优先级 | 上报策略 |
|---------|--------|---------|
| `exposure` / `click` | 高 | 立即上报 |
| `page_view` / `scroll` | 中 | 批量上报 |
| 其他 | 低 | 批量上报 |

批量配置：

```javascript
batch: {
  maxSize: 50,      // 积累 50 条后批量发送
  interval: 2000,   // 每 2 秒检查一次
}
```

## 离线队列

网络断开时事件存入 IndexedDB，恢复后批量重发：

```
离线: track() → EventQueue → IndexedDB (暂存)
恢复: online 事件 → 读取 IndexedDB → 批量 POST
重试: 最大 3 次，超出则丢弃
```

### 配置示例

```javascript
const tracker = new Tracker({
  appId: 'gateflow-web',
  endpoint: 'https://tracker.gateflow.com/api/v1/collect',
  autoTrack: {
    pageView: { enabled: true, SPA: true },
    click: { enabled: true, selector: ['[data-track]', 'button', 'a'] },
    exposure: {
      enabled: true,
      selector: ['[data-exposure]'],
      threshold: 500,
      thresholdRatio: 0.5,
    },
    scroll: { enabled: true, thresholds: [25, 50, 75, 100] },
  },
  batch: { maxSize: 50, interval: 2000 },
  offline: { enabled: true, maxQueueSize: 100 },
});
```
