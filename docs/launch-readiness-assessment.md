# Tracker System 上线就绪评估与修复方案

> 生成日期: 2026-06-15 · 基线分支: `claude/project-goals-launch-plan-lvnnem`
> 范围: 全系统(TS SDK · Java SDK · tracker-service · tracker-admin · apps/admin 前端)

---

## 0. 总体结论

功能广度可观,但**尚未上线就绪**。贯穿性问题是**层与层的契约对不上**(SDK↔采集服务、前端↔管理服务),
叠加后端几个致命配置/正确性 bug、缺失的持久化缓冲,以及**几乎全线缺测试 + 安全短板**。
根因:**没有一条端到端链路被验证过**,各层带着对不上的契约「独立完工」。

架构裁决: **宏观架构基本健全**,但有 3 处结构性修正须先做(见 §1)。其余均为实现级问题。

---

## 1. 架构裁决与结构性修正

### 健全、保持不变
- SDK → 采集服务 →(Kafka)→ ClickHouse 管道;采集服务与管理服务分离。
- ClickHouse(事件) + MySQL(元数据) + Redis(去重/DLQ)的存储分工。
- 前后端分离 + React;统一 axios 拦截器/JWT 注入/401 解耦。
- tracker-service 的 DLQ 设计(退避+抖动+死信+熔断感知重放)、两段式去重、幂等 Kafka producer 配置。

### 结构性修正(在修 bug 之前完成)

| # | 问题 | 证据 | 修正方向 |
|---|------|------|---------|
| **A** | 会话状态放错存储:ClickHouse RMW + JVM 内锁维护可变计数器 | `SessionRepository.save` 对 `sessions`(ReplacingMergeTree)做 INSERT;`findById` 无 `FINAL`/`ORDER BY ... LIMIT 1`,读到未合并脏行;`SessionService` 锁仅单 JVM 有效 | 活跃会话态迁至 **Redis**(hash/计数),会话超时结束时一次性落 ClickHouse/MySQL agg |
| **B** | 聚合归属混乱:3 条分析路径并存,MySQL agg 表无人写 | `@EnableScheduling` 无任何 `@Scheduled`;`tracker_event_agg`/`tracker_session_agg`/`tracker_aggregation_job` 从不被写;`AnalysisService` 已直查 ClickHouse | 统一以 **ClickHouse** 为分析存储;删除冗余 MySQL agg 表 + aggregation_job;`EventAnalysisService`/`SessionAnalysisService` 改为查 CH |
| **C** | 采集持久化路径未定:Kafka 缓冲被注释 | `EventCollectorService.collect` 第 31 行 `// kafkaProducer.sendEvent(event)`,同步单行 JDBC 写为活跃路径 | 启用已写好的 Kafka 路径(削峰/可重放),同步写作兜底;或显式承诺同步+批量并补持久化 |

**架构卫生:** 建立事件 schema 的**单一可版本化契约**(SDK + 采集服务 + admin 共享),加契约测试,杜绝契约漂移。

---

## 2. 组件评级

| 组件 | 实现度 | 测试 | 安全 | 上线就绪 |
|------|:---:|:---:|:---:|:---:|
| tracker-sdk (TS) | 高 | 浅 | — | ❌ |
| tracker-service | 高 | 单测 ~35-45% | 差 | ❌ |
| tracker-admin | CRUD 实 / 分析半 | **零** | 差 | ❌ |
| apps/admin (前端) | 高 | 仅 1 条 e2e | 中 | ❌ |
| tracker-sdk (Java) | 结构好 | 无契约测试 | — | ❌ |

---

## 3. 修复方案(按组件 · 含具体改法)

> 仓库范围标注: **[本仓库]** = tracker-system 可直接改推;**[submodule]** = 需 add_repo 纳入 tracker-service / tracker-admin。

### 3.1 前端 apps/admin **[本仓库]**

**P0**
1. **6 个分析菜单指向不存在的后端**(behavior/experience/portrait/data-platform/advanced/cdp,~38 端点 404)。
   - 改法: 在 `AdminLayout.tsx` 菜单 + `router.tsx` 中**隐藏/移除**这些入口(用 feature flag 或直接注释),只保留有后端支撑的:setup、analysis、engineering(plans/lineage/debug/autotrack/verify)、monitor。后续随后端实现再逐个放开。
2. **`propertyApi` 路径错配** `/v1/setup/properties` → 后端是 `/v1/properties`。
   - 改法: `services/propertyApi.ts` 修正路径前缀。
3. **`bi/DashboardBuilderPage` 是 no-op 桩页**但挂在菜单。
   - 改法: 暂时下线 `/tracker/bi` 入口,或接到已存在但被弃用的 `dashboard/DashboardListPage`(它是真实现)。

**P1**
4. **store 失败时 `loading` 永真**(`setupStore.fetchApps/Pages/Blocks/Functions` 无 try/catch/finally)。
   - 改法: 统一加 `try/catch/finally`,失败 `message.error` + 复位 loading。
5. **无 lint/test 脚本**;eslint 未启用 `@typescript-eslint` 规则。
   - 改法: `package.json` 加 `lint`/`test`;eslint 接入 ts 规则;CI 跑。

**P2**
6. 7 个死页面(advanced/*、experience/{Heatmap,UserPortrait}、dashboard/DashboardListPage)—— 决定上线或删除。
7. `vite.config.ts` 加 `manualChunks` 拆 antd/echarts vendor,消 1MB chunk 警告。
8. `setupStore.createApp` 用 `Date.now()` 造假 id → 改用服务端返回。
9. token 迁 httpOnly cookie;移除死配置 `VITE_ENABLE_MOCK`。

### 3.2 TS SDK tracker-sdk **[本仓库]**

**P0**
1. **不拼 `/api/v1/collect`**:`EventQueue`/`PageCollector` 直接 POST `config.endpoint`。
   - 改法: 配置区分 `serverUrl`(基址)与内部拼接 `/api/v1/collect`;或文档强制要求完整路径。同时修正 `GateFlowIntegration` 的 `${endpoint}/api/v1/user/init` 双拼问题。
2. **`/api/v1/user/init` 端点不存在** → GateFlow userId/实验标签路径死。
   - 改法: 后端补该端点(见 3.4),或前端关闭 `gateFlow.enabled` 默认值并文档说明。

**P1**
3. **SPM / error(`errorMessage/Stack/Type`)/ 自定义 `tagName` 字段被服务端丢弃**(server `EventData` 无这些,只读 `data.custom`)。
   - 改法: SDK 将这些字段统一映射进 `data.custom`;**或**服务端 `EventDTO.EventData` + EnrichmentService 增补字段(二选一,优先 SDK 侧映射,改动小)。
4. **无 Tracker 级 unload flush** → 关闭标签页时队列里的 click/scroll/stay/error 丢失。
   - 改法: `Tracker.init` 注册 `pagehide`/`visibilitychange`,用 `sendBeacon` 排空队列。
5. **`flushImmediate` 静默吞错返回 false** → 失败的即时事件既不重入队也不报错。
   - 改法: 让其在失败时 reject 或显式重入队。

**P2**: 重试加指数退避(对齐 Java SDK);补 Page/Scroll/Exposure 采集器测试 + **wire 契约测试**(mock fetch 断言 body);`appVersion` 误用 `appId`。

### 3.3 tracker-service **[submodule]**

**P0**
1. **Redis 命名空间 bug**: `application.yml` `spring.redis.*` → **`spring.data.redis.*`**(Boot 3)。否则 `REDIS_HOST/PORT/PASSWORD` env 被静默忽略,去重/DLQ/健康检查在非 localhost 全挂。
2. **ClickHouse 写入未验证/大概率坏**:
   - `DateTime64(3)` 用 `setLong(epochMillis)` 绑定 → 时间被误解析。改为绑定 `LocalDateTime`/正确的 DateTime64 字面量,并统一 schema 与 MV 的时间语义。
   - `properties` 写成 `Map.toString()`(非 JSON)→ 改用已存在但未被调用的 `EnrichmentService.serializeProperties`(JSON)。
   - **补 Testcontainers 集成测试**覆盖 `ClickHouseWriter`。
3. **启用 Kafka 持久化路径**(结构修正 C):放开 `EventCollectorService` 第 31 行,采集走 Kafka → consumer 批量写 CH;同步写降级兜底。
4. **CH 失败时双写 DLQ + Redis 也挂时静默丢**:`EventController` catch 与 `ClickHouseWriter` 各写一次 DLQ。
   - 改法: 统一一处 DLQ 写入;Redis 不可用时回退到本地/Kafka 死信,避免静默丢。

**P1**
5. 会话态迁 Redis(结构修正 A)。
6. `/api/v1/collect` 无认证 + 限流形同虚设(默认 10k/s)+ 无 events 列表大小上限 → 加 appKey 校验、合理限流、`@Size` 上限、请求体大小限制。
7. `ClickHouseMigrationRunner` 吞异常仍启动 → 改为 schema 失败 fail-fast。
8. 补 `@SpringBootTest` 配置绑定测试(可一举抓到 P0#1)。

**P2**: `HealthController` DEGRADED 仍返回 200 → 返回正确状态码并与 actuator 合并;Resilience4j YAML 死配置(注册表用 `defaultConfig`)→ 对齐或删除;把已算出的 DLQ size/去重命中率/accept-reject 接入 Micrometer;清理死代码(`collectViaKafka`、未用 Kafka 类如不采纳);锁紧 CORS;移除硬编码 `victor/victor123` 默认值。

### 3.4 tracker-admin **[submodule]**

**P0**
1. **零测试** → 至少补 auth、plan 工作流、核心 CRUD 测试。
2. **硬编码 JWT 密钥默认值 + `admin/admin123` 明文打日志**(`JwtUtil.java:18`、`AuthService.initDefaultAdmin`)。
   - 改法: 密钥改为必填 env(缺失即启动失败);删明文日志;首登强制改密。
3. **无授权**:`role` claim 解析了但从不校验,任何 token 可删/可审任意资源。
   - 改法: 在 `JwtAuthFilter` 或方法级加 RBAC;plan review 捕获真实 reviewer(消除 `PlanService` 的 `// TODO: get from JWT`)。
4. **`/ws/debug/**` 无认证 + `allowedOrigins("*")`** → 任何人可连任意调试会话。
   - 改法: 加握手鉴权拦截器,校验 token 与 sessionId 归属。
5. **聚合子系统空转**(结构修正 B):要么实现 CH→MySQL 的 `@Scheduled` 聚合 job,**要么**(推荐)删 MySQL agg 表,Event/Session 分析改直查 ClickHouse。

**P1**
6. `MonitorController` ~90% 假数据(含 ClickHouse 健康未检测就报 "UP")→ 接真实数据或明确标注未实现并下线对应前端卡片。
7. CORS `allowCredentials(true)` + 通配 origin → 收敛白名单。
8. `AnalysisService` ClickHouse 异常静默返回 0 → 与「无流量」区分,surface 错误。
9. 补 6 个缺失分析 controller(behavior/experience/portrait/data-platform/advanced-analysis/cdp)**或**与前端一起 de-scope v1;补 `/api/v1/user/init`(若保留 GateFlow 集成)。

**P2**: Lineage 的 `LIKE '%key%'` 子串匹配脆弱 + plan 节点误标 `"dashboard"`;逻辑删除 event 残留 property 孤儿行;WS handler 每连接泄漏 `ScheduledExecutorService` + 残留 mock 模拟;清理未用依赖(Redisson/MapStruct);JWT 弱密钥静默补齐改为 fail-fast;Swagger 全环境公开 → 生产关闭。

### 3.5 Java SDK backend/tracker-sdk **[submodule]**

**P0**
1. **wire 契约全错**:`TrackEvent` 扁平 + `Instant` 时间戳,服务端要嵌套 `EventDTO` + `Long` 毫秒。
   - 改法: 重映射为嵌套 page/session/device/context/data + epoch-millis;或从服务端 DTO codegen。
2. **`/api/v1/collect/auth` 不存在** → 任何带 appKey 的客户端首发即抛。
   - 改法: 后端实现该鉴权端点(与 3.4 的 GateFlow 集成一起),或 SDK 改为既有鉴权方式。

**P1**: `TrackResponse` 形状不匹配(server `{code,message,data:{...}}`)→ `isSuccess()` 恒 false;补 MockWebServer 契约测试。
**P2**: 移除遮蔽 `java.io.IOException` 的自定义内部类;加 jacoco/surefire。

---

## 4. 建议执行顺序

1. **结构性修正 A/B/C**(会话态→Redis、聚合统一 CH、启用 Kafka)—— 决定后续 bug 修在正确地基上。
2. **采集端到端打通**(P0): TS SDK 路径/字段 + service Redis/CH 写入 + Kafka → 跑通一条「SDK 发事件 → CH 可查」链路并加集成测试。
3. **管理端到端打通**(P0): 前端隐藏无后端菜单 + propertyApi 修正 + admin 安全(密钥/授权/WS)→ 跑通登录→埋点管理→分析链路。
4. **安全与测试基线**: 两后端补测试、CORS/actuator/swagger 收敛、限流与体积上限。
5. **观测性与清理**(P2): Micrometer 指标、死代码、bundle 拆分。

## 5. 范围说明

- **[本仓库]** 可立即实现并推送: 前端 P0/P1、TS SDK P0/P1。
- **[submodule]** 需先 `add_repo` 纳入 `HiCooper/tracker-service`、`HiCooper/tracker-admin` 并确认写权限,方可提交后端修复。
