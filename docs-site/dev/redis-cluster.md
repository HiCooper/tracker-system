# Redis 集群与去重

本文档描述在高并发场景下使用 Redis Cluster 实现事件去重的方案。

## 问题背景

单实例 Redis 存在瓶颈：

```
Tracker Server → Redis 单实例 (单线程, ~10万 QPS)
```

当流量超过单实例容量时，需要水平扩展到 Redis Cluster。

## Redis Cluster 分片

Redis Cluster 将 16384 个哈希槽分配给不同节点：

```
Slot 范围          节点
0 - 5460          192.168.1.1:6379
5461 - 10922      192.168.1.2:6379
10923 - 16383     192.168.1.3:6379
```

客户端根据 `CRC16(key) % 16384` 计算槽位，直连对应节点。

## Key 设计

```
去重 Key 格式: dedup:{eventId}
Hash Tag 示例: {dedup:evt_20260513_abc123}

使用 CRC16 计算槽位:
int slot = crc16(eventId) % 16384;
```

## 去重实现

### 单事件去重

```java
public boolean isDuplicate(String eventId) {
    String key = "dedup:" + eventId;
    Boolean result = redisTemplate.opsForValue()
        .setIfAbsent(key, "1", Duration.ofMinutes(5));
    return !Boolean.TRUE.equals(result);
}
```

### 批量去重优化

使用 Redis Pipeline 减少网络往返：

```java
public List<String> filterDuplicates(List<String> eventIds) {
    // 使用 Pipeline 批量 SET NX
    // 返回新事件 ID 列表
}
```

## 故障降级

Redis 不可用时的降级策略：

```
Redis 连接失败 → 记录告警 → 返回 isDuplicate = false
                              (宁可重复，不可丢失)
```

## 连接配置

```java
@Configuration
public class RedisConfig {
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisClusterConfiguration clusterConfig =
            new RedisClusterConfiguration(Arrays.asList(
                "192.168.1.1:6379",
                "192.168.1.2:6379",
                "192.168.1.3:6379"
            ));
        return new LettuceConnectionFactory(clusterConfig);
    }
}
```

## 性能优化

| 优化项 | 实现 | 效果 |
|--------|------|------|
| Pipeline 批量 | 一次网络往返处理多个 key | 减少 RTT |
| 连接池 | Lettuce 连接池复用 | 减少建连开销 |
| 本地缓存 | Caffeine 一级缓存 | 减少 Redis 调用 |
