# 需求管理（埋点方案工作流）

需求管理是 Tracker 管理后台的**埋点方案生命周期管理模块**，用于规范埋点需求从提出到上线的全流程。

入口位于侧边栏「埋点工程 → 需求管理」，路由 `/tracker/engineering/plans`。

## 产物：事件埋点规格说明书

一个「需求方案」的最终产物是一组**可执行的标准化事件定义**，包含方案元信息、事件列表和属性定义。

```
需求方案 "v2.3 支付流程"
├── 方案元信息
│   ├── 方案名称: v2.3 支付流程
│   ├── 目标应用: a_app (主站应用)
│   └── 版本号: 2.3.0
│
├── 事件 1: click_buy_now
│   ├── 名称: 点击立即购买
│   ├── 分类: click
│   ├── 描述: 用户在商品详情页点击「立即购买」按钮
│   ├── SPM 编码: a_app.b_product.c_action.d_buy_btn
│   └── 属性
│       ├── price (number) — 商品价格
│       └── product_id (string) — 商品ID
│
├── 事件 2: page_view_checkout
│   └── ...
│
└── 事件 3: exposure_discount
    └── ...
```

## 与埋点管理的关系

```
埋点管理 (SPM 编码体系)          需求管理 (事件规格)
─────────────────────────        ─────────────────
a_app (应用)                     方案 "v2.3 支付流程"
 ├─ b_product (页面)               ├─ 事件 click_buy_now
 │   ├─ c_action (区块)            │   └─ spmCode → a_app.b_product.c_action.d_buy
 │   │   └─ d_buy (功能)           ├─ 事件 page_view_checkout
 │   └─ ...                        │   └─ spmCode → a_app.b_product.b_checkout
 └─ ...                            └─ 事件 exposure_coupon
                                       └─ spmCode → a_app.b_product.c_banner.d_coupon
```

- **埋点管理**定义 SPM 四级编码（应用 → 页面 → 区块 → 点位），确定「在哪儿埋」
- **需求管理**定义事件规格（标识、分类、属性），确定「埋什么、怎么埋」
- 事件通过 `spmCode` 字段关联到 SPM 编码，形成可追踪的**血缘关系**

## 工作流

```
草稿 ──提审──→ 审核中 ──通过──→ 已通过 ──上线──→ 已上线
  │              │   驳回              │
  │  修改/重新提审 ←── 已驳回            │
  └──────────────────────────────────┘
```

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| **草稿** | 需求起草中，尚未提交 | 编辑、删除、提审 |
| **审核中** | 等待审批人审核 | 通过、驳回（审核人）|
| **已通过** | 审核通过，待开发实现 | 上线 |
| **实现中** | 开发正在实现埋点 | — |
| **已验证** | 埋点验证通过 | 上线 |
| **已上线** | 埋点已上线采集数据 | — |
| **已驳回** | 审核未通过，需修改 | 修改、重新提审 |

## 事件分类

| 分类 | 说明 | 典型场景 |
|------|------|----------|
| `page_view` | 页面浏览 | 进入页面时触发 |
| `click` | 点击 | 按钮、链接点击 |
| `exposure` | 曝光 | 重要元素进入视口 |
| `custom` | 自定义 | 业务特有事件（如支付完成）|

## 事件属性规范

| 数据类型 | 说明 | 示例 |
|----------|------|------|
| `string` | 字符串 | `product_id: "SKU-001"` |
| `number` | 数字 | `price: 99.00` |
| `boolean` | 布尔 | `is_vip: true` |
| `date` | 日期 | `promotion_end: "2026-06-30"` |

## 典型使用流程

1. **产品经理**在「需求管理」创建方案，定义事件和属性
2. 提交审核 → **审批人**通过或驳回（附审核意见）
3. 通过后 → **开发**在代码中实现埋点（参照方案中的事件规格和 SPM 编码）
4. 实现完成后 → **QA** 在「埋点验证」页面验证
5. 验证通过 → 上线 → 数据开始在各分析看板中呈现

## 方案示例

### 电商 — 商品详情页埋点方案 v2.3

| 事件标识 | 名称 | 分类 | SPM 编码 | 属性 |
|----------|------|------|----------|------|
| `click_add_cart` | 加入购物车 | click | `a_app.b_product.c_action.d_add_cart` | `product_id`, `quantity` |
| `click_buy_now` | 立即购买 | click | `a_app.b_product.c_action.d_buy_btn` | `product_id`, `price` |
| `click_favorite` | 收藏 | click | `a_app.b_product.c_action.d_favorite` | `product_id` |
| `exposure_banner` | Banner 曝光 | exposure | `a_app.b_product.c_banner.d_main` | `campaign_id` |
| `page_view_product` | 商品详情浏览 | page_view | `a_app.b_product` | `product_id`, `category` |
