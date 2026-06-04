# 内部资料

Tracker 埋点系统的内部知识库，沉淀业务领域知识、踩坑记录和架构决策。

## 文档导航

| 文档 | 说明 |
|------|------|
| [服务访问入口](./service-endpoints) | 各环境服务地址与端口 |
| [架构决策记录](./adr/) | 重要技术决策的背景与权衡 |
| [历史踩坑记录](./historical-lessons/) | 开发与运维中的经验教训 |
| [外部参考资料](./external-resources/) | 相关技术文档与论文 |

## 与 GateFlow 的关系

Tracker System 是 GateFlow 平台的埋点分析子系统，与 AB 实验系统独立部署但共享 ClickHouse 存储层。更多上下文请参考 [GateFlow 文档](https://github.com/HiCooper/gate-flow)。
