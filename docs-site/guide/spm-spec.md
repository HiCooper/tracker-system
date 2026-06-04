# 埋点路径规范 (SPM)

SPM（Super Position Model）是 GateFlow 埋点系统的位置标识规范，采用四级层级结构精确定位页面元素。

## 路径结构

```
a_{应用}.b_{页面}.c_{区块}.d_{点位}
```

| 层级 | 前缀 | ClickHouse 字段 | 说明 | 示例 |
|------|------|----------------|------|------|
| 应用 | `a_` | `spma` | 业务应用标识 | `a_app`, `a_admin`, `a_ds` |
| 页面 | `b_` | `spmb` | 页面标识 | `b_home`, `b_product`, `b_search` |
| 区块 | `c_` | `spmc` | 功能区块 | `c_banner`, `c_recommend`, `c_nav` |
| 点位 | `d_` | `spmd` | 具体元素 | `d_btn`, `d_slide_1`, `d_item_3` |

## 命名规范

- 全部小写，使用下划线分隔
- 语义清晰，避免缩写
- 层级递进，便于查询

## 常用命名参考

### 应用层 (a_*)

| 标识 | 说明 |
|------|------|
| `a_app` | 主站应用 |
| `a_admin` | 管理后台 |
| `a_ds` | 数据平台 |
| `a_marketing` | 营销页 |

### 页面层 (b_*)

| 标识 | 说明 |
|------|------|
| `b_home` | 首页 |
| `b_product` | 商品详情 |
| `b_cart` | 购物车 |
| `b_checkout` | 结算页 |
| `b_search` | 搜索结果 |
| `b_list` | 列表页 |
| `b_detail` | 详情页 |

### 区块层 (c_*)

| 标识 | 说明 |
|------|------|
| `c_banner` | 横幅/轮播 |
| `c_recommend` | 推荐区 |
| `c_nav` | 导航区 |
| `c_action` | 操作区 |
| `c_list` | 列表区 |
| `c_footer` | 底部区 |
| `c_filter` | 筛选区 |

### 点位层 (d_*)

| 标识 | 说明 |
|------|------|
| `d_btn` | 按钮 |
| `d_link` | 链接 |
| `d_slide_{n}` | 轮播图第 n 张 |
| `d_item_{n}` | 商品项第 n 个 |
| `d_pic_{n}` | 图片第 n 张 |
| `d_input` | 输入框 |

## 完整路径示例

```
a_home.b_home.c_banner.d_slide_1            # 首页→横幅→第1张轮播
a_app.b_product.c_action.d_buy_btn          # 应用→商品详情→操作区→购买按钮
a_app.b_cart.c_list.d_item_checkbox          # 应用→购物车→列表→勾选框
a_ds.b_dashboard.c_nav.d_settings           # 数据平台→看板→导航→设置
```

## ClickHouse 查询

```sql
-- 按区块统计曝光 TOP
SELECT spma, spmb, spmc, count() as exposures
FROM events
WHERE event_type = 'exposure'
GROUP BY spma, spmb, spmc
ORDER BY exposures DESC
LIMIT 100;

-- 计算各点位点击率
SELECT
    spmd,
    countIf(event_type = 'click') as clicks,
    countIf(event_type = 'exposure') as exposures,
    round(clicks / exposures * 100, 2) as ctr
FROM events
WHERE spmb = 'b_product'
GROUP BY spmd
ORDER BY clicks DESC;
```
