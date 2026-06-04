# 服务访问入口

## 开发环境

| 服务 | 地址 | 说明 |
|------|------|------|
| Tracker Server | `http://localhost:8081` | 埋点事件接收服务 |
| Tracker Admin | `http://localhost:8082` | 埋点管理后台 |
| ClickHouse | `http://localhost:8123` | 分析存储 |
| Redis | `localhost:6379` | 去重缓存 |
| Kafka | `localhost:9092` | 消息队列 |

## API 端点

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 事件采集 | POST | `/api/v1/collect` | 批量上报用户行为事件 |
| 健康检查 | GET | `/health` | 服务健康状态 |
| 指标查询 | GET | `/api/v1/metrics` | Prometheus 指标 |
