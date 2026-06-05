# Tracker 管理后台 (Admin UI)

GateFlow Tracker 系统的管理后台前端，基于 React + TypeScript + Vite 构建。

## 快速开始

```bash
cd apps/admin
npm install
npm run dev:mock    # Mock 模式启动（无需后端）
```

浏览器打开 http://localhost:5173

## 功能模块

### 埋点管理
- **事件管理** — 事件元数据的增删改查（event key/name/category/status）
- **属性管理** — 事件属性的管理，关联到特定事件（prop key/name/dataType）
- **SPM管理** — SPM 编码（四级路径 a.b.c.d）的管理

### 行为分析
- **事件分析** — 事件趋势查询，支持时间范围/事件类型筛选，折线图/柱图展示
- **可视化看板** — 系统预置看板（整体趋势/新增用户/Session），支持自定义看板
- **Session分析** — 会话指标（会话数/平均时长/跳出率/页面深度）+ 趋势图

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| UI 组件 | Ant Design 5 |
| 图表 | ECharts 5 |
| 路由 | React Router 6 |
| 状态 | Zustand 4 |
| HTTP | Axios |
| Mock | MSW 2 |

## 开发说明

### Mock 模式 vs 真实后端

Mock 模式通过 MSW 在 Service Worker 层拦截 API 请求，返回模拟数据。
切换到真实后端只需修改 `.env.development`:

```bash
# Mock 模式（默认）
VITE_ENABLE_MOCK=true

# 真实后端模式
VITE_ENABLE_MOCK=false
```

Service 层代码无需任何改动。

### 目录结构

```
src/
├── layouts/          # AdminLayout (侧边栏 + 内容区)
├── pages/tracker/    # 页面组件
│   ├── events/       # 事件管理
│   ├── properties/   # 属性管理
│   ├── spm/          # SPM管理
│   ├── analysis/     # 事件分析
│   ├── dashboard/    # 可视化看板
│   └── session/      # Session分析
├── components/       # 通用组件
│   ├── ui/           # UI 组件
│   └── charts/       # 图表组件
├── services/         # API 服务层
├── mocks/            # Mock 数据与处理器
├── stores/           # Zustand 状态管理
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数
```

## 接入后端

后端 API 规范见 `docs/tracker-admin-arch.md`。所有 TypeScript 类型与 Java DTO 一一对应。
API 基础路径：`/api/v1/`，前端通过 Vite proxy 转发到 `localhost:8080`。
