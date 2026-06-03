# ACM-MD 格式规范指导文件

版本：v0.1  
日期：2026-06-03  
全称：Agent Context Map Markdown  
用途：定义 Agent 需求图谱的标准 Markdown 承载格式

## 1. 规范目标

ACM-MD 是一种面向 Agent 工作流的 Markdown 图谱协议。

它的目标不是兼容所有普通 Markdown，而是为任务拆解大师、其他 Agent、Agent Context Map 工具提供统一格式。

核心目标：

- 让 Agent 输出的需求图谱可以被工具稳定导入
- 让用户在工具中的修改可以被 Agent 稳定理解
- 让节点、关系、变更记录都有明确语义
- 降低人工审核和纠错成本

一句话定义：

> ACM-MD 是用 Markdown 承载结构化 YAML 图谱数据的协议格式。

## 2. 基本原则

### 2.1 Markdown 只做外壳

Markdown 可以包含标题、说明、摘要，但工具只解析 `acm` 代码块。

工具不解析普通 Markdown 标题层级，不从自由文本中猜测节点。

### 2.2 YAML 承载图谱

图谱数据必须写在：

````markdown
```acm
schema_version: "0.1"
...
```
````

代码块内使用 YAML 格式。

### 2.3 全文只允许一个主 acm 块

一个 ACM-MD 文件中推荐只包含一个主 `acm` 代码块。

如果未来需要多图谱，应通过 `doc_id` 或外部文件拆分，而不是在同一文件放多个主图谱。

### 2.4 id 必须稳定

节点和边的 id 是变更追踪的基础。

禁止使用 title 作为 id。

title 可以修改，id 不能随意修改。

## 3. 文件整体结构

推荐结构：

````markdown
# Agent Context Map: [标题]

## Summary

[给人看的摘要，可选]

## Graph

```acm
schema_version: "0.1"
doc_id: "acm_001"
meta:
  title: "..."
  created_by: "task-decomposer"
  created_at: "2026-06-03"
  updated_at: "2026-06-03"
  purpose: "..."
nodes:
  ...
edges:
  ...
layout:
  ...
changes:
  ...
```
````

## 4. 顶层字段

### 4.1 必填字段

```yaml
schema_version: "0.1"
doc_id: "acm_001"
meta: {}
nodes: []
edges: []
```

### 4.2 可选字段

```yaml
layout: {}
changes: {}
validation: {}
```

### 4.3 顶层字段说明

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| schema_version | 是 | string | 协议版本 |
| doc_id | 是 | string | 当前图谱文档 id |
| meta | 是 | object | 图谱元信息 |
| nodes | 是 | array | 节点列表 |
| edges | 是 | array | 关系列表 |
| layout | 否 | object | 画布布局信息 |
| changes | 否 | object | 变更记录 |
| validation | 否 | object | 校验信息 |

## 5. meta 规范

### 5.1 示例

```yaml
meta:
  title: "Agent 需求图谱工具"
  created_by: "task-decomposer"
  created_at: "2026-06-03"
  updated_at: "2026-06-03"
  purpose: "将任务拆解结果转为可视化需求图谱"
  source: "user_discussion"
```

### 5.2 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| title | 是 | 图谱标题 |
| created_by | 否 | 生成者，如 task-decomposer |
| created_at | 否 | 创建日期 |
| updated_at | 否 | 更新日期 |
| purpose | 否 | 图谱用途 |
| source | 否 | 来源说明 |

## 6. nodes 规范

### 6.1 节点示例

```yaml
nodes:
  - id: "goal_001"
    type: "Goal"
    title: "构建本地化 Agent 需求图谱工具"
    status: "confirmed"
    description: "支持从标准 ACM-MD 导入图谱，人工编辑后导出 Agent 可读变更。"
    source: "user_discussion"
    confidence: 0.95
    priority: "critical"
    tags: ["local-first", "agent-workflow"]
```

### 6.2 节点必填字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 稳定节点 id |
| type | string | 节点类型 |
| title | string | 节点标题 |
| status | string | 节点状态 |

### 6.3 节点可选字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| description | string | 节点说明 |
| source | string | 来源 |
| confidence | number | 置信度，0 到 1 |
| priority | string | 优先级 |
| tags | array | 标签 |
| notes | string | 备注 |

## 7. 节点类型

### 7.1 允许的节点类型

| 类型 | 含义 | 使用场景 |
| --- | --- | --- |
| Goal | 目标 | 项目目标、任务目标、产品目标 |
| Module | 模块 | 系统模块、功能域、产品区域 |
| Feature | 功能 | 具体功能点 |
| Page | 页面 | 前端页面、视图、界面区域 |
| DataEntity | 数据对象 | 用户、订单、任务、图谱节点等数据实体 |
| API | 接口 | 服务接口、外部 API、本地 API |
| Constraint | 约束 | 规则、限制、验收标准、格式要求 |
| Risk | 风险 | 技术风险、产品风险、执行风险 |
| Assumption | 假设 | 尚未完全验证的前提 |
| Question | 问题 | 待澄清问题、待决策问题 |
| Decision | 决策 | 已做或待做的取舍 |
| Task | 任务 | 可执行步骤、开发任务、交付任务 |

### 7.2 节点类型使用建议

- 如果表达“为什么做”，优先用 Goal。
- 如果表达“系统分区”，优先用 Module。
- 如果表达“用户能做什么”，优先用 Feature。
- 如果表达“必须遵守什么”，优先用 Constraint。
- 如果表达“可能出什么问题”，优先用 Risk。
- 如果表达“还不确定什么”，优先用 Question 或 Assumption。
- 如果表达“下一步做什么”，优先用 Task。

## 8. 节点状态

允许状态：

| 状态 | 含义 |
| --- | --- |
| confirmed | 已确认 |
| suggested | Agent 推断或建议 |
| needs_validation | 需要验证 |
| deprecated | 已废弃或不推荐继续使用 |

状态使用规则：

- 用户明确确认的内容可以标记为 `confirmed`
- Agent 推断但用户未确认的内容应标记为 `suggested`
- 明确需要后续验证的内容应标记为 `needs_validation`
- 被替代或不再采用的内容应标记为 `deprecated`

## 9. edges 规范

### 9.1 边示例

```yaml
edges:
  - id: "edge_001"
    from: "goal_001"
    to: "module_001"
    type: "contains"
    status: "confirmed"
    reason: "该模块是实现核心目标的组成部分。"
    source: "task-decomposer"
    confidence: 0.95
```

### 9.2 边必填字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 稳定边 id |
| from | string | 起点节点 id |
| to | string | 终点节点 id |
| type | string | 关系类型 |
| status | string | 关系状态 |

### 9.3 边可选字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| reason | string | 建立该关系的原因 |
| source | string | 来源 |
| confidence | number | 置信度，0 到 1 |

## 10. 关系类型

### 10.1 允许的关系类型

| 类型 | 含义 | 方向说明 |
| --- | --- | --- |
| contains | 包含 | from 包含 to |
| depends_on | 依赖 | from 依赖 to |
| impacts | 影响 | from 影响 to |
| conflicts_with | 冲突 | from 与 to 冲突 |
| requires | 前置要求 | from 需要 to 先成立 |
| replaces | 替代 | from 替代 to |
| references | 引用 | from 引用 to |
| constrains | 约束 | from 约束 to |
| answers | 回答 | from 回答 to |
| needs_validation | 需要验证 | from 指向需要验证的对象 |

### 10.2 常见关系示例

```yaml
# 目标包含模块
from: "goal_001"
to: "module_001"
type: "contains"

# 模块包含功能
from: "module_001"
to: "feature_001"
type: "contains"

# 功能依赖 API
from: "feature_001"
to: "api_001"
type: "depends_on"

# 规则约束功能
from: "constraint_001"
to: "feature_001"
type: "constrains"

# 风险影响模块
from: "risk_001"
to: "module_001"
type: "impacts"
```

## 11. 关系推断建议

Agent Context Map 工具可使用本地规则推断关系。

推荐规则：

| From 类型 | To 类型 | 候选关系 |
| --- | --- | --- |
| Goal | Module | contains |
| Goal | Task | contains |
| Module | Feature | contains |
| Module | Page | contains |
| Feature | API | depends_on |
| Feature | DataEntity | references |
| Feature | Feature | depends_on / impacts / conflicts_with |
| Constraint | Feature | constrains |
| Constraint | Module | constrains |
| Risk | Feature | impacts |
| Risk | Module | impacts |
| Question | 任意类型 | needs_validation |
| Decision | Question | answers |
| Decision | Feature | impacts / replaces |

推断原则：

- 只有一个高置信候选时可以自动选择
- 多个候选时必须让用户选择
- 工具生成的未确认关系可标记为 `suggested`
- 用户确认后可标记为 `confirmed`

## 12. layout 规范

### 12.1 示例

```yaml
layout:
  engine: "manual"
  nodes:
    goal_001:
      x: 420
      y: 120
    module_001:
      x: 260
      y: 260
    feature_001:
      x: 180
      y: 420
```

### 12.2 说明

layout 只影响工具展示，不影响 Agent 语义理解。

Agent 读取图谱时可以忽略 layout。

工具应在用户拖动节点后更新 layout。

## 13. changes 规范

changes 用于记录用户在图谱工具中做出的修改。

### 13.1 示例

```yaml
changes:
  change_set_id: "changes_001"
  base_doc_id: "acm_001"
  summary: "用户新增 Agent Diff 导出能力，并删除了兼容任意 Markdown 的需求。"
  agent_instructions:
    - "后续开发计划应以标准 ACM-MD 为唯一导入格式。"
    - "不要投入任意 Markdown 兼容能力。"

  added_nodes:
    - id: "feature_009"
      type: "Feature"
      title: "导出 Agent Diff"
      status: "confirmed"
      description: "将用户修改转换为 Agent 可理解的变更说明。"

  modified_nodes:
    - id: "module_001"
      field: "description"
      before: "解析 Markdown"
      after: "解析标准 ACM-MD 并生成可视化图谱"

  removed_nodes:
    - id: "feature_003"
      title: "兼容任意 Markdown"
      reason: "用户明确表示不需要兼容奇怪格式。"

  added_edges:
    - id: "edge_020"
      from: "feature_009"
      to: "module_003"
      type: "depends_on"
      status: "confirmed"

  modified_edges:
    - id: "edge_004"
      field: "type"
      before: "impacts"
      after: "depends_on"

  removed_edges:
    - id: "edge_006"
      from: "module_001"
      to: "feature_003"
      type: "contains"
      reason: "相关功能已删除。"
```

### 13.2 changes 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| change_set_id | 是 | 变更集 id |
| base_doc_id | 是 | 基于哪个图谱文档修改 |
| summary | 是 | 面向人的变更摘要 |
| agent_instructions | 否 | 给 Agent 的执行指令 |
| added_nodes | 否 | 新增节点 |
| modified_nodes | 否 | 修改节点字段 |
| removed_nodes | 否 | 删除节点 |
| added_edges | 否 | 新增关系 |
| modified_edges | 否 | 修改关系字段 |
| removed_edges | 否 | 删除关系 |
| layout_changes | 否 | 布局变化 |

## 14. id 命名规范

推荐前缀：

| 类型 | 前缀 |
| --- | --- |
| Goal | goal_ |
| Module | module_ |
| Feature | feature_ |
| Page | page_ |
| DataEntity | data_ |
| API | api_ |
| Constraint | constraint_ |
| Risk | risk_ |
| Assumption | assumption_ |
| Question | question_ |
| Decision | decision_ |
| Task | task_ |
| Edge | edge_ |
| ChangeSet | changes_ |

示例：

```text
goal_001
module_001
feature_001
edge_001
changes_001
```

## 15. 校验规则

### 15.1 Error 级规则

违反以下规则时，工具应阻止导出为有效 Agent 上下文：

1. 缺少 `schema_version`
2. 缺少 `doc_id`
3. `nodes` 不是数组
4. `edges` 不是数组
5. 节点 id 重复
6. 边 id 重复
7. 边的 `from` 或 `to` 引用不存在的节点
8. 节点 type 不在允许枚举中
9. 边 type 不在允许枚举中
10. 节点缺少 id、type、title、status 任一必填字段
11. 边缺少 id、from、to、type、status 任一必填字段

### 15.2 Warning 级规则

违反以下规则时，工具可提示但不阻止保存：

1. 核心 Goal 没有任何出边
2. Risk 没有关联影响对象
3. Question 没有关联待验证对象
4. confidence 缺失
5. source 缺失
6. Feature 没有所属 Module
7. 多个 Goal 未建立关系
8. 存在 suggested 关系但未确认

## 16. 完整示例

````markdown
# Agent Context Map: Agent 需求图谱工具

## Summary

这是一个用于 Agent 工作流的本地化需求图谱工具。

## Graph

```acm
schema_version: "0.1"
doc_id: "acm_agent_context_map_001"

meta:
  title: "Agent 需求图谱工具"
  created_by: "task-decomposer"
  created_at: "2026-06-03"
  updated_at: "2026-06-03"
  purpose: "将任务拆解结果转为可视化、可编辑、可导出给 Agent 的需求图谱。"
  source: "user_discussion"

nodes:
  - id: "goal_001"
    type: "Goal"
    title: "构建本地化 Agent 需求图谱工具"
    status: "confirmed"
    description: "支持导入标准 ACM-MD，用户可视化编辑后导出 Agent 可读 diff。"
    source: "user_discussion"
    confidence: 0.98
    priority: "critical"

  - id: "module_001"
    type: "Module"
    title: "ACM-MD 导入"
    status: "confirmed"
    description: "解析标准 Markdown 图谱协议。"
    confidence: 0.95

  - id: "module_002"
    type: "Module"
    title: "可视化图谱编辑"
    status: "confirmed"
    description: "支持节点拖动、连线、属性编辑和布局保存。"
    confidence: 0.95

  - id: "module_003"
    type: "Module"
    title: "Agent Diff 导出"
    status: "confirmed"
    description: "将用户修改转换为 Agent 可理解的变更说明。"
    confidence: 0.95

  - id: "feature_001"
    type: "Feature"
    title: "自由拖动节点"
    status: "confirmed"
    description: "用户可以在画布上自由调整节点位置。"

  - id: "feature_002"
    type: "Feature"
    title: "手动连接关系"
    status: "confirmed"
    description: "用户可以拖线连接两个节点，并选择或确认关系类型。"

  - id: "constraint_001"
    type: "Constraint"
    title: "工具本身纯本地运行"
    status: "confirmed"
    description: "编辑器不在推断关系时调用 AI。"

  - id: "risk_001"
    type: "Risk"
    title: "图谱生成错误导致人工纠错成本增加"
    status: "confirmed"
    description: "如果节点和关系不准确，用户需要额外审核修正。"

edges:
  - id: "edge_001"
    from: "goal_001"
    to: "module_001"
    type: "contains"
    status: "confirmed"

  - id: "edge_002"
    from: "goal_001"
    to: "module_002"
    type: "contains"
    status: "confirmed"

  - id: "edge_003"
    from: "goal_001"
    to: "module_003"
    type: "contains"
    status: "confirmed"

  - id: "edge_004"
    from: "module_002"
    to: "feature_001"
    type: "contains"
    status: "confirmed"

  - id: "edge_005"
    from: "module_002"
    to: "feature_002"
    type: "contains"
    status: "confirmed"

  - id: "edge_006"
    from: "constraint_001"
    to: "module_002"
    type: "constrains"
    status: "confirmed"

  - id: "edge_007"
    from: "risk_001"
    to: "goal_001"
    type: "impacts"
    status: "confirmed"

layout:
  engine: "manual"
  nodes:
    goal_001: { x: 420, y: 120 }
    module_001: { x: 160, y: 280 }
    module_002: { x: 420, y: 280 }
    module_003: { x: 680, y: 280 }
    feature_001: { x: 340, y: 440 }
    feature_002: { x: 520, y: 440 }
    constraint_001: { x: 160, y: 560 }
    risk_001: { x: 680, y: 560 }
```
````

## 17. Agent 输出要求

当 Agent 生成 ACM-MD 时，必须遵守：

1. 只输出规范允许的节点类型。
2. 只输出规范允许的关系类型。
3. id 必须稳定且唯一。
4. 不确定内容必须标记为 `suggested` 或 `needs_validation`。
5. 不要把用户未确认内容标记为 `confirmed`。
6. 不要输出无法解析的自由格式字段。
7. 若没有 layout，可以省略，交给工具自动布局。
8. 若生成 changes，必须包含 summary。

## 18. 工具解析要求

Agent Context Map 工具解析 ACM-MD 时，应遵守：

1. 只解析 `acm` 代码块。
2. 不从普通 Markdown 正文推断节点。
3. 解析失败时给出具体错误位置。
4. 校验错误分为 error 和 warning。
5. layout 缺失时自动布局。
6. 导出时保留稳定 id。
7. 用户修改后生成 changes。

## 19. v0.1 范围边界

v0.1 只关注：

- 需求图谱
- 任务拆解
- Agent 上下文传递
- 用户修改 diff

暂不支持：

- 多人协作
- 云端同步
- 自定义类型系统
- 任意 Markdown 自动解析
- 权限和审批流
- 项目管理排期系统

## 20. 成功标准

ACM-MD v0.1 成功的标准是：

> Agent 能稳定生成，工具能稳定导入，用户能稳定修改，Agent 能稳定理解修改。

只要这个闭环成立，后续再扩展更多节点类型、版本控制、模板系统和图谱分析能力。
