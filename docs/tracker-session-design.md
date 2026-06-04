# Tracker 会话聚合服务设计

## 1. 概述

会话聚合服务负责将零散的用户行为事件聚合为完整的会话记录，包括会话时长、页面浏览数、点击数、跳出标识等指标。本文档定义会话的数据模型、聚合策略和服务端实现。

---

## 2. 会话数据模型

### 2.1 会话生命周期

```
用户访问 → 创建会话 → 记录行为 → [更新聚合] → 会话结束 → 写入 sessions 表
                          ↑
                    visibilitychange / beforeunload / 超时30分钟
```

### 2.2 会话状态

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `active` | 活跃会话 | 用户有操作 |
| `paused` | 暂停会话 | visibilitychange (hidden) |
| `ended` | 已结束 | 超时 / 关闭页面 |

### 2.3 Sessions 表结构

```sql
CREATE TABLE gateflow_tracker.sessions (
    session_id     String,
    user_id        String,
    anonymous_id   String,
    platform       String,

    start_time     DateTime64(3),
    end_time       Nullable(DateTime64(3)),
    duration       Nullable(Int64),           -- 会话时长（毫秒）

    -- 聚合指标
    page_views     UInt32 DEFAULT 0,
    clicks         UInt32 DEFAULT 0,
    exposures      UInt32 DEFAULT 0,
    scroll_depth_max UInt8 DEFAULT 0,

    -- 会话质量
    is_bounce      UInt8 DEFAULT 0,           -- 是否跳出（单页会话）
    bounce_page    String,                     -- 跳出页面 URL

    -- 页面序列
    first_page_url String,
    last_page_url  String,

    -- 归因数据
    utm_source     String,
    utm_medium     String,
    utm_campaign   String,

    -- 设备信息
    device_type    String,
    os             String,

    -- 元数据
    last_active_at DateTime64(3) DEFAULT now64(3)  -- 最后活跃时间（用于超时判断）

) ENGINE = ReplacingMergeTree(last_active_at)  -- 使用 last_active_at 作为版本
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (user_id, start_time)
TTL start_time + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;
```

---

## 3. 会话聚合策略

### 3.1 聚合触发时机

| 事件类型 | 聚合操作 |
|----------|----------|
| `page_view` | page_views++ |
| `click` | clicks++ |
| `exposure` | exposures++ |
| `scroll` | 更新 scroll_depth_max |

### 3.2 会话超时策略

```java
// 配置
public class SessionProperties {
    private Duration timeout = Duration.ofMinutes(30);  // 会话超时时间
    private Duration heartbeatInterval = Duration.ofSeconds(30);  // 心跳间隔
}
```

**超时判断逻辑**：
```
当前时间 - last_active_at > timeout → 会话结束
```

### 3.3 跳出判断逻辑

```sql
-- 跳出：只有一次页面浏览且会话时长 < 10秒
is_bounce = 1 WHEN page_views = 1 AND duration < 10000
is_bounce = 0 OTHERWISE
```

---

## 4. 服务端实现

### 4.1 SessionService

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final SessionRepository sessionRepository;
    private final EventCollectorService eventCollectorService;

    private final Duration SESSION_TIMEOUT = Duration.ofMinutes(30);

    /**
     * 获取或创建会话
     */
    public Session getOrCreateSession(String userId, String anonymousId, String sessionId, SessionContext context) {
        if (sessionId != null) {
            Session existing = sessionRepository.findById(sessionId);
            if (existing != null && !isExpired(existing)) {
                return existing;
            }
        }

        // 创建新会话
        Session newSession = Session.builder()
            .sessionId(generateSessionId())
            .userId(userId)
            .anonymousId(anonymousId)
            .platform(context.getPlatform())
            .startTime(Instant.now())
            .lastActiveAt(Instant.now())
            .firstPageUrl(context.getPageUrl())
            .lastPageUrl(context.getPageUrl())
            .utmSource(context.getUtmSource())
            .utmMedium(context.getUtmMedium())
            .utmCampaign(context.getUtmCampaign())
            .deviceType(context.getDeviceType())
            .os(context.getOs())
            .build();

        return sessionRepository.save(newSession);
    }

    /**
     * 更新会话聚合指标
     */
    public void updateSessionMetrics(String sessionId, EventRecord event) {
        Session session = sessionRepository.findById(sessionId);
        if (session == null) {
            log.warn("Session {} not found for metric update", sessionId);
            return;
        }

        // 检查会话是否已过期
        if (isExpired(session)) {
            log.info("Session {} expired, creating new session", sessionId);
            // 结束当前会话
            endSession(session);
            // 新会话在下次请求时创建
            return;
        }

        // 更新指标
        switch (event.getEventType()) {
            case "page_view":
                session.setPageViews(session.getPageViews() + 1);
                session.setLastPageUrl(event.getPageUrl());
                break;
            case "click":
                session.setClicks(session.getClicks() + 1);
                break;
            case "exposure":
                session.setExposures(session.getExposures() + 1);
                break;
            case "scroll":
                Integer scrollDepth = event.getScrollDepth();
                if (scrollDepth != null && scrollDepth > session.getScrollDepthMax()) {
                    session.setScrollDepthMax(scrollDepth.byteValue());
                }
                break;
        }

        // 更新最后活跃时间
        session.setLastActiveAt(Instant.now());

        sessionRepository.save(session);
    }

    /**
     * 结束会话
     */
    public void endSession(String sessionId) {
        Session session = sessionRepository.findById(sessionId);
        if (session != null) {
            endSession(session);
        }
    }

    private void endSession(Session session) {
        session.setEndTime(Instant.now());
        session.setDuration(
            Duration.between(session.getStartTime(), session.getEndTime()).toMillis()
        );

        // 判断跳出
        if (session.getPageViews() == 1 && session.getDuration() < 10000) {
            session.setIsBounce((byte) 1);
            session.setBouncePage(session.getFirstPageUrl());
        }

        sessionRepository.save(session);
        log.info("Session {} ended: duration={}ms, pv={}, clicks={}",
            session.getSessionId(), session.getDuration(),
            session.getPageViews(), session.getClicks());
    }

    /**
     * 检查会话是否过期
     */
    private boolean isExpired(Session session) {
        Duration inactiveDuration = Duration.between(session.getLastActiveAt(), Instant.now());
        return inactiveDuration.compareTo(SESSION_TIMEOUT) > 0;
    }

    private String generateSessionId() {
        return "sess_" + UUID.randomUUID().toString().replace("-", "");
    }
}
```

### 4.2 SessionRepository

```java
@Repository
@RequiredArgsConstructor
public class SessionRepository {

    private final ClickHouseTemplate clickHouseTemplate;

    // 缓存当前活跃会话（本地缓存 + Redis 分布式锁）
    private final Map<String, Session> localCache = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Session> redisTemplate;

    private static final String SESSION_KEY_PREFIX = "session:";
    private static final Duration SESSION_CACHE_TTL = Duration.ofMinutes(30);

    public Session findById(String sessionId) {
        // 1. 先查本地缓存
        Session cached = localCache.get(sessionId);
        if (cached != null) {
            return cached;
        }

        // 2. 查 Redis
        String key = SESSION_KEY_PREFIX + sessionId;
        Session session = redisTemplate.opsForValue().get(key);
        if (session != null) {
            localCache.put(sessionId, session);
            return session;
        }

        // 3. 查 ClickHouse
        session = clickHouseTemplate.queryOne(
            "SELECT * FROM sessions WHERE session_id = ?",
            sessionId
        );

        if (session != null) {
            redisTemplate.opsForValue().set(key, session, SESSION_CACHE_TTL);
            localCache.put(sessionId, session);
        }

        return session;
    }

    public Session save(Session session) {
        // 1. 保存到 ClickHouse
        clickHouseTemplate.execute(
            "INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            session.getSessionId(),
            session.getUserId(),
            session.getAnonymousId(),
            session.getPlatform(),
            session.getStartTime(),
            session.getEndTime(),
            session.getDuration(),
            session.getPageViews(),
            session.getClicks(),
            session.getExposures(),
            session.getScrollDepthMax(),
            session.getIsBounce(),
            session.getBouncePage(),
            session.getFirstPageUrl(),
            session.getLastPageUrl(),
            session.getUtmSource(),
            session.getUtmMedium(),
            session.getUtmCampaign(),
            session.getDeviceType(),
            session.getOs(),
            session.getLastActiveAt()
        );

        // 2. 更新缓存
        String key = SESSION_KEY_PREFIX + session.getSessionId();
        redisTemplate.opsForValue().set(key, session, SESSION_CACHE_TTL);
        localCache.put(session.getSessionId(), session);

        return session;
    }
}
```

### 4.3 会话超时清理任务

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class SessionCleanupTask {

    private final SessionService sessionService;
    private final SessionRepository sessionRepository;

    /**
     * 定期扫描并结束超时会话
     * 每 5 分钟执行一次
     */
    @Scheduled(fixedDelayString = "${tracker.session.cleanup-interval-ms:300000}")
    public void cleanupExpiredSessions() {
        log.debug("Starting session cleanup task");

        // 查询最近 35 分钟内有活动的会话（超时时间 30 分钟 + 5 分钟缓冲）
        Instant threshold = Instant.now().minus(Duration.ofMinutes(35));

        List<Session> potentiallyExpired = sessionRepository.findActiveSessionsSince(threshold);

        for (Session session : potentiallyExpired) {
            if (isExpired(session)) {
                try {
                    sessionService.endSession(session.getSessionId());
                } catch (Exception e) {
                    log.error("Failed to cleanup session {}", session.getSessionId(), e);
                }
            }
        }

        log.info("Session cleanup completed, processed {} sessions", potentiallyExpired.size());
    }

    private boolean isExpired(Session session) {
        Duration inactiveDuration = Duration.between(session.getLastActiveAt(), Instant.now());
        return inactiveDuration.compareTo(Duration.ofMinutes(30)) > 0;
    }
}
```

---

## 5. 与事件处理的集成

### 5.1 EventController 集成

```java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class EventController {

    private final SessionService sessionService;

    @PostMapping("/collect")
    public ResponseEntity<EventResponse> collect(@Valid @RequestBody EventRequest request) {
        // ... 限流、去重、增强 ...

        for (EventDTO event : events) {
            // 获取或创建会话
            Session session = sessionService.getOrCreateSession(
                event.getUserId(),
                event.getAnonymousId(),
                event.getSession() != null ? event.getSession().getSessionId() : null,
                buildSessionContext(event)
            );

            // 更新事件中的 sessionId
            event.setSessionId(session.getSessionId());

            // 更新会话聚合指标
            sessionService.updateSessionMetrics(session.getSessionId(), toEventRecord(event));

            // 存储事件
            collectorService.collect(enriched);
        }

        return ResponseEntity.ok(EventResponse.success(accepted, duplicate, rejected));
    }
}
```

---

## 6. 客户端会话管理

### 6.1 SDK 侧会话生成

```typescript
// src/collectors/SessionCollector.ts
class SessionCollector {
  private sessionId: string
  private startTime: number
  private lastActiveTime: number
  private eventCount: number = 0

  constructor(private config: SessionConfig) {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    this.lastActiveTime = this.startTime
  }

  // 生成会话 ID（客户端生成，服务端可验证）
  private generateSessionId(): string {
    return 'sess_' + this.generateUUID()
  }

  // 记录用户活动
  recordActivity(): void {
    this.lastActiveTime = Date.now()
    this.eventCount++
  }

  // 获取会话信息
  getSessionInfo(): SessionInfo {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      lastActiveTime: this.lastActiveTime,
      eventCount: this.eventCount
    }
  }

  // 检查会话是否超时（客户端也做预防性检查）
  isExpired(timeoutMs: number = 30 * 60 * 1000): boolean {
    return Date.now() - this.lastActiveTime > timeoutMs
  }
}
```

### 6.2 会话心跳机制

```typescript
// 在页面可见性变化时发送心跳
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // 页面隐藏时记录最后活跃时间
    sessionCollector.recordActivity()
  }
})

// 定期发送心跳（每 30 秒）
setInterval(() => {
  if (document.visibilityState === 'visible') {
    // 发送心跳事件，刷新服务端 lastActiveAt
    tracker.track('session_heartbeat', {
      sessionId: sessionCollector.getSessionInfo().sessionId
    })
  }
}, 30000)
```

---

## 7. 监控指标

| 指标 | 说明 | 告警 |
|------|------|------|
| `tracker.session.active` | 当前活跃会话数 | - |
| `tracker.session.created` | 新建会话数 | - |
| `tracker.session.ended` | 结束会话数 | - |
| `tracker.session.bounce_rate` | 跳出率 | > 70% |
| `tracker.session.avg_duration` | 平均会话时长 | < 30s |
| `tracker.session.timeout_cleanups` | 超时清理数 | - |

---

## 8. 查询示例

```sql
-- 查询用户会话列表
SELECT
    session_id,
    start_time,
    end_time,
    duration,
    page_views,
    clicks,
    is_bounce,
    utm_source,
    utm_medium
FROM sessions
WHERE user_id = 'user_12345'
ORDER BY start_time DESC
LIMIT 20;

-- 会话聚合分析（按渠道）
SELECT
    utm_source,
    utm_medium,
    count() as sessions,
    avg(duration) as avg_duration,
    sum(is_bounce) / count() as bounce_rate,
    sum(page_views) as total_page_views,
    sum(clicks) as total_clicks
FROM sessions
WHERE start_time >= '2026-05-01'
GROUP BY utm_source, utm_medium
ORDER BY sessions DESC;

-- 实时活跃会话（最近 5 分钟有活动的会话）
SELECT
    count(DISTINCT session_id) as active_sessions,
    count(DISTINCT user_id) as active_users
FROM sessions
WHERE last_active_at >= now() - INTERVAL 5 MINUTE;
```

---

## 9. 配置项

```yaml
tracker:
  session:
    timeout-minutes: 30              # 会话超时时间
    cleanup-interval-ms: 300000       # 超时清理任务间隔
    heartbeat-interval-ms: 30000      # 客户端心跳间隔
    cache-ttl-minutes: 30            # 会话缓存 TTL
```
