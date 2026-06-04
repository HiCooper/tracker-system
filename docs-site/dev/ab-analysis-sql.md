# AB 实验数据分析与 SQL 示例

本文档介绍如何通过 ClickHouse SQL 查询，关联 AB 实验系统的分流数据和 Tracker 埋点行为数据，完成实验各变体的指标对比分析。

## 数据架构

GateFlow 的实验分析数据分布在两套 ClickHouse 数据库和一套 MySQL 中：

| 系统 | 库 | 表 | 内容 |
|------|------|------|------|
| AB 分流系统 | `victor` | `events` | SDK 上报的曝光、转化事件 |
| AB 分流系统 | `victor` | `experiment_metrics` | 按分钟预聚合的实验指标 |
| Tracker 埋点 | `gateflow_tracker` | `events` | 用户行为事件 (page_view, click 等) |
| 实验配置 | MySQL `victor_experiment` | `victor_experiment` | 实验定义 |
| 实验配置 | MySQL `victor_experiment` | `victor_variant` | 变体定义 |

两条事件流**在 ClickHouse 查询层通过 `user_id` 关联**，无需在写入时耦合。

```
victor.events (分流曝光)          gateflow_tracker.events (用户行为)
       │                                    │
       └────────── user_id JOIN ─────────────┘
                         │
                    AB 分析结果
```

## 表结构

### victor.events — AB 分流事件明细表

```sql
CREATE TABLE victor.events (
    event_date     Date DEFAULT toDate(timestamp),
    event_id       String,
    event_type     String,          -- exposure / conversion
    user_id        String,
    timestamp      DateTime64(3),
    platform       String,
    exp_ids        Array(String),   -- 关联的实验 ID 列表
    variants       Array(String),   -- 对应的变体标识
    layers         Array(String),   -- 对应的层标识
    properties     String,          -- JSON 格式自定义属性
    received_at    DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_date)
ORDER BY (event_date, event_type, user_id, timestamp);
```

`exp_ids` / `variants` / `layers` 为数组类型。一条事件可携带多个实验标签，物化视图通过 `ARRAY JOIN` 展开为独立行写入 `experiment_metrics`。

### victor.experiment_metrics — 预聚合指标表

```sql
CREATE TABLE victor.experiment_metrics (
    metric_date      Date DEFAULT toDate(minute_bucket),
    minute_bucket    DateTime,
    exp_id           String,
    variant          String,
    layer            String,
    total_events     UInt64 DEFAULT 0,
    unique_users     UInt64 DEFAULT 0,
    conversions      UInt64 DEFAULT 0,
    conversion_users UInt64 DEFAULT 0,
    total_revenue    Float64 DEFAULT 0,
    avg_revenue      Float64 DEFAULT 0,
    updated_at       DateTime64(3) DEFAULT now64(3)
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(metric_date)
ORDER BY (metric_date, exp_id, variant, layer, minute_bucket);
```

此表由物化视图 `mv_experiment_metrics` 和 `mv_conversion_metrics` 自动填充，引擎 `SummingMergeTree` 会自动合并同排序键的行。查询时使用 `FINAL` 修饰符获取准确值。

### gateflow_tracker.events — 埋点行为事件表

```sql
CREATE TABLE gateflow_tracker.events (
    event_id       String,
    event_type     String,          -- page_view / click / custom
    user_id        String,
    session_id     String,
    timestamp      DateTime64(3),
    page_url       String,
    element_id     String,
    element_type   String,
    element_text   String,
    exp_ids        Array(String),   -- 可关联的实验 ID
    variants       Array(String),
    properties     String,          -- JSON: {"button":"cta","revenue":"99"}
    event_index    UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (user_id, timestamp, event_type, session_id);
```

### MySQL — 实验配置表

```sql
-- 实验定义
CREATE TABLE victor_experiment (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    exp_id          VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    layer_id        BIGINT NOT NULL,
    status          ENUM('draft','pending_approval','running','stopped','archive'),
    primary_metric  VARCHAR(64),
    start_time      DATETIME,
    end_time        DATETIME,
    FOREIGN KEY (layer_id) REFERENCES victor_layer(id)
);

-- 变体定义
CREATE TABLE victor_variant (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    exp_id      VARCHAR(64) NOT NULL,
    variant_key VARCHAR(64) NOT NULL,
    name        VARCHAR(128),
    bucket_start INT,
    bucket_end   INT,
    params      TEXT,
    is_active   BOOLEAN DEFAULT TRUE
);
```

## 示例一：各变体核心指标对比

查询预聚合表 `experiment_metrics`，对比实验各变体的用户数、转化率、ARPU。

```sql
SELECT
    variant,
    sum(unique_users)     AS users,
    sum(conversions)      AS conversions,
    round(sum(conversions) / sum(unique_users), 4) AS conversion_rate,
    round(sum(total_revenue) / sum(unique_users), 2) AS arpu
FROM victor.experiment_metrics FINAL
WHERE exp_id = 'exp-homepage-cta'
  AND metric_date BETWEEN '2026-05-20' AND '2026-05-29'
GROUP BY variant
ORDER BY variant;
```

结果示例：

```
┌─variant──┬─users─┬─conversions─┬─conversion_rate─┬─arpu──┐
│ control  │ 4823  │     386     │      0.0800     │ 1.23  │
│ treatment│ 4791  │     451     │      0.0941     │ 1.45  │
└──────────┴───────┴─────────────┴─────────────────┴───────┘
```

## 示例二：曝光事件关联埋点行为 — 分析 CTA 点击率

AB 分析的核心场景。`victor.events` 中的曝光事件记录了「谁被分到哪个变体」，`gateflow_tracker.events` 中的点击事件记录了「谁点击了什么」。

两个表通过 `user_id` 关联：

```sql
WITH
-- 1. AB 分流系统的曝光用户
exposure AS (
    SELECT DISTINCT user_id, variants[1] AS variant
    FROM victor.events
    WHERE event_type = 'exposure'
      AND has(exp_ids, 'exp-homepage-cta')
      AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
),
-- 2. 埋点系统的 CTA 按钮点击用户
click AS (
    SELECT DISTINCT user_id
    FROM gateflow_tracker.events
    WHERE event_type = 'click'
      AND element_id = 'cta-button'
      AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
)
SELECT
    e.variant,
    count(DISTINCT e.user_id)  AS exposed_users,
    count(DISTINCT c.user_id)  AS clicked_users,
    round(count(DISTINCT c.user_id) / count(DISTINCT e.user_id), 4) AS ctr
FROM exposure e
LEFT JOIN click c ON e.user_id = c.user_id
GROUP BY e.variant
ORDER BY e.variant;
```

结果示例：

```
┌─variant──┬─exposed_users─┬─clicked_users─┬─ctr────┐
│ control  │     4823      │      289      │ 0.0599 │
│ treatment│     4791      │      345      │ 0.0720 │
└──────────┴───────────────┴───────────────┴────────┘
```

treatment 变体的 CTA 点击率比 control 高 **+20.2%**。

## 示例三：跨库关联 — 转化率加行为深度分析

同时关联三张表：AB 分流结果 + tracker 行为 + 预聚合转化指标。

```sql
WITH
-- 曝光用户及其变体
exposure AS (
    SELECT DISTINCT user_id, variants[1] AS variant
    FROM victor.events
    WHERE event_type = 'exposure'
      AND has(exp_ids, 'exp-pricing-test')
      AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
),
-- 有购买行为的用户（来自 tracker）
purchase AS (
    SELECT DISTINCT user_id, 
           toFloat64(JSONExtractString(properties, 'revenue')) AS revenue
    FROM gateflow_tracker.events
    WHERE event_type = 'click'
      AND element_id = 'purchase-button'
      AND properties LIKE '%"revenue"%'
      AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
),
-- 深度使用行为（浏览超过 3 页）
engaged AS (
    SELECT user_id, count(DISTINCT page_url) AS pages_viewed
    FROM gateflow_tracker.events
    WHERE event_type = 'page_view'
      AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
    GROUP BY user_id
    HAVING pages_viewed > 3
)
SELECT
    e.variant,
    count(DISTINCT e.user_id)         AS users,
    count(DISTINCT p.user_id)         AS buyers,
    round(count(DISTINCT p.user_id) / count(DISTINCT e.user_id), 4) AS conversion_rate,
    round(sum(p.revenue) / count(DISTINCT e.user_id), 2) AS arpu,
    count(DISTINCT eg.user_id)        AS engaged_users,
    round(count(DISTINCT eg.user_id) / count(DISTINCT e.user_id), 4) AS engagement_rate
FROM exposure e
LEFT JOIN purchase p ON e.user_id = p.user_id
LEFT JOIN engaged eg ON e.user_id = eg.user_id
GROUP BY e.variant
ORDER BY e.variant;
```

结果示例：

```
┌─variant──┬─users─┬─buyers─┬─conversion_rate─┬─arpu──┬─engaged─┬─engagement─┐
│ control  │ 5210  │   312  │          0.0599 │  1.89 │    1430 │     0.2745 │
│ treatment│ 5187  │   389  │          0.0750 │  2.31 │    1659 │     0.3198 │
└──────────┴───────┴────────┴─────────────────┴───────┴─────────┴────────────┘
```

treatment 变体的转化率 +25.2%、ARPU +22.2%、深度参与率 +16.5%。

## 示例四：日维度趋势分析

按天观察各变体的指标变化，发现新奇效应或衰减趋势。

```sql
SELECT
    metric_date,
    variant,
    sum(unique_users)  AS users,
    sum(conversions)   AS conversions,
    round(sum(conversions) / sum(unique_users), 4) AS conversion_rate
FROM victor.experiment_metrics FINAL
WHERE exp_id = 'exp-homepage-cta'
  AND metric_date BETWEEN '2026-05-20' AND '2026-05-29'
GROUP BY metric_date, variant
ORDER BY metric_date, variant;
```

结果示例：

```
┌─metric_date─┬─variant──┬─users─┬─conversions─┬─rate──┐
│ 2026-05-20  │ control  │  612  │     42      │ 0.0686│
│ 2026-05-20  │treatment │  598  │     45      │ 0.0753│
│ 2026-05-21  │ control  │  594  │     40      │ 0.0673│
│ 2026-05-21  │treatment │  603  │     52      │ 0.0862│
│    ...      │   ...    │  ...  │     ...     │  ...  │
└─────────────┴──────────┴───────┴─────────────┴───────┘
```

## 示例五：用户级收入明细

用于统计检验时计算用户级方差（StatsEngine 的 CUPED 和 Z-test 需要用户级数据）。

```sql
-- 用户级收入（用于计算方差）
SELECT
    user_id,
    variants[1] AS variant,
    count() AS event_count,
    sum(toFloat64(JSONExtractString(properties, 'revenue'))) AS user_revenue
FROM victor.events
WHERE event_type = 'conversion'
  AND has(exp_ids, 'exp-pricing-test')
  AND timestamp BETWEEN '2026-05-20' AND '2026-05-29'
GROUP BY user_id, variant;
```

## 数据关联全景

```
                        ┌─────────────────────┐
                        │   MySQL (实验配置)    │
                        │  victor_experiment   │ ← exp_id, status, primary_metric
                        │  victor_variant      │ ← variant_key, bucket range
                        └──────────┬───────────┘
                                   │ exp_id
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌──────────────────┐  ┌───────────────┐  ┌──────────────────────┐
   │  victor.events   │  │ victor.       │  │ gateflow_tracker.    │
   │  (AB 分流事件)    │  │ experiment_   │  │ events               │
   │                  │  │ metrics       │  │ (埋点行为事件)         │
   │  event_type:     │  │ (预聚合指标)    │  │                      │
   │  exposure        │  │               │  │  event_type:          │
   │  conversion      │  │  total_events │  │  page_view / click    │
   │                  │  │  conversions  │  │                      │
   │  exp_ids[]       │  │  total_revenue│  │  page_url            │
   │  variants[]      │  │  unique_users │  │  element_id          │
   └────────┬─────────┘  └───────────────┘  │  properties          │
            │                               └──────────┬───────────┘
            │                                          │
            └──────────── user_id JOIN ─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              聚合指标对比          用户行为深度分析
              (示例一/四)            (示例二/三/五)
```

- **快速仪表盘查询** → 用 `experiment_metrics`（已预聚合）
- **多维度行为分析** → `victor.events` JOIN `gateflow_tracker.events`
- **统计检验** → 查询用户级明细，传给 StatsEngine
