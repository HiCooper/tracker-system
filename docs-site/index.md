---
layout: home
title: Tracker System - 埋点分析数据采集平台

hero:
  name: "Tracker System"
  text: "埋点分析数据采集平台"
  tagline: "独立部署、全维度采集、高性能的用户行为数据平台"
  actions:
    - theme: brand
      text: "产品指南 →"
      link: /guide/
    - theme: alt
      text: "技术架构 →"
      link: /dev/architecture
    - theme: alt
      text: "内部资料 →"
      link: /knowledge/

features:
  - icon: 📊
    title: 全维度采集
    details: 覆盖页面浏览、元素点击、元素曝光、滚动深度、停留时长、用户路径等全维度行为数据

  - icon: ⚡
    title: 高性能管道
    details: Kafka + ClickHouse 实时事件流，支持高并发批量写入，客户端离线队列保障数据不丢失

  - icon: 🛡️
    title: 高可靠性
    details: 熔断保护、DLQ 死信队列、Redis 去重、客户端离线队列，多层保障数据完整

  - icon: 🔧
    title: 独立部署
    details: 与 AB 实验服务解耦，可独立运维和扩展，服务端无状态水平扩展

  - icon: 🎯
    title: 标准化埋点
    details: SPM 四级埋点路径规范（a.b.c.d），统一命名，便于跨团队协作和数据分析

  - icon: 📈
    title: 归因分析
    details: 支持 UTM 渠道归因、首次/末次触点归因，多维度分析用户来源和转化路径
---

<div style="max-width: 1200px; margin: 0 auto; padding: 4rem 2rem;">

## 系统概览

Tracker System 是 GateFlow 埋点分析数据采集平台，负责全站用户行为数据的采集、处理、存储和分析。与 AB 实验系统独立部署，通过 `user_id` 在 ClickHouse 层关联。

```mermaid
graph TD
    subgraph 客户端
        A[Tracker SDK] --> B[离线队列 IndexedDB]
        B --> C[批量上报 Sender]
    end

    C --> D[Tracker Server /api/v1/collect]

    subgraph 服务端
        D --> E[格式校验 Validator]
        E --> F[Redis 去重 Dedup]
        F --> G[数据增强 Enrich]
        G --> H{熔断器 CircuitBreaker}
        H -->|正常| I[ClickHouse]
        H -->|熔断| J[DLQ Redis 7天TTL]
        J -.->|定时重放| I
    end

    subgraph 分析层
        I --> K[事件分析 Event Analysis]
        I --> L[会话分析 Session Analysis]
        I --> M[SPM 路径分析]
    end
```

## 采集维度

| 维度 | 核心指标 | 采集方式 |
|------|---------|---------|
| **页面级** | PV/UV、跳出率、停留时长 | SPA 路由监听、visibilitychange |
| **元素级** | 曝光率、点击率、转化漏斗 | Intersection Observer |
| **路径分析** | 页面序列、关键节点 | 会话级序列聚合 |
| **归因分析** | 渠道贡献、首次/末次触点 | UTM 参数 + 时间窗口 |

## 快速导航

::: info 提示
Tracker System 文档面向两类用户:

**产品/运营人员** → 了解埋点系统功能，学习 SPM 埋点规范，查看产品使用指南
**开发人员** → 了解系统架构设计，集成 Tracker SDK，部署运维
**团队成员** → 查阅服务地址、架构决策记录、踩坑经验等内容
:::

### 📘 产品指南

面向产品经理、运营人员、数据分析师:
- 了解埋点采集维度和能力
- 学习 SPM 四级埋点路径规范
- 掌握产品使用流程

[进入产品指南 →](/guide/)

### 💻 技术架构

面向开发工程师、运维工程师:
- 理解系统整体架构
- 掌握事件管道、数据模型设计
- 集成客户端 SDK
- 了解部署运维

[进入技术架构 →](/dev/architecture)

### 📚 内部资料

面向团队所有成员，沉淀:
- 各环境服务访问地址
- 架构决策记录 (ADR)
- 历史踩坑记录与经验
- 外部参考资料

[进入内部资料 →](/knowledge/)

</div>
