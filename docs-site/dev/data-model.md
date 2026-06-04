# 埋点数据模型

Tracker 埋点系统采用三层数据模型来描述用户行为：**事件 (Event)**、**属性 (Property)** 和 **SPM 超级位置模型**。

## 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| 事件 (Event) | 用户执行的动作 | 点击首页横幅 |
| 属性 (Property) | 动作附带的上下文信息 | banner_id、position |
| SPM | 动作发生的页面位置 | HOME_BANNER_SLOT |

三者组合可唯一确定一个用户行为的所有上下文信息。

## 事件 (Event)

事件是埋点的核心单元，代表用户在产品中执行的一个具体动作。

| 分类 | 说明 | 典型场景 |
|------|------|---------|
| `page_view` | 页面浏览 | 用户打开某个页面 |
| `click` | 点击行为 | 用户点击按钮/链接 |
| `exposure` | 曝光事件 | 内容展示在可视区域 |
| `custom` | 自定义事件 | 业务特定行为 |

## ClickHouse 存储表

### 事件主表 (events)

```sql
CREATE TABLE gateflow_tracker.events (
    event_id       String,
    event_type     String,
    user_id        String,
    anonymous_id   String,
    session_id     String,
    timestamp      DateTime64(3),
    received_at    DateTime64(3) DEFAULT now64(3),

    -- 平台信息
    platform       String,
    app_version    String,
    sdk_version    String,

    -- 页面上下文
    page_url       String,
    page_title     String,
    page_referrer  String,

    -- 埋点路径 (a.b.c.d 四级)
    spma           String,
    spmb           String,
    spmc           String,
    spmd           String,

    -- 交互数据
    element_id     String,
    element_type   String,
    element_text   String,
    click_x        Nullable(Int32),
    click_y        Nullable(Int32),
    scroll_depth   Nullable(UInt8),
    stay_duration  Nullable(Int64),

    -- 归因数据
    utm_source     String,
    utm_medium     String,
    utm_campaign   String,
    utm_term       String,
    utm_content    String,

    -- 实验关联
    exp_ids        Array(String),
    variants       Array(String),

    -- 自定义属性 (JSON)
    properties     String,

    -- 元数据
    event_index    UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (user_id, timestamp, event_type, session_id)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

### 会话表 (sessions)

```sql
CREATE TABLE gateflow_tracker.sessions (
    session_id     String,
    user_id        String,
    anonymous_id   String,
    platform       String,
    start_time     DateTime64(3),
    end_time       Nullable(DateTime64(3)),
    duration       Nullable(Int64),
    page_views     UInt32 DEFAULT 0,
    clicks         UInt32 DEFAULT 0,
    exposures      UInt32 DEFAULT 0,
    is_bounce      UInt8 DEFAULT 0,
    utm_source     String,
    utm_medium     String,
    utm_campaign   String,
    device_type    String,
    os             String,
    last_active_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(last_active_at)
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (user_id, start_time)
TTL start_time + INTERVAL 90 DAY;
```

### 索引策略

```sql
ALTER TABLE events ADD INDEX idx_user_id user_id
    TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE events ADD INDEX idx_event_type event_type
    TYPE set(100) GRANULARITY 4;
ALTER TABLE events ADD INDEX idx_page_url page_url
    TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE events ADD INDEX idx_session session_id
    TYPE bloom_filter(0.01) GRANULARITY 4;
```

## 数据存储分层

| 存储层 | 数据库 | 表 | 用途 |
|--------|--------|-----|------|
| 原始数据 | ClickHouse | `gateflow_tracker.events` | 原始事件日志 |
| 会话数据 | ClickHouse | `gateflow_tracker.sessions` | 会话聚合 |
| 死信队列 | Redis | `dlq:*` | 失败事件暂存 |
| 去重缓存 | Redis | `dedup:*` | 5分钟去重窗口 |

## 事件与属性关系

- **Event : Property** = 1:N，一个事件可定义多个属性
- **Event : SPM** = 相互独立，事件描述"做什么"，SPM 描述"在哪里做"
