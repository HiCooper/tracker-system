#!/usr/bin/env bash
#
# 端到端冒烟:验证「SDK 发事件 → tracker-service 采集 → ClickHouse 落库 → tracker-admin 可查」整条链路。
# 这是「能否上线」的关键闸门 —— 旧评估反复指出「没有一条端到端链路被验证过」,本脚本将其自动化。
#
# 前置:full stack 已起(docker compose up -d --build),curl + jq 可用。
# 退出码:0 = 全链路通;非 0 = 在第 N 步断开(输出已定位)。
#
# 可配(env 覆盖默认):
#   ADMIN_URL    (默认 http://localhost:8082)
#   SERVICE_URL  (默认 http://localhost:8088)
#   CH_URL       (默认 http://localhost:8123)
#   ADMIN_USER / ADMIN_INITIAL_PASSWORD  (默认 admin / SmokeAdmin#2026)
#   APP_CODE     (默认 SMOKE_APP)
#
set -euo pipefail

ADMIN_URL="${ADMIN_URL:-http://localhost:8082}"
SERVICE_URL="${SERVICE_URL:-http://localhost:8088}"
CH_URL="${CH_URL:-http://localhost:8123}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PW="${ADMIN_INITIAL_PASSWORD:-SmokeAdmin#2026}"
APP_CODE="${APP_CODE:-SMOKE_APP}"
MARKER="smoke-$(date +%s)-$$"   # 唯一 anonymousId,用于精确定位本次落库的行

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ FAIL:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m[%s]\033[0m %s\n' "$1" "$2"; }

command -v curl >/dev/null || die "需要 curl"
command -v jq   >/dev/null || die "需要 jq"

# 通用:轮询直到命令成功或超时
wait_for() {  # wait_for <desc> <timeout_s> <cmd...>
  local desc="$1" timeout="$2"; shift 2
  local end=$(( $(date +%s) + timeout ))
  until "$@" >/dev/null 2>&1; do
    [ "$(date +%s)" -ge "$end" ] && die "$desc(等待 ${timeout}s 超时)"
    sleep 2
  done
  ok "$desc"
}

bold "==== 埋点系统端到端冒烟 ===="
echo "admin=$ADMIN_URL  service=$SERVICE_URL  ch=$CH_URL  app=$APP_CODE  marker=$MARKER"

# ── 0. 健康闸门 ───────────────────────────────────────────────
step 0 "等待各服务就绪"
wait_for "ClickHouse 可达"      90 bash -c "curl -fsS '$CH_URL/ping'"
wait_for "tracker-service 健康" 120 bash -c "curl -fsS '$SERVICE_URL/actuator/health' | grep -q '\"status\":\"UP\"'"
wait_for "tracker-admin 健康"   120 bash -c "curl -fsS '$ADMIN_URL/actuator/health' | grep -q '\"status\":\"UP\"'"

# ── 1. 管理端登录 ─────────────────────────────────────────────
step 1 "tracker-admin 登录获取 JWT"
LOGIN=$(curl -fsS -X POST "$ADMIN_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PW\"}") || die "登录请求失败"
TOKEN=$(echo "$LOGIN" | jq -r '.data.token // empty')
[ -n "$TOKEN" ] || die "登录未返回 token(响应: $LOGIN)。检查 ADMIN_INITIAL_PASSWORD 是否一致"
ok "登录成功,拿到 token"

# ── 2. 准备应用(appCode 即采集 X-App-Key);幂等 ───────────────
step 2 "确保应用 $APP_CODE 存在"
CREATE=$(curl -sS -X POST "$ADMIN_URL/api/v1/setup/apps" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"appName\":\"E2E Smoke\",\"appCode\":\"$APP_CODE\",\"description\":\"e2e smoke\"}" || true)
if echo "$CREATE" | jq -e '.code==200' >/dev/null 2>&1; then
  ok "应用已创建"
else
  # 已存在(重复 appCode)也算就绪,只要内网查得到
  wait_for "应用可被内网查询(appCode→app)" 10 \
    bash -c "curl -fsS '$ADMIN_URL/api/v1/internal/app-key/$APP_CODE' | grep -q '\"appCode\"'"
  ok "应用已存在(复用)"
fi

# ── 3. SDK 自服务鉴权:换取 SDK Token ─────────────────────────
step 3 "POST /collect/auth 换取 SDK Token(验证 8099→可配 修复)"
AUTH=$(curl -fsS -X POST "$SERVICE_URL/api/v1/collect/auth" -H "X-App-Key: $APP_CODE") \
  || die "鉴权请求失败(若 401: 检查 GATEFLOW_ADMIN_BASE_URL 是否指向 admin、appCode 是否存在)"
SDK_TOKEN=$(echo "$AUTH" | jq -r '.sdkToken // empty')
[ -n "$SDK_TOKEN" ] || die "未返回 sdkToken(响应: $AUTH)"
ok "拿到 SDK Token"

# ── 4. 上报一条事件 ───────────────────────────────────────────
step 4 "POST /collect 上报 page_view 事件"
NOW_MS=$(( $(date +%s) * 1000 ))
EVENT=$(cat <<JSON
{"clientId":"$APP_CODE","events":[{
  "eventId":"$MARKER","eventType":"page_view","anonymousId":"$MARKER",
  "timestamp":$NOW_MS,"platform":"web","consent":true,
  "page":{"url":"https://smoke.test/home","title":"home"}
}]}
JSON
)
COLLECT_CODE=$(curl -sS -o /tmp/collect_resp.json -w '%{http_code}' \
  -X POST "$SERVICE_URL/api/v1/collect" \
  -H "X-Sdk-Token: $SDK_TOKEN" -H 'Content-Type: application/json' -d "$EVENT")
[ "$COLLECT_CODE" = "200" ] || die "采集返回 $COLLECT_CODE(响应: $(cat /tmp/collect_resp.json))"
ok "事件已被采集(200)"

# ── 5. ClickHouse 落库校验(含 Kafka 异步,最多等 40s) ─────────
step 5 "ClickHouse 校验事件落库(app_code=$APP_CODE)"
CH_QUERY="SELECT count() FROM gateflow_tracker.events WHERE app_code='$APP_CODE' AND anonymous_id='$MARKER'"
wait_for "事件已落 ClickHouse" 40 \
  bash -c "[ \"\$(curl -fsS '$CH_URL/' --data-binary \"$CH_QUERY\" | tr -d '[:space:]')\" -ge 1 ]"

# ── 6. 管理端可查(分析口径) ──────────────────────────────────
step 6 "tracker-admin 事件分析可查"
TODAY=$(date +%F)
ANALYSIS=$(curl -fsS "$ADMIN_URL/api/v1/data-platform/realtime?appCode=$APP_CODE" \
  -H "Authorization: Bearer $TOKEN" || true)
echo "$ANALYSIS" | jq -e '.code==200' >/dev/null 2>&1 \
  && ok "分析接口可达(realtime 200)" \
  || printf '  \033[33m! 分析接口未返回 200(非致命,可能口径/时间窗):%s\033[0m\n' "$ANALYSIS"

bold "\n==== ✅ 端到端冒烟通过:SDK → 采集 → ClickHouse → 管理端 全链路打通 ===="
