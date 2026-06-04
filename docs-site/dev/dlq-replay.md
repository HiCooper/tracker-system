# DLQ 死信队列与重放

本文档描述 Tracker 系统的 Dead Letter Queue（DLQ）机制，用于存储处理失败的事件并支持后续重放恢复。

## 概述

事件处理失败时（校验失败、写入异常、熔断触发），将事件写入 DLQ 供后续重放：

```
失败事件 → DLQ (Redis, 7天 TTL) → 定时任务重放 → ClickHouse
```

## 数据结构

### DLQEntry

```java
@Data
@Builder
public class DLQEntry {
    private String eventId;        // 事件唯一 ID
    private String eventType;      // 事件类型
    private String userId;         // 用户 ID
    private String eventJson;      // 事件完整 JSON
    private String reason;         // 失败原因
    private Instant failedAt;      // 失败时间
    private int retryCount;        // 已重试次数
    private Instant nextRetryAt;   // 下次重试时间（退避）
}
```

### Redis 存储

```
Key:  dlq:{reason}:{eventId}
Value: DLQEntry JSON
TTL: 7 天
```

## 失败原因分类

| reason | 说明 | 处理策略 |
|--------|------|---------|
| `validation_failed` | 格式校验失败 | 人工修复后重放 |
| `circuit_breaker_open` | 熔断器打开 | 熔断恢复后自动重放 |
| `clickhouse_write_failed` | 写入异常 | 指数退避重放 |
| `enrichment_failed` | 增强失败 | 降级重放（不增强） |
| `network_timeout` | 网络超时 | 线性退避重放 |

## 重放策略

### 退避策略

| 重试次数 | 退避间隔 | 策略 |
|---------|---------|------|
| 1-3 | 1min, 2min, 4min | 指数退避 |
| 4-6 | 8min, 16min, 32min | 指数退避 |
| 7-10 | 1h, 2h, 4h, 8h | 线性退避 |
| > 10 | — | 丢弃，记录告警 |

### 重放调度

```java
@Scheduled(fixedDelay = 60000)  // 每分钟检查
public void replayDLQ() {
    List<DLQEntry> entries = dlqService.fetchForReplay(100);
    for (DLQEntry entry : entries) {
        if (entry.getNextRetryAt().isAfter(Instant.now())) {
            continue;  // 还未到重试时间
        }
        try {
            clickHouseWriter.write(entry.toEventRecord());
            dlqService.remove(entry.getEventId());
        } catch (Exception e) {
            dlqService.incrementRetry(entry);
        }
    }
}
```

## 监控告警

| 指标 | 告警阈值 |
|------|---------|
| DLQ 入队速率 | > 100/min |
| DLQ 积压数量 | > 1000 |
| 熔断器状态 | open |
| 重放成功率 | < 95% |
