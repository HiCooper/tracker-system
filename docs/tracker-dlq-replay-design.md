# Tracker DLQ 重放机制设计

## 1. 概述

Dead Letter Queue（DLQ）用于存储事件处理失败的记录，支持后续重放恢复数据。本文档定义 DLQ 的数据结构、重放策略、调度机制和幂等性保证。

---

## 2. DLQ 数据结构

### 2.1 Redis 存储设计

使用 Redis Hash 存储 DLQ 事件，支持按失败时间排序：

```
Key 格式：dlq:{reason}:{eventId}
例如：dlq:validation_failed:evt_20260513_abc123

Field: event_json
Value: 事件的完整 JSON 序列化
TTL: 7 天（自动清理）
```

### 2.2 失败原因分类

| reason | 说明 | 处理策略 |
|--------|------|----------|
| `validation_failed` | 事件格式校验失败 | 直接丢弃，或修复后重放 |
| `circuit_breaker_open` | ClickHouse 熔断器打开 | 熔断恢复后自动重放 |
| `clickhouse_write_failed` | ClickHouse 写入异常 | 指数退避重放 |
| `enrichment_failed` | 数据增强失败 | 降级重放（不增强） |
| `network_timeout` | 网络超时 | 线性退避重放 |

### 2.3 DLQEntry 结构

```java
@Data
@Builder
public class DLQEntry {
    private String eventId;           // 事件唯一 ID
    private String eventType;         // 事件类型
    private String userId;           // 用户 ID
    private String eventJson;        // 事件完整 JSON
    private String reason;           // 失败原因
    private Instant failedAt;        // 失败时间
    private int retryCount;          // 已重试次数
    private Instant nextRetryAt;     // 下次重试时间（用于退避）
}
```

---

## 3. DLQ 服务实现

### 3.1 DLQService

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DLQService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String DLQ_KEY_PREFIX = "dlq:";
    private static final Duration DLQ_TTL = Duration.ofDays(7);
    private static final int MAX_RETRY_COUNT = 10;

    /**
     * 存储失败事件到 DLQ
     */
    public void store(EventRecord event, String reason) {
        try {
            DLQEntry entry = DLQEntry.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .userId(event.getUserId())
                .eventJson(objectMapper.writeValueAsString(event))
                .reason(reason)
                .failedAt(Instant.now())
                .retryCount(0)
                .nextRetryAt(Instant.now())  // 立即可重试
                .build();

            String key = buildKey(reason, event.getEventId());
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(entry), DLQ_TTL);

            // 同时维护一个按时间排序的集合，便于批量获取
            String scoreKey = "dlq:score";
            redisTemplate.opsForZSet().add(scoreKey, key, entry.getFailedAt().toEpochMilli());

            log.info("Event {} stored in DLQ, reason: {}", event.getEventId(), reason);
        } catch (Exception e) {
            log.error("Failed to store event {} in DLQ", event.getEventId(), e);
        }
    }

    /**
     * 获取待重放事件（按失败时间排序）
     */
    public List<DLQEntry> fetchForReplay(int count) {
        String scoreKey = "dlq:score";
        long now = Instant.now().toEpochMilli();

        // 获取所有超时未重试的事件
        Set<String> keys = redisTemplate.opsForZSet()
            .rangeByScore(scoreKey, 0, now);

        if (keys == null || keys.isEmpty()) {
            return Collections.emptyList();
        }

        List<DLQEntry> entries = new ArrayList<>();
        for (String key : keys) {
            if (entries.size() >= count) break;

            String json = redisTemplate.opsForValue().get(key);
            if (json == null) {
                // 已被处理或 TTL 过期，清理 score
                redisTemplate.opsForZSet().remove(scoreKey, key);
                continue;
            }

            try {
                DLQEntry entry = objectMapper.readValue(json, DLQEntry.class);

                // 检查是否在退避期内
                if (entry.getNextRetryAt().isAfter(Instant.now())) {
                    continue;
                }

                // 检查重试次数
                if (entry.getRetryCount() >= MAX_RETRY_COUNT) {
                    log.warn("Event {} exceeded max retry count, moving to dead storage", entry.getEventId());
                    moveToDeadStorage(entry);
                    redisTemplate.opsForZSet().remove(scoreKey, key);
                    continue;
                }

                entries.add(entry);
            } catch (Exception e) {
                log.error("Failed to parse DLQ entry for key {}", key, e);
                redisTemplate.opsForZSet().remove(scoreKey, key);
            }
        }

        return entries;
    }

    /**
     * 更新重试信息
     */
    public void updateRetryInfo(DLQEntry entry, boolean success) {
        String key = buildKey(entry.getReason(), entry.getEventId());

        if (success) {
            // 成功后删除
            redisTemplate.delete(key);
            redisTemplate.opsForZSet().remove("dlq:score", key);
            log.info("DLQ entry {} replayed successfully", entry.getEventId());
        } else {
            // 失败后更新重试次数和下次重试时间
            entry.setRetryCount(entry.getRetryCount() + 1);
            entry.setNextRetryAt(calculateNextRetry(entry));
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(entry), DLQ_TTL);
            log.info("DLQ entry {} retry count updated to {}", entry.getEventId(), entry.getRetryCount());
        }
    }

    /**
     * 计算下次重试时间（指数退避）
     */
    private Instant calculateNextRetry(DLQEntry entry) {
        // 基础延迟：1秒，指数退避：1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s
        long delaySeconds = (long) Math.pow(2, Math.min(entry.getRetryCount(), 10));
        // 添加 jitter: +/- 20%
        long jitter = (long) (delaySeconds * 0.2 * (Math.random() - 0.5));
        return Instant.now().plusSeconds(delaySeconds + jitter);
    }

    /**
     * 移动到死信存储（超过最大重试次数）
     */
    private void moveToDeadStorage(DLQEntry entry) {
        String deadKey = "dlq:dead:" + entry.getEventId();
        try {
            redisTemplate.opsForValue().set(deadKey, objectMapper.writeValueAsString(entry),
                Duration.ofDays(30));
            log.warn("Event {} moved to dead storage after {} retries", entry.getEventId(), entry.getRetryCount());
        } catch (Exception e) {
            log.error("Failed to move event {} to dead storage", entry.getEventId(), e);
        }
    }

    private String buildKey(String reason, String eventId) {
        return DLQ_KEY_PREFIX + reason + ":" + eventId;
    }
}
```

---

## 4. 重放调度设计

### 4.1 调度策略

```
┌─────────────────────────────────────────────────────────────┐
│                    DLQ 重放调度器                            │
├─────────────────────────────────────────────────────────────┤
│  调度周期: 每 60 秒执行一次                                  │
│  批量大小: 每次最多重放 100 条                               │
│  并发限制: 同一事件 ID 在重放中只有一个实例                    │
│  退避策略: 指数退避 + Jitter                                │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 DLQReplayTask

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DLQReplayTask {

    private final DLQService dlqService;
    private final ClickHouseWriter clickHouseWriter;
    private final DeduplicationService deduplicationService;

    private static final int BATCH_SIZE = 100;

    /**
     * 定时重放 DLQ 中的事件
     * 默认每 60 秒执行一次
     */
    @Scheduled(fixedDelayString = "${tracker.dlq.replay-interval-ms:60000}",
               initialDelayString = "${tracker.dlq.replay-initial-delay-ms:30000}")
    public void replay() {
        log.debug("Starting DLQ replay task");
        List<DLQEntry> entries = dlqService.fetchForReplay(BATCH_SIZE);

        if (entries.isEmpty()) {
            log.debug("No DLQ entries to replay");
            return;
        }

        log.info("Found {} DLQ entries to replay", entries.size());

        for (DLQEntry entry : entries) {
            try {
                replayEntry(entry);
            } catch (Exception e) {
                log.error("Failed to replay DLQ entry {}", entry.getEventId(), e);
                // 更新重试信息（失败）
                dlqService.updateRetryInfo(entry, false);
            }
        }
    }

    private void replayEntry(DLQEntry entry) throws Exception {
        // 1. 反序列化事件
        EventRecord event = objectMapper.readValue(entry.getEventJson(), EventRecord.class);

        // 2. 重新检查去重（防止重放期间事件已被正常处理）
        if (deduplicationService.isDuplicate(event.getEventId())) {
            log.info("Event {} already processed, skipping DLQ replay", event.getEventId());
            dlqService.updateRetryInfo(entry, true);  // 标记为成功（已处理）
            return;
        }

        // 3. 尝试写入 ClickHouse
        try {
            clickHouseWriter.writeBatch(Collections.singletonList(event));
            // 4. 写入成功后更新去重标记
            deduplicationService.markProcessed(event.getEventId());
            // 5. 标记 DLQ 条目为已处理
            dlqService.updateRetryInfo(entry, true);
        } catch (Exception e) {
            // 写入失败，标记为失败（触发退避）
            dlqService.updateRetryInfo(entry, false);
            throw e;
        }
    }
}
```

---

## 5. 幂等性保证

### 5.1 去重标记生命周期

```
事件处理流程：
1. 接收事件 → 检查 Redis 去重标记
2. 无标记 → 处理事件 → 写入 ClickHouse → 设置 Redis 去重标记 (TTL=5min)
3. 有标记 → 跳过（视为重复）

DLQ 重放流程：
1. 获取 DLQ 条目 → 重新检查 Redis 去重标记
2. 已有标记 → 视为已处理，删除 DLQ 条目
3. 无标记 → 写入 ClickHouse → 设置 Redis 去重标记 → 删除 DLQ 条目
```

### 5.2 ClickHouse 幂等写入

使用 `event_id` 作为去重依据：

```sql
-- 方法1: 使用 ReplacesMergeTree
CREATE TABLE gateflow_tracker.events (
    event_id String,
    ...
) ENGINE = ReplacingMergeTree(event_id)
ORDER BY (user_id, timestamp, event_type, session_id);

-- 方法2: 使用 CollapsingMergeTree（需额外 sign 字段）
CREATE TABLE gateflow_tracker.events (
    event_id String,
    sign Int8,
    ...
) ENGINE = CollapsingMergeTree(sign)
ORDER BY (user_id, timestamp, event_type, session_id);

-- 方法3: 直接去重查询（推荐）
SELECT * FROM events
WHERE event_id NOT IN (
    SELECT event_id FROM events
    WHERE event_id IN (SELECT event_id FROM DLQ_replay_batch)
    GROUP BY event_id HAVING count() > 1
);
```

---

## 6. 监控指标

| 指标 | 说明 | 告警 |
|------|------|------|
| `tracker.dlq.size` | DLQ 积压总量 | > 1000 |
| `tracker.dlq.replay.success` | 成功重放数 | - |
| `tracker.dlq.replay.failed` | 重放失败数 | > 10/min |
| `tracker.dlq.dead` | 移入死信存储数 | > 100 |
| `tracker.dlq.oldest_age_seconds` | 最老条目等待时间 | > 5min |

---

## 7. 配置项

```yaml
tracker:
  dlq:
    replay-interval-ms: 60000        # 重放调度间隔
    replay-initial-delay-ms: 30000   # 启动延迟
    batch-size: 100                  # 每批重放数量
    max-retry-count: 10              # 最大重试次数
    ttl-days: 7                      # DLQ 保留天数
```

---

## 8. 流程图

```
┌─────────────┐
│  事件处理失败  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────────┐
│ DLQService  │────▶│ Redis DLQ 存储    │
│   .store()  │     │ dlq:{reason}:{id} │
└─────────────┘     │ + ZSET 排序索引    │
                    └──────────────────┘

┌─────────────┐     ┌──────────────────┐
│ DLQReplayTask│     │ Redis DLQ 存储    │
│  (定时调度)  │◀────│ fetchForReplay() │
└──────┬──────┘     └──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│        重放处理循环                   │
├─────────────────────────────────────┤
│ 1. 获取待重放条目                     │
│ 2. 检查退避期（nextRetryAt > now?）  │
│ 3. 检查重试次数（> MAX? → 死信）    │
│ 4. 重新检查 Redis 去重               │
│ 5. 写入 ClickHouse                   │
│ 6. 更新重试信息（成功/失败+退避）     │
└─────────────────────────────────────┘
```
