# 下一会话交接文档 (NEXT SESSION HANDOFF)

> 写于 2026-06-15 · 上一会话分支: `claude/project-goals-launch-plan-lvnnem`
> **新会话请先读本文件 + `docs/launch-readiness-assessment.md`(完整评估与修复方案)。**

---

## 0. 一句话现状

全系统已完成深度分析与架构裁决(架构基本健全,有 3 处结构性修正)。
**部署链路、前端 P0、TS SDK P0 已在本仓库修复并推送。** 剩余的关键路径是
**两个后端 submodule(`tracker-service`/`tracker-admin`)的 P0**,以及**本仓库内的 Java SDK P0**。

---

## 1. 必须先做:拉取后端 submodule 代码

submodule 的 url 是 `git@github.com:...`(SSH),本环境无 ssh 会失败。用 HTTPS 改写:

```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
git submodule update --init backend/tracker-service backend/tracker-admin
```

**关于推送权限:** 上一会话的工具范围只授权了 `HiCooper/tracker-system`,
没有 `add_repo`/`list_repos` 入口,也无法 push 到 `tracker-service`/`tracker-admin`。
新会话若**已被授予这两个仓库的写权限/已加入会话** → 直接在各自仓库建分支修复并提 PR。
若仍未授权 → 把每个后端 P0 改动整理成 `*.patch` 放到本仓库 `docs/patches/` 供人工 `git apply`。

各后端在各自仓库建分支(例如 `claude/backend-p0-fixes`),不要直接改 submodule 指针后推父仓库。

---

## 2. 环境与工具(已验证可用)

- Node 22 / npm 10 · Java 21(后端 source 为 17,用 21 编译 OK) · Maven 3.9 · Docker CLI 29 + compose v5
- **Docker daemon** 默认未启动,可 `dockerd >/tmp/dockerd.log 2>&1 &`(后台)启动;
  但 **Docker Hub 镜像拉取被网络策略阻断(403)**,因此**无法在本环境 `docker compose up`/build 镜像**。
  Java/Node 的 Maven Central / npm registry 可用。
- 验证命令:
  - SDK(TS): `cd tracker-sdk && npm install && npm run typecheck && npm test`(应 28/28 通过)
  - 前端: `cd apps/admin && npm install && npm run build`(应通过)
  - 后端: `cd backend/tracker-service && mvn -q -B package`(联网,产出 fat jar);test 用 `mvn -q -B test`
  - compose 校验(不拉镜像): `docker compose config`

## 3. 上一会话已完成(勿重复)

提交在 `claude/project-goals-launch-plan-lvnnem`:
- `7e2cd32` 全栈一键部署:补 Dockerfile(`docker/*.Dockerfile`、`apps/admin/Dockerfile`+`nginx.conf`)、
  重写 `docker-compose.yml`(修端口/Kafka 监听器/ClickHouse 凭据/前端服务);修前端 `qrcode.react` 缺失、
  SDK `@vitest/ui` 版本冲突
- `fc376e0` `docs/launch-readiness-assessment.md`(全量评估+分组件 P0/P1/P2 方案)
- `68eda18` TS SDK `flushImmediate` 丢事件修复 + `flushBeacon`/卸载排空;前端 `setupStore` 永久 loading + 假 id 修复
- `8e36184` TS SDK `endpoint`→`serverUrl` 自动拼接(破坏性,见 `.claude/decisions/D-20260615-002`);
  前端隐藏 6 个无后端菜单 + 下线对应路由
- 决策记录: `.claude/decisions/D-20260615-001`(部署)、`D-20260615-002`(SDK 契约)

---

## 4. 待办 P0(按优先级)

> 行号为近似(symbol 名稳定);改前请对照实际代码。完整背景见 `docs/launch-readiness-assessment.md` §3。

### 4.1 tracker-service [submodule]

1. **Redis 命名空间 bug(最关键)** — `src/main/resources/application.yml` 把 `spring.redis:`(约 45 行)
   整块改为 `spring.data.redis:`。否则 Boot 3 下 `RedisConfig` 注入的 `RedisProperties` 只绑定
   `spring.data.redis`,`REDIS_HOST/PORT/PASSWORD` env 全被静默忽略 → 去重/DLQ/健康检查在非 localhost 全挂。
   加一个 `@SpringBootTest` 配置绑定测试可一举抓到。
2. **ClickHouse 写入** — `src/main/java/com/gateflow/tracker/pipeline/ClickHouseWriter.java`
   - 约 75-77 行:`timestamp/client_time/received_at` 用 `setLong(epochMillis)` 绑定到 `DateTime64(3)` 列 →
     时间会被误解析。改为绑定 `Instant`/`LocalDateTime`,并与 V1 schema 物化视图里 `toDateTime(timestamp/1000)`
     (约 89 行)统一时间语义。
   - 约 113 行:`properties` 写成 `props.toString()`(非 JSON)→ 改用已存在但未被调用的
     `EnrichmentService.serializeProperties`(JSON)或注入 ObjectMapper。
   - **补 Testcontainers ClickHouse 集成测试**(当前该类 0 测试,所有写入 bug 都漏网)。
3. **启用 Kafka 持久化路径(结构修正 C)** — `service/EventCollectorService.java` 约 31 行
   `// kafkaProducer.sendEvent(event)` 被注释,当前是同步单行 JDBC 写(崩溃即丢、无削峰)。
   放开走 Kafka → `ClickHouseKafkaConsumer` 批量写;同步写降级兜底。
4. **双写 DLQ + Redis 挂时静默丢** — `api/EventController.java` 约 79-81 行 与
   `ClickHouseWriter.java` 约 46 行各写一次 DLQ → 统一一处;Redis 不可用时避免静默丢(回退本地/Kafka 死信)。
5. (P1)会话态迁 Redis(结构修正 A):`SessionService`/`SessionRepository` 目前对 ClickHouse
   ReplacingMergeTree 做读-改-写 + JVM 内锁,跨副本不正确、读到未合并脏行。
6. (P1)移除 `application.yml` 硬编码默认 `CLICKHOUSE_USER:victor/victor123`;
   `ClickHouseMigrationRunner`(约 46 行)吞异常仍启动 → 改 fail-fast。

### 4.2 tracker-admin [submodule]

1. **零测试** → 至少补 auth、plan 工作流、核心 CRUD。
2. **密钥/凭据** — `config/JwtUtil.java`(约 18 行)硬编码 JWT 密钥默认值 → 改为必填 env(缺失即启动失败);
   `service/AuthService.java`(约 50-67 行)`initDefaultAdmin` 把 `admin/admin123` 明文打日志 → 删日志、首登强制改密。
3. **无授权** — `config/JwtAuthFilter.java` 解析了 `role` 但从不校验,任何 token 可删/审任意资源 → 加 RBAC;
   `PlanService` 约 125 行 `// TODO: get from JWT` 捕获真实 reviewer。
4. **WebSocket 无认证** — `config/WebSocketConfig.java` 的 `/ws/debug/**` + `setAllowedOrigins("*")`,
   不在 `/api/v1` 下故 JwtAuthFilter 看不到 → 加握手鉴权拦截器,校验 token 与 sessionId 归属。
   顺手:`DebugWebSocketHandler`(约 47 行)每连接泄漏 `ScheduledExecutorService` + 残留 mock 模拟,清理。
5. **聚合子系统空转(结构修正 B)** — `TrackerAdminApplication` 有 `@EnableScheduling` 但**无任何 `@Scheduled`**,
   `tracker_event_agg`/`tracker_session_agg`/`tracker_aggregation_job` 从不被写 → Event/Session 分析页空数据。
   **推荐**:删 MySQL agg 表 + aggregation_job,`EventAnalysisService`/`SessionAnalysisService` 改直查 ClickHouse
   (`AnalysisService` 已是直查 CH 的范例);**或**实现 CH→MySQL 的 `@Scheduled` 聚合 job。
6. (P1)`MonitorController` ~90% 假数据(含 ClickHouse 健康未检测就报 "UP")→ 接真实数据或下线对应前端卡片;
   `CorsConfig` `allowCredentials(true)`+通配 origin 收敛;`AnalysisService` CH 异常静默返回 0 → 区分"无流量"。

### 4.3 Java SDK backend/tracker-sdk [本仓库,无需扩范围!]

服务端契约见 `backend/tracker-service/src/main/java/com/gateflow/tracker/api/dto/EventDTO.java`(嵌套)
与 `EventResponse.java`。

1. **wire 契约全错** — `model/TrackEvent.java` 是扁平结构 + `Instant` 时间戳;服务端要嵌套
   `page/session/device/context/data` + `Long` epoch-millis。在 `GateFlowClient`(约 218 行序列化处)
   把 TrackEvent 映射成服务端 `EventDTO` 形状,timestamp 转 epoch millis。
2. **`/api/v1/collect/auth` 不存在** — `auth/AuthClient.java`(约 28 行)→ 需服务端实现该鉴权端点
   (与 admin 的 GateFlow 集成一起定),或 SDK 改为既有鉴权;在服务端定下来前先标注/禁用 appKey 路径。
3. (P1)`model/TrackResponse.java` 形状与服务端 `{code,message,data:{...}}` 不符 → `isSuccess()` 恒 false;
   补 MockWebServer 契约测试。

### 4.4 前端后续(本仓库,P2)

- 6 个被隐藏菜单对应的页面文件仍在(`apps/admin/src/pages/tracker/{data-platform,portrait,behavior,experience,bi,cdp}` 等),
  待后端接口实现后恢复菜单+路由;另有 7 个从未路由的死页面(`advanced/*`、`experience/{Heatmap,UserPortrait}`、
  `dashboard/DashboardListPage`)需决定恢复或删除。
- 无 lint/test 脚本;`vite.config.ts` 加 `manualChunks` 拆 antd/echarts。

---

## 5. 建议执行顺序

1. 后端结构性修正 A/B/C(会话态→Redis、聚合统一 CH、启用 Kafka)→ 在正确地基上修 bug。
2. 打通采集端到端:TS SDK(已改)+ service Redis/CH 写入 + Java SDK 契约 → 跑通"发事件→CH 可查"并加集成测试。
3. 打通管理端到端:admin 安全(密钥/授权/WS)+ 聚合或直查 CH → 登录→埋点管理→分析。
4. 测试与安全基线:两后端补测试、CORS/actuator/swagger 收敛、限流与请求体上限。

## 6. 关键陷阱备忘

- submodule 必须用 §1 的 HTTPS 改写才能拉取。
- 本环境无法构建/运行 Docker 镜像(Hub 403);验证靠 `mvn package` / `npm build,test` / `docker compose config`。
- ClickHouse 官方镜像默认用户 `default` 无密码;compose 已据此把两后端 CH 凭据设为 default。
- 提交信息末尾保留 `https://claude.ai/code/session_...` 行;不要把模型 id 写进任何产物。
- 所有父仓库改动推 `claude/project-goals-launch-plan-lvnnem`;后端各自建分支。
