# 会话管理

本文档描述 Tracker 系统的会话聚合机制，包括会话生命周期、数据模型和服务端聚合策略。

## 会话生命周期

```
用户访问 → 创建会话 → 记录行为 → [更新聚合] → 会话结束 → 写入 sessions 表
                        ↑
                  visibilitychange / beforeunload / 超时30分钟
```

### 会话状态

| 状态 | 说明 | 触发条件 |
|------|------|---------|
| `active` | 活跃会话 | 用户有操作 |
| `paused` | 暂停会话 | visibilitychange (hidden) |
| `ended` | 已结束 | 超时 / 关闭页面 |

## 会话数据模型

```sql
CREATE TABLE gateflow_tracker.sessions (
    session_id     String,
    user_id        String,
    anonymous_id   String,
    platform       String,
    start_time     DateTime64(3),
    end_time       Nullable(DateTime64(3)),
    duration       Nullable(Int64),           -- 会话时长（毫秒）
    page_views     UInt32 DEFAULT 0,
    clicks         UInt32 DEFAULT 0,
    exposures      UInt32 DEFAULT 0,
    scroll_depth_max UInt8 DEFAULT 0,
    is_bounce      UInt8 DEFAULT 0,           -- 是否跳出（单页会话）
    first_page_url String,
    last_page_url  String,
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

## 聚合策略

### 触发时机

| 事件类型 | 聚合操作 |
|---------|---------|
| `page_view` | page_views++ |
| `click` | clicks++ |
| `exposure` | exposures++ |
| `scroll` | 更新 scroll_depth_max |

### 超时配置

```java
public class SessionProperties {
    private Duration timeout = Duration.ofMinutes(30);   // 会话超时
    private Duration heartbeatInterval = Duration.ofSeconds(30);  // 心跳间隔
}
```

超时判断：`当前时间 - last_active_at > 30分钟 → 会话结束`

### 会话质量指标

| 指标 | 计算方式 | 说明 |
|------|---------|------|
| 跳出率 | is_bounce / 总会话数 | 单页会话占比 |
| 平均时长 | AVG(duration) | 会话平均时长 |
| 平均浏览深度 | AVG(page_views) | 每会话平均浏览页面数 |
| 平均交互次数 | AVG(clicks + exposures) | 每会话平均交互次数 |
