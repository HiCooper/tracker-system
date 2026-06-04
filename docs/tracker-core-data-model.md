# Tracker 服务核心数据模型

本文档详细说明 Tracker 埋点服务中三个核心数据实体的设计理念、数据结构和相互关系。

## 目录

1. 概述
2. 事件（Event）
3. 属性（Property）
4. SPM 超级位置模型
5. 三者关系
6. 实际使用示例

---

## 1. 概述

Tracker 服务采用三层数据模型来描述用户行为：

| 概念 | 说明 | 示例 |
|------|------|------|
| 事件（Event） | 用户执行的动作 | 点击了首页横幅 |
| 属性（Property） | 动作附带的信息 | banner_id、position |
| SPM | 动作发生的页面位置 | HOME_A1_B1_C1 |

这三者的组合可以唯一确定一个用户行为的所有上下文信息。

---

## 2. 事件（Event）

事件是埋点的核心单元，代表用户在产品中执行的一个具体动作。

### 2.1 事件分类

| category | 说明 | 典型场景 |
|----------|------|----------|
| page_view | 页面浏览 | 用户打开某个页面 |
| click | 点击行为 | 用户点击按钮/链接 |
| exposure | 曝光事件 | 内容展示在用户可视区域 |
| custom | 自定义事件 | 业务特定行为 |

### 2.2 数据结构

```sql
CREATE TABLE tracker_event (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_key   VARCHAR(64) NOT NULL UNIQUE,
    event_name  VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    category    VARCHAR(32) DEFAULT 'custom',
    status      TINYINT DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted     TINYINT DEFAULT 0,
    INDEX idx_event_key (event_key),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. 属性（Property）

属性用于描述事件的详细上下文信息，每个事件可以定义多个属性。

```sql
CREATE TABLE tracker_property (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id    BIGINT NOT NULL,
    prop_key    VARCHAR(64) NOT NULL,
    prop_name   VARCHAR(128) NOT NULL,
    data_type   VARCHAR(32) DEFAULT 'string',
    description VARCHAR(512),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted     TINYINT DEFAULT 0,
    FOREIGN KEY (event_id) REFERENCES tracker_event(id) ON DELETE CASCADE,
    UNIQUE KEY uk_event_prop (event_id, prop_key)
);
```

### 3.1 数据类型

| data_type | 说明 |
|-----------|------|
| string | 字符串 |
| number | 数字 |
| boolean | 布尔 |
| date | 日期时间 |

---

## 4. SPM 超级位置模型

SPM（Super Position Model）用于标识页面上的具体位置信息。

### 4.1 SPM结构

| 层级 | 说明 | 示例 |
|------|------|------|
| A层 | 页面级别 | 首页、商品详情页 |
| B层 | 模块级别 | Banner区、商品区 |
| C层 | 坑位级别 | 第1行第1列 |
| D层 | 元素级别（可选） | 第5个元素 |

### 4.2 编码规则

SPM编码格式：`{页面标识}_{A层}_{B层}_{C层}_{D层}`

### 4.3 数据结构

```sql
CREATE TABLE tracker_spm (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    spm_code    VARCHAR(64) NOT NULL UNIQUE,
    spm_name    VARCHAR(128) NOT NULL,
    spma_label  VARCHAR(64),
    spmb_label  VARCHAR(64),
    spmc_label  VARCHAR(64),
    spmd_label  VARCHAR(64),
    description VARCHAR(512),
    status      TINYINT DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted     TINYINT DEFAULT 0
);
```

### 4.4 使用示例

页面结构示意：

```
┌─────────────────────────────────┐
│  [Banner 轮播区]               │  ← A层: HOME
│  ┌─────┬─────┬─────┬─────┐   │
│  │商品1│商品2│商品3│商品4│   │  ← B层: BANNER
│  └─────┴─────┴─────┴─────┘   │
└─────────────────────────────────┘
```

SPM编码示例：
- HOME_BANNER_SLOT → 首页横幅坑位
- HOME_BANNER_1_1 → 首页横幅第1行第1列

---

## 5. 三者关系

| 关系 | 说明 |
|------|------|
| Event : Property | 一对多（1:N），删除事件时属性也跟着删除 |
| Event : SPM | 相互独立，无直接关联 |

关系说明：
- **事件与属性**：一个事件可以定义多个属性，但属性必须属于某个事件。当事件被删除时，关联的属性也会被删除（CASCADE）。
- **事件与SPM**：两者相互独立。事件描述"做什么"，SPM描述"在哪里做"。

---

## 6. 实际使用示例

### 场景：用户在电商App首页点击横幅商品

**SDK埋点代码：**

```javascript
tracker.track('home_banner_click', {
  event_type: 'home_banner_click',
  banner_id: 'banner_001',
  banner_position: 1,
  spm: 'HOME_BANNER_SLOT',
  user_id: 'user_12345',
  platform: 'ios'
});
```

**最终上报数据：**

```json
{
  "event_type": "home_banner_click",
  "timestamp": 1704067200000,
  "user_id": "user_12345",
  "platform": "ios",
  "spm": "HOME_BANNER_SLOT",
  "properties": {
    "banner_id": "banner_001",
    "banner_position": 1
  }
}
```

---

## 附录：API接口

### 事件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/events | 获取事件列表 |
| GET | /api/v1/events/{id} | 获取事件详情 |
| POST | /api/v1/events | 创建事件 |
| PUT | /api/v1/events/{id} | 更新事件 |
| DELETE | /api/v1/events/{id} | 删除事件 |

### 属性管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/events/{eventId}/properties | 获取事件属性列表 |
| POST | /api/v1/properties | 创建属性 |
| DELETE | /api/v1/properties/{id} | 删除属性 |

### SPM管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/spm | 获取SPM列表 |
| GET | /api/v1/spm/{id} | 获取SPM详情 |
| POST | /api/v1/spm | 创建SPM |
| PUT | /api/v1/spm/{id} | 更新SPM |
| DELETE | /api/v1/spm/{id} | 删除SPM |
