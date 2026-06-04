# Tracker 服务端设计

本文档描述 Tracker Server 的核心服务实现，包括事件接收、校验、去重、增强和存储。

## 模块结构

```
tracker-server/src/main/java/com/gateflow/tracker/
├── api/                      # API 层
│   ├── EventController.java  # POST /api/v1/collect
│   └── dto/
│       ├── EventRequest.java
│       └── EventResponse.java
├── service/                  # 业务层
│   ├── EventCollector.java
│   ├── DeduplicationService.java
│   ├── EnrichmentService.java
│   └── SessionService.java
├── pipeline/                 # 数据管道
│   ├── KafkaProducer.java
│   ├── ClickHouseWriter.java
│   └── AggregationPipeline.java
└── storage/
    ├── ClickHouseConfig.java
    └── ClickHouseRepository.java
```

## 事件接收 API

**POST /api/v1/collect**

处理流程：

```
接收请求 → 限流检查 → 逐事件处理 → 返回统计
              │
              ├─ 校验失败 → DLQ
              ├─ 去重命中 → skip
              └─ 通过 → 数据增强 → ClickHouse写入
                           │
                           └─ 写入失败 → DLQ
```

响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "accepted": 10,
    "duplicate": 1,
    "rejected": 0
  }
}
```

## 核心服务

### 去重服务 (DeduplicationService)

基于 Redis SET NX 实现窗口去重：

- Key 格式: `dedup:{eventId}`
- 窗口大小: 5 分钟
- Redis 故障降级: 默认非重复，优先保障数据不丢失

### 数据增强 (EnrichmentService)

自动补充事件的上下文信息：

| 增强项 | 来源 | 说明 |
|--------|------|------|
| UTM 参数 | URL 解析 | utm_source/medium/campaign |
| 设备类型 | User-Agent 解析 | mobile/desktop/tablet |
| 操作系统 | User-Agent 解析 | iOS/Android/Windows/macOS |
| 浏览器 | User-Agent 解析 | Chrome/Safari/Firefox |

增强失败时不阻塞主流程，返回原始事件继续处理。

### ClickHouse 写入 (ClickHouseWriter)

带熔断保护的批量写入：

- **连接池**: HikariCP 管理连接
- **熔断器**: Resilience4j CircuitBreaker，50% 失败率触发
- **熔断打开**: 事件写入 DLQ，30 秒后半开尝试
- **SQL 安全**: 特殊字符转义防注入

## 配置

```yaml
server:
  port: 8081

tracker:
  batch:
    size: 100
    interval: 2000
  rate-limit:
    max-per-second: 10000
    burst: 20000
  dedup:
    window-minutes: 5

spring:
  datasource:
    clickhouse:
      url: jdbc:clickhouse://localhost:8123/gateflow_tracker
  redis:
    host: localhost
    port: 6379
  kafka:
    bootstrap-servers: localhost:9092
```
