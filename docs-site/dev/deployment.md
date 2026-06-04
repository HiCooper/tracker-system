# 部署与监控

本文档描述 Tracker 系统的部署配置、性能优化和监控告警。

## Docker Compose 部署

```yaml
services:
  tracker-server:
    build: ./tracker-server
    ports:
      - "8081:8081"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=20
    depends_on:
      redis:
        condition: service_healthy
      clickhouse:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ./init-db:/docker-entrypoint-initdb.d
      - ch_data:/var/lib/clickhouse
```

## 性能优化

### 客户端

| 优化项 | 实现 | 效果 |
|--------|------|------|
| 事件节流 | 点击 300ms 防抖 | 减少无效事件 |
| 批量上报 | 50条或2秒 | 减少网络请求 |
| 曝光阈值 | 500ms 才上报 | 过滤无效曝光 |
| 离线缓存 | IndexedDB | 保障不丢失 |

### 服务端

| 优化项 | 实现 | 效果 |
|--------|------|------|
| 批量写入 | INSERT 批量 | 提升写入效率 |
| 窗口去重 | Redis SET NX | 减少重复存储 |
| 限流保护 | Token Bucket | 防止流量冲击 |
| 异步处理 | Kafka 解耦 | 提升吞吐量 |

## 监控指标

### 业务指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `tracker.events.received` | 接收事件数 | — |
| `tracker.events.written` | 写入成功数 | — |
| `tracker.events.duplicate` | 去重事件数 | — |
| `tracker.events.dlq` | DLQ 入队数 | > 100/min |
| `tracker.queue.size` | 队列大小 | > 1000 |

### 健康指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `tracker.latency.p99` | 写入延迟 P99 | > 500ms |
| `tracker.circuit_breaker.state` | 熔断器状态 | open |
| `tracker.errors` | 处理错误数 | > 10/min |

## 告警规则 (Prometheus)

```yaml
groups:
  - name: tracker-dlq
    rules:
      - alert: TrackerDLQHighRate
        expr: rate(tracker_events_dlq_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "DLQ 入队速率过高"

      - alert: TrackerCircuitBreakerOpen
        expr: tracker_circuit_breaker_state == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse 熔断器打开"
```

## 生产环境注意事项

1. Redis 开启 AOF 持久化，配置 `maxmemory-policy allkeys-lru`
2. ClickHouse 使用集群部署或 ClickHouse Cloud
3. tracker-server 配置 HikariCP `maximum-pool-size=20`
4. 使用 `depends_on condition: service_healthy` 确保依赖服务就绪
