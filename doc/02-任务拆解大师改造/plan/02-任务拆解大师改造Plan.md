# 任务拆解大师改造 Plan

版本：v0.1  
日期：2026-06-03  
目标：让任务拆解大师支持输出可视化需求图谱协议 `ACM-MD`

## 1. 改造背景

当前任务拆解大师的优势是通过对话帮助用户澄清思路、拆解任务、形成文字版结构化输出。

现有输出主要包括：

- ClarityMap
- DesignBlueprint
- 可复用 Prompt
- 执行结果

但这些输出仍然以线性 Markdown 为主。对于软件、平台、复杂功能设计这类任务，纯文字很难直观表达：

- 模块之间的依赖
- 功能之间的影响
- 风险和功能的对应关系
- 假设和待验证问题
- 决策对模块结构的影响
- 用户后续修改的具体位置

因此需要将任务拆解大师升级为：

> 文字版思维整理 + 结构化图谱输出的双通道任务拆解系统。

## 2. 改造目标

### 2.1 核心目标

任务拆解大师在完成需求澄清或任务拆解后，除了输出文字内容，还应输出一份标准 `ACM-MD` 图谱数据，用于 Agent Context Map 工具加载。

### 2.2 预期效果

改造后，完整链路变为：

```text
用户表达想法
  -> 任务拆解大师澄清和拆解
  -> 输出 ClarityMap / DesignBlueprint
  -> 同时输出 ACM-MD 图谱
  -> Agent Context Map 工具加载图谱
  -> 用户在图谱上继续修改
  -> 工具导出 Agent Diff
  -> Agent 读取 diff 并继续执行
```

### 2.3 不改变的部分

任务拆解大师原有三模式不需要推翻：

- 模式0：思维澄清器
- 模式1：引导设计师
- 模式2：自主执行

本次改造是在现有流程上增加图谱协议输出，而不是重写整个 skill。

## 3. 总体改造原则

### 3.1 文字输出仍然保留

图谱不是替代文字，而是补充文字。

任务拆解大师仍需输出：

- 核心问题
- 关键假设
- 逻辑链条
- 未解决问题
- 行动方向
- 任务蓝图

同时额外输出：

- 节点列表
- 关系列表
- 图谱摘要
- ACM-MD 代码块

### 3.2 图谱输出必须标准化

任务拆解大师输出的图谱必须遵守 `ACM-MD v0.1`：

- 固定节点类型
- 固定关系类型
- 稳定 id
- 必填字段完整
- 不输出无法解析的自由格式

### 3.3 不追求一次性完美图谱

任务拆解大师生成的是“初始图谱”，不要求覆盖全部细节。

允许节点和关系带有状态：

- confirmed
- suggested
- needs_validation
- deprecated

用户可以在工具中继续修正。

### 3.4 明确区分事实、推断和待确认

任务拆解大师生成图谱时，必须区分：

- 用户明确说过的内容
- Agent 根据上下文推断的内容
- 需要后续确认的内容

对应字段：

- `source`
- `confidence`
- `status`

## 4. 模式0改造：思维澄清器

### 4.1 原流程

模式0 当前四阶段：

1. 发散：倾倒碎片
2. 收敛：找逻辑主线
3. 验证：压力测试
4. 输出：ClarityMap

### 4.2 改造后流程

改造后四阶段保持不变，但每个阶段需要增加图谱意识。

#### 阶段1：发散

新增内部记录：

- 用户提到的目标候选
- 模块候选
- 功能候选
- 风险候选
- 假设候选
- 问题候选
- 决策候选

此阶段不急于建图，只记录碎片。

#### 阶段2：收敛

在归纳主线时，同时识别：

- 哪些碎片是节点
- 哪些碎片之间存在关系
- 哪些关系是包含关系
- 哪些关系是依赖或影响关系
- 哪些关系仍然不确定

#### 阶段3：验证

对图谱做压力测试：

- 是否有孤立核心节点
- 是否有重要模块缺少目标指向
- 是否有风险没有影响对象
- 是否有假设没有验证对象
- 是否有关系只是 Agent 猜测

#### 阶段4：输出

原 ClarityMap 保留，并新增：

````markdown
## 可视化图谱

以下为可导入 Agent Context Map 工具的 ACM-MD 图谱。

```acm
...
```
````

## 5. 模式1改造：引导设计师

### 5.1 原流程

模式1 当前五阶段：

1. 核心目标与成功标准
2. 角色设定
3. 知识与上下文
4. 输出格式
5. 决策与交付

### 5.2 改造方向

模式1 需要在构建 `DesignBlueprint` 的同时，构建 `GraphBlueprint`。

### 5.3 DesignBlueprint 到图谱的映射

| DesignBlueprint 字段 | 图谱节点类型 | 说明 |
| --- | --- | --- |
| goal | Goal | 核心任务目标 |
| success_criteria | Constraint / Task | 成功标准或验收任务 |
| role | Constraint | 角色约束 |
| context | Module / DataEntity / Source | 背景和输入材料 |
| constraints | Constraint | 必须遵守的限制 |
| output_format | Constraint | 交付格式要求 |
| workflow | Task | 执行步骤 |

### 5.4 输出选项改造

模式1 末尾仍提供：

- 生成可复用 Prompt
- 立即执行

新增第三种交付内容：

- 生成 ACM-MD 图谱

推荐默认输出：

```text
DesignBlueprint + ACM-MD 图谱
```

## 6. 模式2改造：自主执行

### 6.1 输入增强

模式2 除了接收 `DesignBlueprint` 或 `ClarityMap`，还应能接收：

- ACM-MD 图谱
- Agent Diff
- 用户修改摘要

### 6.2 执行逻辑增强

当输入包含 Agent Diff 时，模式2 应优先读取：

1. `changes.summary`
2. `agent_instructions`
3. added_nodes
4. modified_nodes
5. removed_nodes
6. added_edges / modified_edges / removed_edges
7. 最新 nodes / edges

### 6.3 执行原则

如果文字版说明和图谱 diff 冲突：

- 优先提示冲突
- 不静默猜测
- 请求用户确认或按最新图谱为准

如果图谱中存在 `needs_validation`：

- 执行时要显式标注待确认
- 不把待确认内容当作已确认事实

## 7. 节点生成规则

### 7.1 节点类型

任务拆解大师应优先使用以下节点类型：

- Goal
- Module
- Feature
- Page
- DataEntity
- API
- Constraint
- Risk
- Assumption
- Question
- Decision
- Task

### 7.2 节点 id 规则

id 必须稳定，不使用 title 作为 id。

推荐格式：

```text
goal_001
module_001
feature_001
risk_001
question_001
task_001
```

同一份输出内递增即可。

### 7.3 节点字段

必填：

- id
- type
- title
- status

推荐填写：

- description
- source
- confidence

可选：

- priority
- tags
- notes

### 7.4 状态规则

| 状态 | 使用场景 |
| --- | --- |
| confirmed | 用户明确确认或强上下文确定 |
| suggested | Agent 推断但未确认 |
| needs_validation | 需要后续验证 |
| deprecated | 已被替代或不推荐继续使用 |

## 8. 关系生成规则

### 8.1 关系类型

任务拆解大师应优先使用以下关系：

- contains
- depends_on
- impacts
- conflicts_with
- requires
- replaces
- references
- constrains
- answers
- needs_validation

### 8.2 常见关系映射

| 场景 | 关系 |
| --- | --- |
| 目标包含模块 | contains |
| 模块包含功能 | contains |
| 功能依赖接口或服务 | depends_on |
| 功能引用数据对象 | references |
| 风险影响模块或功能 | impacts |
| 约束限制模块或功能 | constrains |
| 问题指向待确认对象 | needs_validation |
| 决策回答问题 | answers |
| 新方案替代旧方案 | replaces |
| 两个方案不能同时成立 | conflicts_with |

### 8.3 关系状态

关系也需要 status：

- confirmed
- suggested
- needs_validation

Agent 推断出来的关系不能直接标成 confirmed，除非用户已经明确表达。

## 9. 输出模板改造

### 9.1 模式0最终输出模板

````markdown
# 思维地图：[主题]

## 核心问题
[一句话定义]

## 关键假设
...

## 逻辑链条
...

## 未解决的问题
...

## 行动方向建议
...

## Agent Context Map

```acm
schema_version: "0.1"
doc_id: "acm_xxx"
meta:
  title: "..."
  created_by: "task-decomposer"
  purpose: "..."
nodes:
  ...
edges:
  ...
```
````

### 9.2 模式1最终输出模板

````markdown
# DesignBlueprint：[任务名称]

## 任务核心
...

## 专家角色
...

## 成功标准
...

## 上下文与约束
...

## 输出格式
...

## Agent Context Map

```acm
...
```
````

### 9.3 模式2处理 Agent Diff 的输出模板

```markdown
# 基于图谱变更的执行结果

## 已识别的用户修改
...

## 对任务目标的影响
...

## 更新后的执行方案
...

## 待确认事项
...

## 正式交付
...
```

## 10. Skill 文件改造步骤

### 第一步：新增概念定义

在 task-decomposer 的核心架构中新增：

- GraphBlueprint
- ACM-MD
- Agent Context Map

### 第二步：更新模式0阶段4

在 ClarityMap 输出后增加 `Agent Context Map` 输出。

### 第三步：更新模式1阶段5

在 DesignBlueprint 总结后，增加图谱输出选项或默认附带图谱。

### 第四步：更新模式2输入说明

声明模式2 可以读取：

- ClarityMap
- DesignBlueprint
- ACM-MD
- Agent Diff

### 第五步：新增节点和关系生成规则

在 skill 中明确枚举：

- 节点类型
- 关系类型
- 状态
- id 规则
- 置信度规则

### 第六步：新增质量要求

图谱输出必须满足：

- id 唯一
- 关系引用有效
- 不使用未定义类型
- 推断内容必须标注 suggested 或 needs_validation
- 不把用户未确认内容写成 confirmed

## 11. 测试用例

### 用例 1：模糊想法澄清

输入：

> 我想做一个给 Agent 用的思维导图工具，但还没想清楚。

期望：

- 输出 ClarityMap
- 输出 Goal、Module、Feature、Risk、Question 节点
- 输出 contains、depends_on、needs_validation 关系

### 用例 2：已有明确任务拆解

输入：

> 帮我拆解一个本地化需求图谱工具的开发计划。

期望：

- 输出 DesignBlueprint
- 输出模块级图谱
- 成功标准被映射成 Constraint 或 Task

### 用例 3：用户修改后的 diff 执行

输入：

> 这是我在工具里改完导出的 Agent Diff，请根据它更新开发计划。

期望：

- Agent 先总结识别到的修改
- 明确哪些计划被影响
- 输出更新后的计划

## 12. 验收标准

任务拆解大师改造完成后，应满足：

1. 复杂需求整理后默认能输出 ACM-MD。
2. 输出的 ACM-MD 能被 Agent Context Map 工具无错误导入。
3. 节点和关系类型均来自规范枚举。
4. 图谱能表达模块包含关系和跨模块依赖。
5. 待确认内容不会被误标为 confirmed。
6. Agent 能读取工具导出的 diff 并继续执行。

## 13. 第一版完成定义

第一版改造完成的标准：

> 任务拆解大师可以在一次需求澄清结束后，同时交付文字版 ClarityMap 和可导入 Agent Context Map 的 ACM-MD 图谱，并且后续可以消费用户从工具导出的 Agent Diff。

这能让“对话澄清 -> 图谱编辑 -> Agent 执行”形成完整闭环。
