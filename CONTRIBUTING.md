# 贡献指南

感谢你对 GateFlow Tracker System 的关注！本文档说明如何参与项目贡献。

## 项目结构

```
tracker-system/
├── tracker-sdk/          # 客户端埋点 SDK (TypeScript)
│   └── src/
│       ├── collectors/   # 采集器: Page / Click / Exposure / Scroll / Stay / Error / Session
│       ├── queue/        # 离线队列 (localStorage)
│       ├── sender/       # 批量上报调度器
│       └── tracker/      # 主控 Tracker 类
├── apps/admin/           # 管理后台前端 (React + TypeScript)
│   └── src/
│       ├── components/   # 通用组件 (charts, trend)
│       ├── pages/        # 页面 (setup, analysis)
│       ├── services/     # API 服务层
│       ├── stores/       # Zustand 状态管理
│       ├── mocks/        # MSW Mock 数据
│       └── types/        # TypeScript 类型定义
├── backend/              # 后端服务 (git submodule)
│   ├── tracker-service/  # 事件采集服务 (Spring Boot)
│   └── tracker-admin/    # 管理后台 API (Spring Boot)
├── docs-site/            # VitePress 文档站点
└── docs/                 # 设计文档
```

## 快速开始

### 前端 SDK

```bash
cd tracker-sdk
npm install
npm test              # 运行单元测试
npm run build         # 构建产物
```

### 管理后台

```bash
cd apps/admin
npm install
npm run dev:mock      # Mock 模式启动（无需后端）
npm run build         # 生产构建
npm run screenshots   # 截图文档页面（需先启动 dev server）
```

### 文档站点

```bash
cd docs-site
npm install
npm run dev           # 本地预览
npm run build         # 构建静态站点
```

### 后端服务

后端通过 git submodule 管理，需单独克隆：

```bash
git submodule update --init --recursive
```

## 开发工作流

### 1. 创建分支

```bash
git checkout -b feat/your-feature-name
```

分支命名规范：
- `feat/xxx` — 新功能
- `fix/xxx` — 修复
- `docs/xxx` — 文档
- `refactor/xxx` — 重构
- `chore/xxx` — 工程化

### 2. 开发 & 提交

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(admin): 功能描述
fix(sdk): 修复描述
docs: 文档更新说明
```

### 3. 提交前检查

```bash
# 管理后台
cd apps/admin && npx tsc --noEmit && npm run build

# SDK
cd tracker-sdk && npm test && npm run build

# 文档站点
cd docs-site && npm run build
```

### 4. 推送 & PR

推送到你的分支后在 GitHub 创建 Pull Request。

## 管理后台架构约定

### 数据流

```
Page (纯渲染) → Store (Zustand) → Service (API) → MSW Mock / 真实后端
```

- **Page** 组件只做渲染，不包含数据获取逻辑
- **Store** 管理状态和 API 调用
- **Service** 封装所有 HTTP 请求
- **Mock** 在 MSW 层拦截，切换后端只需改 `VITE_ENABLE_MOCK=false`

### 组件拆分原则

- 单个文件不超过 150 行
- 重复逻辑抽取到共享模块
- 弹窗/对话框独立为组件

### 截图工具

通用前端截图脚本：

```bash
cd apps/admin
npm run screenshots -- http://localhost:5180/page1 http://localhost:5180/page2
```

截图输出到 `docs/images/`。

## SDK 开发约定

### 事件采集器

新增采集器需实现 `Collector` 接口：

```typescript
interface Collector {
  start(): void;
  stop(): void;
}
```

### 测试

```bash
cd tracker-sdk
npm test              # 运行所有测试
npm run test:watch    # 监听模式
```

## 许可证

Private — GateFlow internal project.
