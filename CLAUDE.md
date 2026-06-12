# CLAUDE.md — Agent 工作流

## 启动时

每次会话启动，读取以下配置：

```
.claude/dod.yaml          # 完成标准（什么是 Done）
.claude/constraints.yaml  # 架构约束（什么是红线）
.claude/decisions/        # 已有决策记录（了解上下文）
```

## 工作模式：自主迭代，而非阶段审批

**默认不要在每个阶段后停下来等人类确认。** 你的目标是推进到 DoD 全部通过。

```
┌─────────────────────────────────────────────────────┐
│  1. 理解目标                                         │
│     从用户指令中提取：要做什么、约束是什么             │
│     对照 .claude/dod.yaml，确认完成标准               │
│                                                     │
│  2. 制定计划                                         │
│     拆解为可验证的步骤                               │
│     如有歧义 → 提出 ≤3 个方案，等待选择（仅此一次）    │
│                                                     │
│  3. 执行 → 自检 → 迭代                               │
│     ┌─ 写代码                                        │
│     ├─ 运行 constraints.yaml 中 error 级别的检查       │
│     ├─ 运行 dod.yaml 中覆盖/类型/lint/安全等检查       │
│     ├─ 全部通过？ → 跳转到 4                          │
│     ├─ 未通过？  → 分析失败原因 → 修复 → 重新自检      │
│     └─ 连续 5 轮无改善？ → 升级人工                   │
│                                                     │
│  4. 记录决策 → 报告完成                               │
│     对重要选择写入 .claude/decisions/                 │
│     报告：完成了什么 + 所有检查通过证据                │
└─────────────────────────────────────────────────────┘
```

## 自检流程（每次修改后必须执行）

```bash
# 1. 运行 constraints 中 error 级别的自动检查
#    遍历 constraints.yaml 中 severity=error 且 check≠manual 的规则
#    任一失败 → 修复后重新开始

# 2. 运行质量门禁
#    类型检查、lint、测试、覆盖率、安全扫描

# 3. 检查反目标
#    确认本次修改没有违反 anti_goals 中的任何一条

# 4. 汇总自检结果
#    全部通过 → 进入完成阶段
#    有 warning → 记录，不阻塞
#    有 error → 修复后重试
```

## 何时升级人工（且仅此时）

遇到以下情况，停止并报告：

1. **决策升级** — 涉及 `dod.yaml` 中 `decisions_needing_human` 列出的决策类型
2. **持续卡住** — 连续 `max_iterations_without_progress` 轮自检无改善
3. **歧义无法消解** — 需求有 ≥2 种合理解释，按 `ambiguous_requirements.strategy` 处理
4. **Token 预算耗尽** — 接近 `max_token_budget` 上限

**其他情况不要停下来问。** 特别是：
- ❌ 不要问 "这个实现方案可以吗？" → 直接实现并自检
- ❌ 不要问 "需要我运行测试吗？" → 直接运行
- ❌ 不要问 "我应该把这个函数放在哪个文件？" → 遵循现有代码组织模式
- ❌ 不要每完成一个小步骤就提交 → 按逻辑单元提交

## 决策记录

遇到以下情况时，在 `.claude/decisions/` 下创建一个 YAML 文件：

- 从多个可行方案中选择一个（说明为什么拒绝其他方案）
- 引入新的架构模式或模式变更
- 任何涉及 trade-off 的选择

### 决策记录模板

```yaml
id: "D-YYYYMMDD-NNN"
timestamp: "YYYY-MM-DDTHH:MM:SS"
topic: "一句话描述决策主题"
context: "为什么需要做这个决策（1-3 句话）"
chosen: "选择的方案"
rejected:
  - "方案 A: 被拒绝的原因"
  - "方案 B: 被拒绝的原因"
rationale: "选择该方案的核心原因"
constraints_ref:
  - "引用的 dod.yaml 或 constraints.yaml 条目"
impact:
  files: ["受影响的文件列表"]
  risk: "low | medium | high"
```

### 决策记录文件命名

```
.claude/decisions/D-20260607-001-use-repository-pattern.yaml
```

## 报告完成

当所有 DoD 标准通过后，输出精简摘要：

```
## ✅ 任务完成

### 做了什么
[2-3 句话总结]

### 自检结果
- 测试: N/N 通过
- 覆盖率: X%
- 安全: 0 critical / 0 high
- 架构约束: all passed

### 决策记录
- D-YYYYMMDD-NNN: [topic]
- D-YYYYMMDD-NNN: [topic]

### 需要注意
[如果有 warning 或低风险项，在此列出]
```
