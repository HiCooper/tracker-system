# Tracker Kafka 实时管道设计

## 1. 概述

本文档定义 Tracker 系统使用 Kafka 作为事件传输管道的架构设计，包括 Topic 设计、分区策略、消费者实现、 Exactly-Once 语义保障，以及与 ClickHouse 的集成。

---

## 2. 为什么需要 Kafka

### 2.1 当前架构的问题

```
客户端 → Tracker Server → ClickHouse (直接写入)
```

问题：
- ClickHouse 故障时事件丢失
- 无法支持实时流处理（Flink/Materialize）
- 无法回放历史事件
- 写入瓶颈受限于 ClickHouse 连接数

### 2.2 引入 Kafka 后的架构

```
客户端 → Tracker Server → Kafka → 消费者 → ClickHouse
                              ↓
                         Flink/Materialize (实时聚合)
                              ↓
                         实时仪表盘
```

优势：
- **削峰填谷**：Kafka 作为缓冲区，保护 ClickHouse
- **实时处理**：支持 Flink/Materialize 实时聚合
- **事件回放**：支持历史事件重放
- **解耦**：写入和消费分离，独立扩展

---

## 3. Topic 设计

### 3.1 Topic 列表

| Topic 名称 | 分区数 | 副本数 | Retention | 说明 |
|------------|--------|--------|-----------|------|
| `tracker-events` | 12 | 3 | 7 天 | 主事件 Topic |
| `tracker-events-dlq` | 3 | 3 | 30 天 | 死信 Topic |
| `tracker-sessions` | 6 | 3 | 7 天 | 会话事件 Topic |
| `tracker-exposures` | 6 | 3 | 7 天 | 曝光事件 Topic |

### 3.2 分区策略

```java
/**
 * 分区计算策略
 * 使用 (userId hash) % partitionCount 保证：
 * 1. 同一用户的事件在同一个分区（保证顺序）
 * 2. 负载均衡分布
 */
public class PartitionStrategy {

    public static int calculatePartition(String userId, int partitionCount) {
        if (userId == null || userId.isEmpty()) {
            return 0;  // 匿名用户分配到分区 0
        }
        return Math.abs(userId.hashCode()) % partitionCount;
    }

    public static int calculatePartition(EventRecord event, int partitionCount) {
        // 优先按 userId 分区
        if (event.getUserId() != null && !event.getUserId().isEmpty()) {
            return calculatePartition(event.getUserId(), partitionCount);
        }
        // 次选 anonymousId
        if (event.getAnonymousId() != null && !event.getAnonymousId().isEmpty()) {
            return calculatePartition(event.getAnonymousId(), partitionCount);
        }
        // 最后按 sessionId
        return calculatePartition(event.getSessionId(), partitionCount);
    }
}
```

### 3.3 Topic 创建脚本

```bash
#!/bin/bash
# 创建 Kafka Topics

# 主事件 Topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic tracker-events \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete

# DLQ Topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic tracker-events-dlq \
  --partitions 3 \
  --replication-factor 3 \
  --config retention.ms=2592000000 \
  --config cleanup.policy=delete

# 会话事件 Topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic tracker-sessions \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000

# 验证 Topic 列表
kafka-topics.sh --list --bootstrap-server localhost:9092
```

---

## 4. 生产者实现

### 4.1 KafkaProducer 配置

```java
@Configuration
@RequiredArgsConstructor
public class KafkaProducerConfig {

    @Bean
    public KafkaTemplate<String, EventRecord> kafkaTemplate(
            ProducerFactory<String, EventRecord> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public ProducerFactory<String, EventRecord> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "${spring.kafka.bootstrap-servers}");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);

        // 可靠性配置
        config.put(ProducerConfig.ACKS_CONFIG, "all");          // 等待所有副本确认
        config.put(ProducerConfig.RETRIES_CONFIG, 3);          // 重试 3 次
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);  // 开启幂等性

        // 性能配置
        config.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);    // 批量大小 16KB
        config.put(ProducerConfig.LINGER_MS_CONFIG, 5);         // 等待 5ms 凑批
        config.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);  // 32MB 缓冲

        // 压缩
        config.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

        return new DefaultKafkaProducerFactory<>(config);
    }
}
```

### 4.2 TrackerKafkaProducer

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TrackerKafkaProducer {

    private final KafkaTemplate<String, EventRecord> kafkaTemplate;

    private static final String TOPIC_EVENTS = "tracker-events";
    private static final String TOPIC_SESSIONS = "tracker-sessions";
    private static final int PARTITION_COUNT = 12;

    /**
     * 发送事件到 Kafka
     * 使用 userId 作为 key，保证同一用户的事件有序
     */
    public void sendEvent(EventRecord event) {
        String topic = getTopicForEvent(event);
        String key = event.getUserId() != null ? event.getUserId() : event.getAnonymousId();
        int partition = PartitionStrategy.calculatePartition(event, PARTITION_COUNT);

        ListenableFuture<SendResult<String, EventRecord>> future =
            kafkaTemplate.send(topic, partition, key, event);

        future.addCallback(
            result -> log.debug("Event {} sent to partition {} offset {}",
                event.getEventId(),
                result.getRecordMetadata().partition(),
                result.getRecordMetadata().offset()),
            ex -> log.error("Failed to send event {}: {}", event.getEventId(), ex.getMessage())
        );
    }

    /**
     * 批量发送事件
     */
    public void sendBatch(List<EventRecord> events) {
        for (EventRecord event : events) {
            sendEvent(event);
        }
    }

    /**
     * 发送失败事件到 DLQ Topic
     */
    public void sendToDLQ(EventRecord event, String reason) {
        try {
            EventRecord dlqEvent = EventRecord.builder()
                .eventId(event.getEventId())
                .eventType(event.getEventType())
                .userId(event.getUserId())
                .anonymousId(event.getAnonymousId())
                .sessionId(event.getSessionId())
                .timestamp(event.getTimestamp())
                .receivedAt(Instant.now())
                .properties("{\"reason\": \"" + reason + "\", \"original_event\": " +
                    new ObjectMapper().writeValueAsString(event) + "}")
                .build();

            kafkaTemplate.send("tracker-events-dlq", event.getEventId(), dlqEvent);
        } catch (Exception e) {
            log.error("Failed to send event {} to DLQ", event.getEventId(), e);
        }
    }

    private String getTopicForEvent(EventRecord event) {
        switch (event.getEventType()) {
            case "page_view":
            case "click":
            case "scroll":
            case "stay":
            case "custom":
                return TOPIC_EVENTS;
            case "session_start":
            case "session_end":
                return TOPIC_SESSIONS;
            default:
                return TOPIC_EVENTS;
        }
    }
}
```

---

## 5. 消费者实现

### 5.1 ClickHouse 消费者

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ClickHouseConsumer {

    private final ClickHouseWriter clickHouseWriter;
    private final DeduplicationService deduplicationService;
    private final TrackerKafkaProducer kafkaProducer;

    private static final int BATCH_SIZE = 100;
    private static final Duration BATCH_TIMEOUT = Duration.ofSeconds(2);

    /**
     * 消费主事件 Topic 并写入 ClickHouse
     */
    @KafkaListener(
        topics = "tracker-events",
        groupId = "tracker-clickhouse-writer",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeEvents(ConsumerRecord<String, EventRecord> record) {
        EventRecord event = record.value();

        try {
            // 1. 幂等性检查（防止重复消费）
            if (deduplicationService.isDuplicate(event.getEventId())) {
                log.debug("Event {} already processed, skipping", event.getEventId());
                return;
            }

            // 2. 写入 ClickHouse
            clickHouseWriter.writeBatch(Collections.singletonList(event));

            // 3. 标记已处理
            deduplicationService.markProcessed(event.getEventId());

        } catch (Exception e) {
            log.error("Failed to process event {}: {}", event.getEventId(), e);
            // 发送失败事件到 DLQ
            kafkaProducer.sendToDLQ(event, "clickhouse_write_failed");
        }
    }

    /**
     * 批量消费（提升吞吐量）
     */
    @KafkaListener(
        topics = "tracker-events",
        groupId = "tracker-clickhouse-batch-writer",
        containerFactory = "batchKafkaListenerContainerFactory"
    )
    public void consumeBatch(List<ConsumerRecord<String, EventRecord>> records) {
        if (records.isEmpty()) {
            return;
        }

        List<EventRecord> events = records.stream()
            .map(ConsumerRecord::value)
            .filter(event -> !deduplicationService.isDuplicate(event.getEventId()))
            .collect(Collectors.toList());

        if (events.isEmpty()) {
            return;
        }

        try {
            clickHouseWriter.writeBatch(events);
            events.forEach(e -> deduplicationService.markProcessed(e.getEventId()));
            log.info("Batch wrote {} events to ClickHouse", events.size());
        } catch (Exception e) {
            log.error("Failed to batch write {} events: {}", events.size(), e);
            // 逐个发送到 DLQ
            events.forEach(event -> kafkaProducer.sendToDLQ(event, "batch_write_failed"));
        }
    }
}
```

### 5.2 Kafka 配置

```java
@Configuration
@RequiredArgsConstructor
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, EventRecord> consumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "${spring.kafka.bootstrap-servers}");
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "tracker-consumer-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");  // 从最早消费
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);      // 手动提交

        // 可靠性配置
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);   // 每次拉取 100 条
        config.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024);    // 最小拉取 1KB
        config.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);   // 最大等待 500ms

        // 幂等性配置
        config.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        return new DefaultKafkaConsumerFactory<>(
            config,
            new StringDeserializer(),
            new JsonDeserializer<>(EventRecord.class)
        );
    }

    @Bean
    public KafkaListenerContainerFactory<?> kafkaListenerContainerFactory(
            ConsumerFactory<String, EventRecord> consumerFactory) {
        ContainerFactory factory = new ConcurrentKafkaListenerContainerFactory();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);  // 3 个并发消费者
        factory.getContainerProperties().setAckMode(AckMode.MANUAL_IMMEDIATE);
        return factory;
    }

    @Bean
    public KafkaListenerContainerFactory<?> batchKafkaListenerContainerFactory(
            ConsumerFactory<String, EventRecord> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory factory = new ConcurrentKafkaListenerContainerFactory();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        factory.setBatchListener(true);  // 开启批量消费
        factory.getContainerProperties().setAckMode(AckMode.BATCH);
        return factory;
    }
}
```

---

## 6. Exactly-Once 语义

### 6.1 Kafka 事务

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ExactlyOnceConsumer {

    private final KafkaTemplate<String, EventRecord> kafkaTemplate;
    private final ClickHouseWriter clickHouseWriter;
    private final DeduplicationService deduplicationService;

    private final KafkaTransactionManager<String, EventRecord> transactionManager;

    /**
     * 开启事务消费
     */
    @KafkaListener(
        topics = "tracker-events",
        groupId = "tracker-exactly-once",
        containerFactory = "transactionalKafkaListenerContainerFactory"
    )
    @Transactional
    public void consumeWithTransaction(ConsumerRecord<String, EventRecord> record) {
        EventRecord event = record.value();

        // 1. 幂等性检查
        if (deduplicationService.isDuplicate(event.getEventId())) {
            return;
        }

        // 2. 写入 ClickHouse（在同一事务中）
        clickHouseWriter.writeBatch(Collections.singletonList(event));

        // 3. 提交 offset（Kafka 事务）
        // 注意：需要配合使用 KafkaTemplate.execute() 开启事务
    }

    /**
     * 事务模板执行
     */
    public void processInTransaction(EventRecord event) {
        kafkaTemplate.executeInTransaction(template -> {
            try {
                // 写入 ClickHouse
                clickHouseWriter.writeBatch(Collections.singletonList(event));

                // 标记已处理
                deduplicationService.markProcessed(event.getEventId());

                return true;
            } catch (Exception e) {
                log.error("Transaction failed for event {}", event.getEventId(), e);
                throw new RuntimeException(e);
            }
        });
    }
}
```

### 6.2 消费者配置（事务模式）

```java
@Bean
public KafkaTransactionManager<String, EventRecord> transactionManager(
        ProducerFactory<String, EventRecord> producerFactory) {
    return new KafkaTransactionManager<>(producerFactory);
}

@Bean
public KafkaListenerContainerFactory<?> transactionalKafkaListenerContainerFactory(
        ConsumerFactory<String, EventRecord> consumerFactory,
        KafkaTransactionManager<String, EventRecord> transactionManager) {
    ConcurrentKafkaListenerContainerFactory factory = new ConcurrentKafkaListenerContainerFactory();
    factory.setConsumerFactory(consumerFactory);
    factory.setConcurrency(3);
    factory.getContainerProperties().setAckMode(AckMode.MANUAL_IMMEDIATE);
    factory.setTransactionManager(transactionManager);
    return factory;
}
```

---

## 7. 与 ClickHouse 直接写入的关系

### 7.1 双写模式（推荐初期）

```
客户端 → Tracker Server → ┬→ ClickHouse (直接写入，低延迟)
                          └→ Kafka (异步复制，可靠性保障)
```

优点：
- 保留直接写入的低延迟
- Kafka 作为可靠性备份

缺点：
- 实现复杂度增加

### 7.2 Kafka Only 模式（推荐后期）

```
客户端 → Tracker Server → Kafka → 消费者 → ClickHouse
```

优点：
- 架构清晰，统一数据流
- 支持实时处理
- 事件回放

缺点：
- 延迟略有增加（~10-50ms）

**推荐路径**：
1. **Phase 1**：直接写入 ClickHouse，Kafka 作为可选备份
2. **Phase 2**：Kafka Only，主路径经过 Kafka 消费写入 ClickHouse
3. **Phase 3**：引入 Flink/Materialize 实现实时聚合

---

## 8. 监控指标

| 指标 | 说明 | 告警 |
|------|------|------|
| `kafka.messages.in` | 消息生产数 | - |
| `kafka.messages.out` | 消息消费数 | - |
| `kafka.consumer.lag` | 消费延迟 | > 10000 |
| `kafka.producer.errors` | 生产错误数 | > 10/min |
| `kafka.consumer.errors` | 消费错误数 | > 10/min |
| `clickhouse.write.latency` | 写入延迟 | > 500ms |
| `dlq.messages.count` | DLQ 积压数 | > 1000 |

---

## 9. 配置项

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      acks: all
      retries: 3
      batch-size: 16384
      properties:
        enable.idempotence: true
        compression.type: lz4
    consumer:
      group-id: tracker-consumer-group
      auto-offset-reset: earliest
      enable-auto-commit: false
      max-poll-records: 100

tracker:
  kafka:
    topics:
      events: tracker-events
      events-dlq: tracker-events-dlq
      sessions: tracker-sessions
    partitions:
      events: 12
      sessions: 6
    consumer:
      concurrency: 3
      batch-enabled: true
```

---

## 10. 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kafka 集群 (3 节点)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Broker 1    │  │ Broker 2    │  │ Broker 3    │              │
│  │ (Topic 1,4,7 │  │ (Topic 2,5,8 │  │ (Topic 3,6,9 │              │
│  │  10)        │  │  11)        │  │  12)        │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Tracker Server 集群                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Server 1    │  │ Server 2    │  │ Server 3    │              │
│  │ (Producer)  │  │ (Producer)  │  │ (Producer)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     消费者集群                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ CH Writer   │  │ CH Writer   │  │ CH Writer   │              │
│  │ (3 实例)    │  │             │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ClickHouse 集群                             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Replica 1   │  │ Replica 2   │  (主从复制)                    │
│  │ (写入)       │  │ (查询)       │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```
