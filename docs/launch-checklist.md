# 上线就绪 Checklist(现行版)

> 更新日期: 2026-06-22 · 取代 2026-06-15 的 `launch-readiness-assessment.md`(那是基线评估,其 P0 多已修复)。
> 本文是**可勾选的上线闸门**:✅ 已就绪 / ⬜ 上线前必做 / 🟡 不阻塞但需知晓。

## 0. 结论

代码与功能层面已大幅成熟,2026-06-15 评估的几乎全部 P0 阻断项已修复并合并。
**最后一关是「在真实环境把端到端链路实跑一遍」** —— 现已提供自动化工具(见 §2.1)。
跑通 `scripts/smoke-test.sh`(或 `e2e-smoke` CI 变绿)即代表采集主链路可上线。

---

## 1. 已就绪 ✅(逐项核实)

- [x] 结构修正 A 会话态→Redis / B 分析统一 ClickHouse / C Kafka 持久化路径(`async-kafka=true` 默认)
- [x] Redis 命名空间 Boot 3 `spring.data.redis`
- [x] 采集端鉴权:`SignatureAuthFilter` + SDK Token(`/collect/auth`)+ HMAC `SignatureVerifier`
- [x] admin 安全:JWT 密钥 fail-fast、RBAC(`RbacInterceptor`)、WS 握手鉴权(`WebSocketAuthInterceptor`)、
      首登可设初始密码(`ADMIN_INITIAL_PASSWORD`,否则一次性随机)、去除静态弱口令
- [x] 前后端 / SDK 契约对齐;身份缝合 userKey;事件+会话 app_code 维度贯通
- [x] 测试:tracker-service 97、tracker-admin 93 单测通过;CH/Redis Testcontainers IT 在 service CI 运行
- [x] 前端:无后端支撑的菜单已隐藏;错误不再静默;占位图诚实化;404 兜底
- [x] **修复硬编码 `localhost:8099`**:tracker-admin 内网基址改为 `GATEFLOW_ADMIN_BASE_URL`(否则容器化采集鉴权恒断)
- [x] 部署物齐备:`docker-compose.yml` + 三 Dockerfile + `docker-compose.infra.yml`;三仓各有 `ci.yml`

---

## 2. 上线前必做 ⬜(gating)

### 2.1 端到端冒烟(最关键)
- [ ] 本地起栈并跑通冒烟:
  ```bash
  ADMIN_INITIAL_PASSWORD='SmokeAdmin#2026' docker compose up -d --build
  bash scripts/smoke-test.sh        # 需 curl + jq
  ```
  脚本验证:健康闸门 → admin 登录 → 建应用 → `/collect/auth` 换 SDK Token →
  上报事件 → **ClickHouse 落库校验** → admin 可查。任一步断开会精确报点。
- [ ] CI `e2e-smoke` 工作流首次变绿(合并到 main 触发,或手动 `workflow_dispatch`)。
      私有子模块需配置 `SUBMODULE_TOKEN`(跨仓读权限 PAT)。

### 2.2 数据库迁移
- [ ] ClickHouse 迁移 V1/V2/V3 已对真实 CH 应用(events/sessions 含 `app_code`、MV、索引生效)
- [ ] MySQL(tracker-admin)Flyway 迁移已应用

### 2.3 生产配置与密钥(逐项确认非默认/非示例值)
- [ ] `JWT_SECRET`(admin)≥32 字节、来自密钥管理,缺失即 fail-fast
- [ ] `ADMIN_INITIAL_PASSWORD` 改为强密码(或首登后立即改密),**勿沿用 compose 里的示例值**
- [ ] `REDIS_PASSWORD`、`TRACKER_DB_PASSWORD`、CH 账号 设为生产凭据
- [ ] `GATEFLOW_ADMIN_BASE_URL` 指向真实 admin 地址(分布式/k8s 用服务名/Ingress)
- [ ] `KAFKA_BOOTSTRAP_SERVERS`、`CLICKHOUSE_URL` 指向生产集群
- [ ] CORS 收敛到白名单;Swagger / actuator 敏感端点在生产关闭或鉴权
- [ ] 限流阈值、请求体大小上限按真实流量设定

### 2.4 冒烟后的基本验证
- [ ] 基本压测:采集 QPS 达标、限流生效、背压/DLQ 正常
- [ ] DLQ 重放演练;会话超时落库验证;Kafka 消费滞后观察

---

## 3. 不阻塞上线但需知晓 🟡

- 监控页诚实标注「未接入」的能力:Web Vitals 性能、API 调用统计、Kafka 消费 lag、数据质量引擎
  (均为诚实降级,不会展示假数据)。上线后可作为观测增强迭代。
- CDP / 用户画像 为**延后子系统**(入口已隐藏,设计文档见 `docs-site/dev/cdp-integration`)。
- 前端部分页的空态/响应式/URL 深链为增量采用(样板已落地,非阻断)。

---

## 4. 一句话

从 2026-06-15「几乎全线 ❌」到现在:**P0 阻断基本清零、可部署**;
**上线放行条件 = §2.1 端到端冒烟在目标环境跑通 + §2.3 配置密钥到位**。
