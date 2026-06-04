# Kafka 实时管道设计

本文档描述 Tracker 系统使用 Kafka 作为事件传输管道的架构设计。

## 为什么需要 Kafka

直接写入 ClickHouse 存在以下问题：
- ClickHouse 故障时事件丢失
- 无法支持实时流处理
- 写入瓶颈受限于 ClickHouse 连接数

引入 Kafka 后的架构：

```
客户端 → Tracker Server → Kafka → 消费者 → ClickHouse
                             ↓
                        Flink/Materialize (实时聚合)
                             ↓
                        实时仪表盘
```

**优势**: 削峰填谷、实时处理、事件回放、读写分离。

## Topic 设计

| Topic | 分区数 | 副本数 | Retention | 说明 |
|-------|--------|--------|-----------|------|
| `tracker-events` | 12 | 3 | 7 天 | 主事件 Topic |
| `tracker-events-dlq` | 3 | 3 | 30 天 | 死信 Topic |
| `tracker-sessions` | 6 | 3 | 7 天 | 会话事件 Topic |
| `tracker-exposures` | 6 | 3 | 7 天 | 曝光事件 Topic |

## 分区策略

使用 `userId` 作为分区键，保证同一用户事件有序：

```java
int partition = Math.abs(userId.hashCode()) % partitionCount;
```

分区键选择优先级：`userId` → `anonymousId` → `sessionId`。

## 生产者配置

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
      acks: all           # 等待所有副本确认
      retries: 3          # 失败重试
      compression-type: snappy  # 压缩传输
      batch-size: 16384
      linger-ms: 5
```

## 消费者实现

批量消费，提升吞吐量：

```java
@KafkaListener(
    topics = "tracker-events",
    groupId = "tracker-consumer",
    batch = "true"
)
public void consumeBatch(List<ConsumerRecord<String, EventDTO>> records) {
    List<EventDTO> events = records.stream()
        .map(ConsumerRecord::value)
        .collect(Collectors.toList());
    clickHouseWriter.writeBatch(events);
}
```

## 消费者组设计

| 消费者组 | 消费 Topic | 功能 |
|---------|-----------|------|
| `tracker-clickhouse` | `tracker-events` | 写入 ClickHouse |
| `tracker-aggregation` | `tracker-events` | 实时聚合计算 |
| `tracker-session` | `tracker-sessions` | 会话聚合 |
| `tracker-monitor` | `tracker-events-dlq` | DLQ 监控告警 |

## 可靠性保障

- **生产端**: `acks=all` 等待所有 ISR 副本确认
- **消费端**: 手动提交 Offset，确保处理成功后再提交
- **死信队列**: 消费失败的消息入 `tracker-events-dlq`
- **监控**: 消费延迟、积压量告警
