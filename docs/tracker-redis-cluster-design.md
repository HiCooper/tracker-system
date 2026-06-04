# Tracker Redis Cluster 去重设计

## 1. 概述

本文档定义在高并发场景下使用 Redis Cluster 实现事件去重的方案，包括分片策略、连接管理、批量操作和故障转移。

---

## 2. 问题背景

### 2.1 单实例 Redis 的瓶颈

```
┌─────────────────┐
│  Tracker Server │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Redis 单实例   │  ← 所有去重 key 都存在这个节点
│   (单线程)       │  ← QPS 受 CPU 单核限制 (~10万/秒)
└─────────────────┘
```

当流量超过单实例容量时，需要水平扩展到 Redis Cluster。

### 2.2 Redis Cluster 分片原理

Redis Cluster 将 16384 个哈希槽（slot）分配给不同节点：

```
Slot 范围          节点
0 - 5460          192.168.1.1:6379
5461 - 10922      192.168.1.2:6379
10923 - 16383     192.168.1.3:6379
```

客户端根据 `CRC16(key) % 16384` 计算槽位，直接访问对应节点。

---

## 3. 分片策略

### 3.1 Key 设计

```
原 key: dedup:evt_20260513_abc123

分片后 key 格式: {tag}.{slot}:evt_20260513_abc123
其中 {tag} 是用于计算槽位的标签，{slot} 是实际槽位号

示例: dedup.1234:evt_20260513_abc123
```

### 3.2 槽位计算

```java
public class RedisKeyUtils {

    /**
     * CRC16 算法（Redis Cluster 官方实现）
     */
    public static int crc16(byte[] bytes) {
        int crc = 0x0000;
        for (byte b : bytes) {
            crc = (crc >>> 8) ^ CRC16_TABLE[(crc ^ (b & 0xFF)) & 0xFF];
        }
        return crc & 0x7FFF;  // Redis Cluster 使用 14 位
    }

    /**
     * 计算 key 对应的槽位
     */
    public static int calculateSlot(String key) {
        // 提取 tag（{tag} 之间的部分）
        int tagStart = key.indexOf('{');
        int tagEnd = key.indexOf('}');

        String slotKey = key;
        if (tagStart >= 0 && tagEnd > tagStart) {
            slotKey = key.substring(tagStart + 1, tagEnd);
        }

        return crc16(slotKey.getBytes(StandardCharsets.UTF_8)) % 16384;
    }

    /**
     * 生成带标签的分片 key
     * 使用 eventId 前 8 位作为 tag，保证同一 eventId 总是路由到同一槽位
     */
    public static String toShardedKey(String prefix, String eventId) {
        String tag = eventId.length() >= 8 ? eventId.substring(0, 8) : eventId;
        int slot = calculateSlot(tag);
        return String.format("%s.%d:%s", prefix, slot, eventId);
    }
}
```

### 3.3 完整去重服务实现

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DeduplicationService {

    private final RedisTemplate<String, String> redisTemplate;

    private static final String DEDUP_KEY_PREFIX = "dedup";
    private static final Duration DEDUP_WINDOW = Duration.ofMinutes(5);

    /**
     * 检查事件是否重复
     * Redis Cluster 环境下自动路由到正确节点
     */
    public boolean isDuplicate(String eventId) {
        String key = RedisKeyUtils.toShardedKey(DEDUP_KEY_PREFIX, eventId);

        try {
            // SET NX: 仅在 key 不存在时设置
            Boolean result = redisTemplate.opsForValue()
                .setIfAbsent(key, "1", DEDUP_WINDOW);

            return !Boolean.TRUE.equals(result);
        } catch (Exception e) {
            // Redis Cluster 故障时默认为非重复（宁可重复，不可丢失）
            log.warn("Redis deduplication check failed for {}, treating as non-duplicate: {}",
                eventId, e.getMessage());
            return false;
        }
    }

    /**
     * 标记事件已处理（用于 DLQ 重放后）
     */
    public void markProcessed(String eventId) {
        String key = RedisKeyUtils.toShardedKey(DEDUP_KEY_PREFIX, eventId);
        redisTemplate.opsForValue().set(key, "1", DEDUP_WINDOW);
    }

    /**
     * 批量检查去重（提升高并发性能）
     */
    public List<String> filterDuplicates(List<String> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> uniqueEventIds = new ArrayList<>();

        // 按槽位分组，减少跨节点操作
        Map<Integer, List<String>> slotGroups = new HashMap<>();
        Map<String, String> keyMap = new HashMap<>();  // eventId -> shardedKey

        for (String eventId : eventIds) {
            String shardedKey = RedisKeyUtils.toShardedKey(DEDUP_KEY_PREFIX, eventId);
            int slot = RedisKeyUtils.calculateSlot(eventId);

            slotGroups.computeIfAbsent(slot, k -> new ArrayList<>()).add(shardedKey);
            keyMap.put(eventId, shardedKey);
        }

        // 对每个槽位执行批量操作
        for (Map.Entry<Integer, List<String>> entry : slotGroups.entrySet()) {
            List<String> keys = entry.getValue();

            // 使用 pipeline 批量检查
            List<Object> results = redisTemplate.executePipelined(
                (RedisCallback<Object>) connection -> {
                    for (String key : keys) {
                        connection.stringCommands().setBIT(
                            connection.getNativeConnection().getAllocatedBytes(
                                new org.apache.commons.pool2.impl.DefaultPooledObject<>(
                                    connection.getNativeConnection()), 0, 0, 0
                                ).getObject(), 0, false
                        );
                    }
                    return null;
                }
            );

            // 简化：直接逐个检查（实际生产建议用 MGET）
            for (String key : keys) {
                if (Boolean.FALSE.equals(redisTemplate.hasKey(key))) {
                    // 找到未重复的 key，反向映射到 eventId
                    String eventId = keyMap.entrySet().stream()
                        .filter(e -> e.getValue().equals(key))
                        .map(Map.Entry::getKey)
                        .findFirst()
                        .orElse(null);

                    if (eventId != null) {
                        uniqueEventIds.add(eventId);
                        // 标记为已处理
                        redisTemplate.opsForValue().setIfAbsent(key, "1", DEDUP_WINDOW);
                    }
                }
            }
        }

        return uniqueEventIds;
    }
}
```

---

## 4. Redis Cluster 连接配置

### 4.1 Spring Boot 配置

```yaml
spring:
  redis:
    # Redis Cluster 配置
    cluster:
      nodes:
        - 192.168.1.1:6379
        - 192.168.1.2:6379
        - 192.168.1.3:6379
      # 节点超时时间
      node-timeout: 5000
      # 连接超时
      connect-timeout: 5000
      # 最大重定向次数
      max-redirects: 3

    # 连接池配置
    lettuce:
      pool:
        enabled: true
        max-active: 50        # 最大连接数
        max-idle: 20           # 最大空闲连接
        min-idle: 5           # 最小空闲连接
        max-wait: 3000ms      # 获取连接最大等待时间

    # 密码（如果有）
    password: ${REDIS_PASSWORD:}
```

### 4.2 Redis Cluster 初始化脚本

```bash
#!/bin/bash
# 初始化 3 节点 Redis Cluster

# 节点 1
redis-cli -h 192.168.1.1 -p 6379 CLUSTER MEET 192.168.1.2 6379
redis-cli -h 192.168.1.1 -p 6379 CLUSTER MEET 192.168.1.3 6379

# 分配槽位
# 等待节点握手完成后执行
redis-cli -h 192.168.1.1 -p 6379 CLUSTER ADDSLOTS {0..5460}
redis-cli -h 192.168.1.2 -p 6379 CLUSTER ADDSLOTS {5461..10922}
redis-cli -h 192.168.1.3 -p 6379 CLUSTER ADDSLOTS {10923..16383}

# 验证集群状态
redis-cli -h 192.168.1.1 -p 6379 CLUSTER INFO
redis-cli -h 192.168.1.1 -p 6379 CLUSTER NODES
```

---

## 5. 故障转移设计

### 5.1 Redis Sentinel vs Cluster

| 特性 | Redis Sentinel | Redis Cluster |
|------|---------------|---------------|
| 复制 | 主从复制 | 主从复制 + 槽位分片 |
| 故障转移 | Sentinel 自动切换 | 集群内自动重分配 |
| 扩展性 | 垂直扩展（读写分离） | 水平扩展（分片） |
| 客户端支持 | 几乎所有客户端 | 需要 cluster 支持 |

**推荐**：Tracker 去重使用 Redis Sentinel（简单可靠），如果吞吐量不够再用 Redis Cluster。

### 5.2 Sentinel 配置

```yaml
# redis-sentinel.conf
sentinel monitor mymaster 192.168.1.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 30000

# Spring Boot 连接 Sentinel
spring:
  redis:
    sentinel:
      master: mymaster
      nodes: 192.168.1.1:26379,192.168.1.2:26379,192.168.1.3:26379
```

---

## 6. 性能基准

### 6.1 吞吐量预估

| 场景 | 单实例 Redis | Redis Cluster (3节点) |
|------|-------------|----------------------|
| GET/SET 操作 | ~10万 QPS | ~30万 QPS |
| Pipeline 批量 (100条) | ~50万 QPS | ~100万 QPS |

### 6.2 延迟指标

| 操作 | P50 | P95 | P99 |
|------|-----|-----|-----|
| 单次 SET NX | 0.5ms | 1ms | 2ms |
| Pipeline 100条 | 3ms | 5ms | 10ms |
| 跨节点操作 | 1.5ms | 3ms | 5ms |

---

## 7. 监控指标

| 指标 | 说明 | 告警 |
|------|------|------|
| `redis.cluster.nodes` | 集群节点数 | < 3 |
| `redis.cluster.slots_assigned` | 已分配槽位 | < 16384 |
| `redis.commands.qps` | 命令 QPS | - |
| `redis.memory.used` | 内存使用 | > 70% |
| `redis.keyspace.hits` | 键命中数 | - |
| `redis.keyspace.misses` | 键未命中数 | > 10000/min |

---

## 8. 简化方案：两阶段去重

如果 Redis Cluster 部署复杂，可以考虑两阶段去重：

```
阶段1: 内存去重 (高性能)
├── 使用 LocalCache (Caffeine/Guava)
├── 容量: 10万条
├── TTL: 1分钟
└── 命中率预估: 80%

阶段2: Redis 去重 (精准)
├── 单实例 Redis 即可
├── 容量: 无限制
├── TTL: 5分钟
└── 命中率预估: 15%

综合命中率: 95% (0.80 + 0.20*0.75 = 0.95)
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TwoStageDeduplicationService {

    private final DeduplicationService redisDeduplication;
    private final Cache<String, Boolean> localCache;

    private static final Duration LOCAL_CACHE_TTL = Duration.ofMinutes(1);
    private static final int LOCAL_CACHE_MAX_SIZE = 100_000;

    public boolean isDuplicate(String eventId) {
        // 阶段1: 本地缓存
        if (localCache.getIfPresent(eventId) != null) {
            return true;  // 本地缓存命中，直接返回
        }

        // 阶段2: Redis 去重
        boolean isDup = redisDeduplication.isDuplicate(eventId);

        if (!isDup) {
            // 未重复，添加到本地缓存
            localCache.put(eventId, true);
        }

        return isDup;
    }
}
```

---

## 9. 配置项

```yaml
tracker:
  dedup:
    window-minutes: 5              # 去重窗口
    redis-cluster:
      enabled: false              # 是否启用集群模式
      nodes: []                   # 集群节点列表
      max-redirects: 3            # 最大重定向次数
    two-stage:
      enabled: true               # 启用两阶段去重
      local-cache-size: 100000   # 本地缓存容量
      local-cache-ttl-seconds: 60 # 本地缓存 TTL
```
