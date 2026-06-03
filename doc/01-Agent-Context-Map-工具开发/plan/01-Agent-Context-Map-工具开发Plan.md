# Agent Context Map 工具开发 Plan

版本：v0.3.1  
日期：2026-06-03  
定位：纯本地化、协议驱动的通用逻辑上下文图谱编辑器

## 0. 版本变更摘要

### v0.3

- 产品定位从软件需求图谱扩展为通用逻辑上下文图谱。
- 新增本地持久化与可恢复工作现场：最近打开、自动草稿、关闭重开恢复、源文件丢失兜底。
- 新增 Domain Profile / Template，用 UI 显示名适配通用逻辑、软件开发、研究分析、写作策划、投标准备、个人决策等场景。
- 新增 Windows 绿色版 exe 交付约束、P5 打包验收和 WebView2 运行时检查要求。
- 明确 P0-P2 的 ACM-MD 协议往返闭环可独立验收，不被模板、完整持久化或打包增量阻塞。

### v0.3.1

- 明确 `confidence` 是机器拆解把握度信号，不是人工状态决策。
- 明确 `status` 是人工评审决策，与置信度相互独立。
- 新增 Inspector 中置信度与状态不一致时的琥珀色联动建议，支持一键应用，但不自动改状态。
- 明确 `priority` 只衡量重要性，与对错、把握度或认可状态无关。

## 1. 产品定义

Agent Context Map 是一个面向 Agent 工作流和个人思考工作流的可视化逻辑图谱工具。

它不是只面向软件工程的需求工具，也不是自由白板，而是一个介于“思维导图”“逻辑图谱”和“Agent 上下文管理器”之间的本地工具：

- 从标准化 Markdown 协议 `ACM-MD` 导入需求图谱
- 以可拖拽、可连接、可编辑的图谱形式展示需求结构
- 允许用户在图上继续思考、增删改节点和关系
- 自动记录变更并导出 Agent 可理解的上下文 diff
- 帮助 Agent 精确知道用户改了什么、为什么改、影响哪里、下一步如何执行
- 支持软件开发、研究分析、写作策划、投标准备、个人决策、项目推进等任何带逻辑关联的任务

一句话目标：

> 把对话式任务拆解或个人逻辑思考过程，转成可视化、可编辑、可保存、可校验、可交给 Agent 继续执行的结构化上下文图谱。

本工具的第一优先级是对 `ACM-MD v0.1` 的忠实往返：

> 导入规范文档 -> 编辑图谱 -> 导出规范文档或 `changes/ChangeSet`，不得因为工具内部类型定义与协议不一致而拒绝合法文档或丢失协议字段。

## 2. 核心问题

当前 Agent 工作流的主要问题：

1. 任务拆解结果主要是线性文字，不够具象化。
2. 普通思维导图只适合人看，不适合 Agent 稳定读取。
3. 很多项目、任务、决策和研究过程本质上是图结构，而不是纯树结构。
4. 用户修改需求后，Agent 很难知道具体修改点和影响范围。
5. 如果图谱生成或变更理解不准确，人工审核纠错成本会显著上升。
6. 如果工具关闭后不能恢复上次工作现场，用户无法把它当作长期思考工作台。

本工具要解决的核心问题：

> 建立一个人和 Agent 都能理解的中间层，让需求上下文既能被可视化编辑，又能被稳定解析和执行。

这里的“需求上下文”不限定为软件需求，也包括任意项目或任务中的目标、问题、假设、约束、风险、决策、行动、对象、资料和依赖关系。

## 3. 设计原则

### 3.1 交互层自由

用户在界面上应该像使用思维导图一样自然：

- 节点可拖动
- 节点可新增、删除、复制、合并、拆分
- 关系线可手动连接、断开、重连
- 支持画布缩放、平移、框选、多选
- 支持局部重排和自动布局

### 3.2 语义层严格

所有图谱元素必须遵守协议：

- `ACM-MD v0.1` 规范是唯一数据契约来源
- 每个节点必须有固定节点类型
- 每条边必须有固定关系类型
- 节点 id 必须稳定
- 修改必须生成可追踪 diff
- 导出内容必须可被 Agent 确定性读取
- 导入时必须保留规范允许但工具暂不解释的字段，例如顶层 `validation`

### 3.3 本地优先

工具本身不依赖云端服务，不在编辑环节调用 AI：

- Markdown 解析本地完成
- 图谱编辑本地完成
- 关系推断本地规则完成
- diff 生成本地完成
- 文件导入导出本地完成
- 图谱文档、草稿、最近打开列表和用户布局本地持久化
- 最终验收交付为本地 Windows 绿色版 `.exe`，不以单独 HTML 文件作为交付形态

AI 只参与上下游：

- 上游：任务拆解大师或其他 Agent 生成标准 `ACM-MD`
- 下游：Agent 读取导出的 diff 和新版图谱继续执行

### 3.4 稳定优先于聪明

关系推断不追求复杂智能，优先保证：

- 可解释
- 可撤销
- 可确认
- 可验证
- 可重复

工具自动推断但用户尚未确认的节点或关系，状态必须先落为 `suggested`，不得直接标记为 `confirmed`。

### 3.5 可恢复工作现场

工具必须像本地工作台，而不是一次性预览器：

- 关闭后再打开，能看到最近打开的图谱
- 默认可恢复上次工作现场
- 未导出的编辑草稿不能因为关闭窗口而丢失
- 用户布局、选中状态、视图缩放、最近文件记录应本地保存
- 外部源文件丢失或移动时，工具要提示并保留本地草稿副本

## 4. MVP 范围

### 4.1 必须实现

#### A. 标准 ACM-MD 导入

- 读取 `.md` 文件
- 定位主 `acm` 代码块
- 0 个 `acm` 代码块时报错并提示位置
- 多个 `acm` 代码块时报错或要求用户选择主块，默认不静默合并
- 解析 YAML 内容
- 校验 `schema_version`
- 校验节点、边、布局和变更字段
- 保留顶层 `validation` 字段，v0.1 可读入后透传，不强制解释
- 导入后生成图谱视图

#### B. 图谱画布

- 展示节点和关系线
- 支持缩放、平移、拖拽
- 支持节点拖动
- 支持节点选中
- 支持边选中
- 支持 layout 缺失时的最小自动布局兜底
- 支持保存用户布局到 `layout`

#### C. 节点编辑

- 新增节点
- 删除节点
- 修改标题
- 修改描述
- 修改类型
- 修改状态：人工评审决策，等于是否采纳/确认该节点
- 修改优先级：衡量重要性，独立于置信度和状态
- 修改标签
- 修改备注
- 查看来源和置信度：机器拆解时的把握度信号

#### D. 关系编辑

- 手动连接两个节点
- 断开关系
- 修改关系类型
- 修改关系状态：人工评审决策
- 修改关系置信度：机器拆解时的把握度信号
- 根据节点类型本地推断候选关系
- 对低歧义关系自动填充，并以 `suggested` 状态落库
- 对高歧义关系弹出候选菜单

#### E. Inspector 面板

右侧属性面板展示：

- 当前节点或边的基础字段
- 类型
- 状态：人工评审决策（≠ 置信度）
- 来源
- 置信度：机器拆解时的把握度，是“信号”而非“决策”
- 优先级：重要性，不代表正确性、把握度或认可状态
- 关联对象
- 备注
- 最近修改记录

Inspector 字段提示：

- `confidence` hint：机器拆解时的把握度，是“信号”而非“决策”；改动它只会给出状态建议，不会自动改状态。
- `status` hint：人工评审决策（≠ 置信度）。
- `priority` hint：重要性排序，独立于对错、把握度和是否确认。

#### F. Agent Diff 生成

记录用户编辑行为并生成：

- change_set_id
- base_doc_id
- summary
- agent_instructions
- added_nodes
- modified_nodes
- removed_nodes
- added_edges
- modified_edges
- removed_edges
- layout_changes

本 plan 中的 “Agent Diff” 等同于 ACM-MD 规范中的 `changes/ChangeSet`。

`summary` 和 `agent_instructions` 在工具内不依赖 AI 生成，默认使用确定性模板从结构化 diff 拼装，并允许用户在导出前编辑。

#### G. 导出

支持导出：

- 完整新版 `ACM-MD`
- 仅 Agent Diff
- 当前图谱 JSON
- 可选 Mermaid 预览文本

#### H. 本地存储与恢复

支持本地持久化：

- 最近打开图谱列表
- 上次打开图谱自动恢复
- 当前图谱草稿自动保存
- 用户手动保存到原 ACM-MD 文件或指定文件
- 用户布局、画布缩放、视口位置保存
- dirty 状态提示和关闭前保存确认
- 外部源文件不存在时，从本地草稿副本恢复并提示用户重新指定路径

存储原则：

- 桌面 exe 模式优先使用 Tauri 本地文件能力
- 最近打开、窗口状态、轻量 UI 偏好可存入本地配置
- 图谱正文、草稿和快照必须存入本地应用数据目录或用户指定文件，不只依赖浏览器 localStorage
- 每个图谱以稳定 `doc_id` 建立本地记录
- 本地存储不得破坏 ACM-MD 导入导出格式

#### I. 校验

本地校验规则包括：

- 必须包含 `schema_version`
- 必须包含 `doc_id`
- `nodes` 必须是数组
- `edges` 必须是数组
- 节点 id 唯一
- 边 id 唯一
- 边引用的 from/to 节点必须存在
- 节点类型必须在枚举内
- 关系类型必须在枚举内
- 节点状态必须在枚举内
- 边状态必须在枚举内
- 必填字段不得为空
- 删除节点时不能留下悬空边
- 变更记录必须引用稳定 id
- `confidence` 必须在 0 到 1 范围内
- Error 和 Warning 分级提示
- Warning 规则覆盖核心 Goal 无出边、Risk 无影响对象、Question 无待验证对象、confidence/source 缺失、Feature 无所属 Module、多个 Goal 未建关系、存在未确认 `suggested` 关系

### 4.2 第一版暂不做

- 不兼容任意 Markdown 标题结构
- 不以单独 HTML 文档作为最终交付物
- 不做云端同步
- 不做多人协作
- 不在工具内调用 AI
- 不做复杂权限系统
- 不做任意白板绘制
- 不支持无限自定义节点类型和关系类型
- 不做大型项目管理系统功能

## 5. 推荐技术方案

### 5.1 推荐栈

第一阶段建议使用：

- 桌面壳：Tauri
- 前端：React + TypeScript
- 构建：Vite
- 图谱编辑：React Flow
- 状态管理：Zustand
- YAML 解析：yaml
- Schema 校验：Zod
- 自动布局：Dagre 或 ELK.js
- 本地文件：Tauri FS API
- 本地存储：Tauri app data 目录 + JSON 文件，后续可升级 SQLite

选择理由：

- Tauri 适合纯本地轻量桌面工具
- Tauri 可以将 React/Vite 应用封装为 Windows 桌面 `.exe`
- React Flow 对节点拖拽、连线、缩放、画布操作支持成熟
- TypeScript + Zod 有利于协议稳定
- Zustand 适合中小型交互状态管理
- Tauri 本地文件能力适合保存图谱草稿、最近打开列表和用户工作现场

### 5.2 本地存储方案

第一版建议使用“外部文件 + 应用数据目录”双层存储：

- 外部文件：用户导入或保存的 `.md` / `.acm.md`，保持 ACM-MD 原始格式
- 应用数据目录：保存草稿、最近打开列表、窗口状态、布局状态、自动恢复快照
- `doc_id` 作为本地图谱记录主键
- `source_path` 记录外部源文件路径
- `last_opened_doc_id` 记录上次工作现场
- `recent_documents.json` 记录最近打开列表，建议保留最近 12 到 20 个
- `drafts/<doc_id>.json` 保存未导出草稿和 UI 状态
- `snapshots/<doc_id>/<timestamp>.json` 可保存关键历史快照，用于恢复和审计

保存策略：

- 用户编辑后触发防抖自动保存，建议 500ms 到 1500ms
- 手动保存时写回用户指定 ACM-MD 文件
- 导出给 Agent 时生成正式 `changes/ChangeSet`
- 关闭窗口前如果 dirty，则提示保存或保留本地草稿
- 启动时优先恢复 `last_opened_doc_id` 对应草稿；若外部文件路径失效，保留草稿并提示重新绑定路径
- diff 的权威运行时基线是 `DraftRecord.base_snapshot`
- `snapshots/` 只作为历史恢复点和审计记录，不作为当前 diff 计算的权威基线
- 每次重新导入、手动保存新版或确认导出后，可将当前图谱写入 `base_snapshot` 作为下一轮 diff 基线

### 5.3 打包与验收方式

最终交付必须参考“Markdown 文档审阅标注工作台”的绿色版 exe 验收方式：

该方式作为本项目打包纪律的参考，具体构建产物和命令行为必须以本项目 P0/P5 实测结果为准。

- 工程采用 `src/app/` 放置 React/Vite + Tauri 应用
- 验收交付物为绿色版 exe，例如 `output/portable/Agent Context Map/Agent Context Map.exe`
- 构建 release exe 时使用 `npm run tauri:build -- --no-bundle`
- `--no-bundle` 用于跳过 MSI/NSIS 安装包，只产出可覆盖的 release exe
- 覆盖 exe 前先关闭正在运行的旧进程，避免文件占用
- 每次功能或 Bug 验收只覆盖绿色版 exe 和对应 `version.txt`
- 不默认生成或刷新 MSI、NSIS、portable zip
- 不默认修改 `tauri.conf.json`、`Cargo.toml`、`package.json` 中的 `version` 字段
- 不默认移动、覆盖或删除 `archive/` 中的旧安装包或历史产物
- P0/P5 必须实测 Windows WebView2 Runtime 依赖
- 若目标机器缺少 WebView2 Runtime，工具应给出明确提示或在使用说明中引导安装

验收时只告知用户：

```text
exe: <项目>/output/portable/Agent Context Map/Agent Context Map.exe
构建时间: YYYY-MM-DD HH:mm
本次变更: <一句话>
```

只有用户明确要求“发版”“打安装包”“刷新 zip”“更新 archive”时，才允许执行 MSI/NSIS 打包、压缩 portable zip 或归档动作。

### 5.4 备选方案

如果希望更快出 Web 调试原型：

- Vite + React + TypeScript
- React Flow
- 浏览器 File API
- 本地下载导出

但 Web/HTML 只允许作为早期调试或交互验证手段，不作为最终验收交付物。

如果希望最小开发成本：

- Electron + React

但长期看，Tauri 更适合作为本地工具；如果采用 Electron，也必须交付 Windows `.exe`，不能只交付单独 HTML。

## 6. 核心模块划分

### 6.1 Parser 模块

职责：

- 读取 Markdown 文本
- 提取 `acm` 代码块
- 对 0 个或多个 `acm` 代码块给出明确错误或选择入口
- 解析 YAML
- 转换为内部 GraphDocument
- 输出解析错误和警告
- 保留规范允许的未知可选字段，避免有损往返

### 6.2 Schema 模块

职责：

- 定义节点类型、节点状态、关系类型、边状态
- 定义 GraphDocument 类型
- 定义 ChangeSet 类型
- 校验协议合法性
- 以 ACM-MD v0.1 规范第 7、8、10 节为受控词表唯一来源
- 校验 `confidence` 范围为 0 到 1
- 将缺省的可选 changes 数组归一化为空数组，但导出时可按规范省略空字段

### 6.3 Graph Store 模块

职责：

- 保存当前图谱状态
- 保存原始导入快照
- 管理 undo/redo
- 管理 selection
- 管理 dirty 状态
- 管理 id 生成和冲突检测
- 管理跨会话 diff 基线：每次导入或保存新版图谱后可重置 base snapshot

### 6.4 Storage / Persistence 模块

职责：

- 保存最近打开图谱列表
- 保存上次打开的 `doc_id`
- 保存图谱草稿和自动恢复快照
- 保存用户布局、视口、缩放、窗口状态和 UI 偏好
- 管理外部源文件路径和本地草稿副本之间的关系
- 在启动时自动恢复上次工作现场
- 在源文件丢失、移动或无法访问时提示用户重新绑定路径
- 避免只依赖 localStorage 保存关键图谱正文

### 6.5 Domain Profile / Template 模块

职责：

- 让工具适配任何带逻辑关联的项目或任务，而不是只显示软件工程术语
- 将底层 ACM-MD 节点类型映射为不同场景下的界面显示名
- 提供通用任务、软件开发、研究分析、写作策划、投标准备、个人决策等模板
- 保存每个图谱的 `domain_profile`
- 不改变底层 `NodeType` / `RelationType` 受控词表，避免破坏 ACM-MD v0.1 往返

示例映射：

| ACM-MD 类型 | 通用逻辑图谱显示 | 软件开发显示 | 研究/分析显示 |
| --- | --- | --- | --- |
| Goal | 目标 | 产品目标 | 研究目标 |
| Module | 主题/维度 | 模块 | 分析维度 |
| Feature | 要点/行动 | 功能 | 发现/论点 |
| Task | 下一步 | 开发任务 | 研究任务 |
| Constraint | 约束 | 规则/验收 | 边界条件 |
| Risk | 风险 | 技术风险 | 不确定性 |
| Assumption | 假设 | 前提假设 | 研究假设 |
| Question | 问题 | 待澄清问题 | 待验证问题 |
| Decision | 决策 | 技术取舍 | 判断/结论 |
| DataEntity | 对象/资料 | 数据对象 | 证据/资料 |
| API | 接口/交接点 | API | 外部来源/依赖 |
| Page | 场景/视角 | 页面 | 观察视角 |

建议：

- MVP 使用固定 `NodeType`，通过 profile 改 UI 文案
- 后续若要真正扩展通用节点类型，再升级 ACM-MD 协议版本
- 不建议一开始开放无限自定义底层类型，否则 Agent 读取稳定性会下降

### 6.6 Canvas 模块

职责：

- 渲染节点
- 渲染关系线
- 支持拖拽、连线、框选、缩放、平移
- 处理 layout 更新
- 在 `layout` 缺失时生成最小可用布局，P3 再优化布局质量

### 6.7 Relation Inference 模块

职责：

- 根据 from 节点类型和 to 节点类型推断候选关系
- 低歧义时自动选择
- 高歧义时提供候选
- 记录用户确认结果

示例规则：

| From | To | 候选关系 | 说明 |
| --- | --- | --- | --- |
| Goal | Module | contains | 目标包含模块 |
| Goal | Task | contains | 目标包含任务 |
| Module | Feature | contains | 模块包含功能 |
| Module | Page | contains | 模块包含页面 |
| Feature | API | depends_on | 功能依赖接口 |
| Feature | DataEntity | references | 功能引用数据对象 |
| Feature | Feature | depends_on / impacts / conflicts_with | 功能之间可能依赖、影响或冲突 |
| Constraint | Feature | constrains | 规则约束功能 |
| Constraint | Module | constrains | 规则约束模块 |
| Risk | Feature | impacts | 风险影响功能 |
| Risk | Module | impacts | 风险影响模块 |
| Question | 任意类型 | needs_validation | 问题指向待验证对象 |
| Decision | Question | answers | 决策回答问题 |
| Decision | Feature | impacts / replaces | 决策影响或替代功能 |

推断原则：

- 完整规则以 ACM-MD v0.1 规范第 11 节为准
- 只有一个高置信候选时可以自动选择
- 多个候选时必须让用户选择
- 自动推断生成的边状态为 `suggested`
- 用户在 Inspector 或候选菜单中确认后，状态才可转为 `confirmed`

### 6.8 Diff 模块

职责：

- 对比原始图谱和当前图谱
- 识别节点新增、删除、修改
- 识别边新增、删除、修改
- 生成字段级 before/after
- 生成面向 Agent 的变更摘要
- 生成符合 ACM-MD 规范第 13 节的 `changes/ChangeSet`
- 六类变更数组均为可选字段，导入缺省时按空数组处理
- 使用确定性模板生成 `summary` 和 `agent_instructions`，并允许用户编辑
- 删除或关键修改时支持记录可选 `reason`

### 6.9 Export 模块

职责：

- 导出完整 ACM-MD
- 导出 Agent Diff
- 导出 JSON
- 导出 Mermaid 预览

### 6.10 Build / Packaging 模块

职责：

- 管理 Tauri 桌面构建配置
- 维护绿色版 exe 输出目录
- 提供 `npm run tauri:build -- --no-bundle` 构建脚本
- 构建后将 release exe 覆盖到 `output/portable/Agent Context Map/Agent Context Map.exe`
- 更新绿色版 `version.txt`，记录构建时间和本次变更要点
- 验收前关闭旧进程，避免 exe 被占用
- 明确禁止默认打 MSI/NSIS、刷新 zip、修改安装版本号或改动 archive

## 7. 数据结构草案

本节类型必须与 ACM-MD v0.1 保持一致。工具内部可以扩展运行时字段，但导入和导出的协议字段不得偏离规范。

### 7.0 受控词表

四套受控词表以 ACM-MD v0.1 规范第 7、8、10 节为唯一来源。

```ts
type NodeType =
  | "Goal"
  | "Module"
  | "Feature"
  | "Page"
  | "DataEntity"
  | "API"
  | "Constraint"
  | "Risk"
  | "Assumption"
  | "Question"
  | "Decision"
  | "Task";

type NodeStatus =
  | "confirmed"
  | "suggested"
  | "needs_validation"
  | "deprecated";

type EdgeStatus = NodeStatus;

type RelationType =
  | "contains"
  | "depends_on"
  | "impacts"
  | "conflicts_with"
  | "requires"
  | "replaces"
  | "references"
  | "constrains"
  | "answers"
  | "needs_validation";
```

### 7.1 GraphDocument

```ts
type GraphDocument = {
  schema_version: string;
  doc_id: string;
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout?: GraphLayout;
  changes?: ChangeSet;
  validation?: Record<string, unknown>;
};
```

`validation` 在 v0.1 中允许读入后透传；即使工具暂不解释，也不能在导出时丢失。

```ts
type GraphMeta = {
  title: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  purpose?: string;
  source?: string;
  [key: string]: unknown;
};
```

### 7.2 GraphNode

```ts
type GraphNode = {
  id: string;
  type: NodeType;
  title: string;
  status: NodeStatus;
  description?: string;
  priority?: string;
  source?: string;
  confidence?: number; // 0 <= confidence <= 1
  tags?: string[];
  notes?: string;
};
```

### 7.3 GraphEdge

```ts
type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  status: EdgeStatus;
  reason?: string;
  source?: string;
  confidence?: number; // 0 <= confidence <= 1
};
```

### 7.3.1 status / confidence / priority 语义

三个字段必须各司其职，不得互相替代：

- `confidence` 是机器拆解、规则推断或上游 Agent 给出的把握度信号，范围 0 到 1。
- `confidence` 是“信号”，不是“决策”；用户改动置信度时，工具只给状态建议，不自动改状态。
- `status` 是人工评审决策，表示用户是否采纳、确认、待验证或废弃该节点/关系。
- `status` 与 `confidence` 相互独立；高置信度不等于自动确认，低置信度也不等于自动废弃。
- `priority` 只适用于节点，表示重要性或处理优先级；它与正确性、把握度、认可状态无关。
- 关系也支持 `status` 与 `confidence` 的同样语义。

状态建议阈值：

| confidence | 建议状态 | ACM-MD 状态 |
| --- | --- | --- |
| `< 0.5` | 待验证 | `needs_validation` |
| `>= 0.5` 且 `< 0.8` | 建议 | `suggested` |
| `>= 0.8` | 已确认 | `confirmed` |

`deprecated` 视为明确人工决定，不因置信度变化弹出建议或打扰用户。

### 7.4 ChangeSet

```ts
type ChangeSet = {
  change_set_id: string;
  base_doc_id: string;
  summary: string;
  agent_instructions?: string[];
  added_nodes?: GraphNode[];
  modified_nodes?: NodeFieldChange[];
  removed_nodes?: RemovedNode[];
  added_edges?: GraphEdge[];
  modified_edges?: EdgeFieldChange[];
  removed_edges?: RemovedEdge[];
  layout_changes?: LayoutChange[];
};
```

导入时，缺省的 `added_nodes`、`modified_nodes`、`removed_nodes`、`added_edges`、`modified_edges`、`removed_edges` 归一化为空数组供内部使用；导出时可按规范省略空数组。

### 7.5 字段级变更

```ts
type NodeFieldChange = {
  id: string;
  field: string;
  before: unknown;
  after: unknown;
  reason?: string;
};

type EdgeFieldChange = {
  id: string;
  field: string;
  before: unknown;
  after: unknown;
  reason?: string;
};

type RemovedNode = {
  id: string;
  title?: string;
  reason?: string;
};

type RemovedEdge = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  reason?: string;
};
```

字段级变更以“每字段一条”为默认粒度，便于 Agent 精确理解 before/after。

### 7.6 GraphLayout

```ts
type GraphLayout = {
  engine: string;
  nodes: Record<string, { x: number; y: number }>;
};
```

`layout` 只影响工具展示，不影响 Agent 语义理解。导入文档缺少 `layout` 时，工具生成 `engine: "grid"` 或 Dagre 默认布局作为兜底。

```ts
type LayoutChange = {
  id: string;
  before?: { x: number; y: number };
  after: { x: number; y: number };
};
```

### 7.7 id 生成策略

新增文档和实体必须遵循稳定 id 原则：

- 新建空图谱生成最小合法骨架：`schema_version`、`doc_id`、`meta.title`、`nodes: []`、`edges: []`
- `doc_id` 使用 `acm_` 前缀加时间戳或单调序号，例如 `acm_20260603_001`
- 节点 id 使用规范第 14 节前缀，例如 `goal_001`、`feature_001`
- 边 id 使用 `edge_` 前缀
- ChangeSet id 使用 `changes_` 前缀
- 新增 id 不依赖 title，生成后除显式修复冲突外不得自动变化
- 导入已有图谱时优先在同前缀下寻找符合 `前缀_数字` 的最大序号生成下一个 id
- 既有 id 不符合 `前缀_数字` 时原样保留，但不参与最大序号计算；新增同类实体直接使用短 uuid 后缀生成，避免歧义
- 如生成结果发生冲突，则使用短 uuid 后缀兜底

### 7.8 本地存储结构

本地存储结构不等同于 ACM-MD 导出协议。它用于恢复工作现场，可以保存 UI 状态、草稿和领域模板配置。

```ts
type LocalDocumentRecord = {
  doc_id: string;
  title: string;
  source_path?: string;
  draft_path: string;
  domain_profile: DomainProfileId;
  last_opened_at: string;
  updated_at: string;
  dirty: boolean;
};

type AppState = {
  last_opened_doc_id?: string;
  recent_documents: LocalDocumentRecord[];
  window?: {
    width: number;
    height: number;
    maximized?: boolean;
  };
};

type DraftRecord = {
  doc_id: string;
  document: GraphDocument;
  base_snapshot?: GraphDocument;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  selection?: {
    node_ids?: string[];
    edge_ids?: string[];
  };
  domain_profile: DomainProfileId;
  autosaved_at: string;
};

type DomainProfileId =
  | "generic"
  | "software"
  | "research"
  | "writing"
  | "bid"
  | "decision";
```

`domain_profile` 属于本地应用状态。除非后续 ACM-MD 协议正式扩展，否则不强行写入导出的 ACM-MD v0.1 顶层字段，避免破坏协议往返。

取舍说明：

- 导出的 ACM-MD 被其它机器或其它用户重新导入时，若没有本地记录，界面会回落到 `generic` 通用逻辑模板
- 这种回落不影响底层节点、关系和 Agent Diff 的语义
- 若后续希望模板上下文随文档流转，可评估增加 `meta.domain_profile_hint` 之类的可忽略提示字段，但必须先经过协议兼容性评审

## 8. 交互设计

### 8.1 主界面布局

推荐三栏结构：

- 左侧：文件、最近打开、图谱模板、协议、节点类型、导入导出
- 中间：图谱画布
- 右侧：属性 Inspector + Agent Diff

顶部工具栏：

- 新建
- 打开
- 保存
- 撤销
- 重做
- 自动布局
- 校验
- 导出给 Agent

新建动作必须生成符合 ACM-MD v0.1 的最小合法文档骨架，而不是只创建空画布。

启动时：

- 如果存在 `last_opened_doc_id`，默认尝试恢复上次图谱
- 如果恢复失败，展示最近打开列表
- 最近打开列表显示标题、路径、最近打开时间和 dirty 状态
- 无最近记录时，展示新建图谱和导入 ACM-MD 入口

### 8.2 节点操作

- 双击节点编辑标题
- 右键节点打开菜单
- 拖动节点改变位置
- 从节点连接点拖线创建关系
- 删除节点时提示是否删除相关边
- 删除或关键修改时提供可选 reason 输入
- 修改类型时重新校验关联关系

### 8.3 关系操作

- 拖线后自动推断关系
- 若只有一个强匹配关系，直接创建为 `suggested`
- 若存在多个候选关系，弹出候选菜单
- 关系线可点击，右侧显示属性
- 关系标签可直接切换
- 用户确认后，关系状态才可从 `suggested` 转为 `confirmed`

### 8.4 置信度与状态联动建议

节点和关系都支持同一套联动建议：

- 拖动或编辑 `confidence` 时，不自动修改 `status`
- 如果置信度建议状态与当前状态不一致，Inspector 显示琥珀色提示
- 提示文案示例：`置信度 0.40 偏低，建议状态改为「待验证」`
- 提示提供「应用」按钮，一键将状态改为建议状态
- 用户也可以忽略提示，保持当前人工评审状态
- `deprecated` 视为人工决定，不因置信度变化显示联动提示

联动阈值：

- `confidence < 0.5`：建议 `needs_validation`（待验证）
- `0.5 <= confidence < 0.8`：建议 `suggested`（建议）
- `confidence >= 0.8`：建议 `confirmed`（已确认）

字段关系：

- 置信度 = 信号
- 状态 = 决策
- 优先级 = 重要性

### 8.5 Diff 操作

- 用户每次编辑都记录操作
- Diff 面板实时刷新
- 支持查看 before/after
- 支持标记某条变更为“已确认”
- 支持通过确定性模板生成 Agent 指令摘要
- 支持用户在导出前编辑 `summary` 和 `agent_instructions`
- 保存新版图谱后，可将当前图谱设为新的 diff 基线，并更新下一轮 `base_doc_id`

### 8.6 存储与恢复操作

- 编辑后自动保存草稿
- 顶部或左侧显示保存状态：已保存、保存中、有未导出修改
- 支持手动保存到当前 ACM-MD 文件
- 支持另存为新的 ACM-MD 文件
- 支持从最近打开列表重新打开图谱
- 支持清空最近打开列表
- 源文件移动或删除时，保留本地草稿并提示重新绑定路径
- 关闭窗口前如存在未保存到外部文件的修改，提示继续保留草稿或立即导出

### 8.7 通用模板操作

- 新建图谱时选择模板：通用逻辑、软件开发、研究分析、写作策划、投标准备、个人决策
- 模板影响节点类型显示名、默认关系提示和新建节点快捷入口
- 模板不改变底层 ACM-MD v0.1 类型
- 用户可在图谱设置中切换模板，切换后只改变界面显示，不改节点 id 和关系 id

## 9. 开发里程碑

里程碑分为两档验收：

- 协议核心成功：P0-P2，完成 ACM-MD 导入、编辑、diff、导出闭环，可独立验收。
- 工作台完整成功：P0-P5，在协议核心之上完成持久化恢复、通用模板、绿色版 exe 打包验收。

执行时优先保住协议核心成功。持久化、模板和打包是重要能力，但不得阻塞 P0-P2 协议往返闭环的独立验证。

### P0：协议和原型验证

目标：

- 对齐 ACM-MD v0.1
- 建立 React/Vite + Tauri 桌面工程骨架
- 建立本地应用数据目录和基础存储结构
- 完成解析器
- 完成 schema 校验
- 完成最小图谱渲染
- 完成 layout 缺失时的最小布局兜底
- 完成 release exe 构建冒烟

交付：

- 可导入标准 ACM-MD
- 可展示节点和边
- 可看到校验错误
- 可保留顶层 `validation`
- 可通过 Tauri 启动桌面窗口
- 可生成绿色版 exe 初始产物
- 可写入和读取基础 AppState

验收：

- 标准示例文件能稳定加载
- 非法节点类型能被识别
- 悬空边能被提示
- 省略空 changes 数组的合法文档能导入
- 只包含部分变更类别的 changes 块能导入
- 无 layout 文档能被自动排布并展示
- 非 `前缀_数字` id 的合法文档能导入，并原样保留既有 id
- `npm run tauri:build -- --no-bundle` 能生成 release exe
- 双击绿色版 exe 后能打开主界面
- 重启应用后能读取上次写入的基础 AppState
- P0 冒烟记录 WebView2 Runtime 是否已安装；未安装时记录提示或兜底方案

### P1：图谱编辑 MVP

目标：

- 完成节点拖拽
- 完成节点增删改
- 完成关系连接和修改
- 完成右侧 Inspector
- 完成新建文档和新增节点/边的 id 生成策略
- 完成最近打开、自动草稿保存和上次图谱恢复
- 完成节点和关系的置信度/状态联动建议

交付：

- 可编辑完整图谱
- 可保存 layout
- 可修改节点和边属性
- 可从空白新建最小合法 ACM-MD 文档
- 可关闭后重新打开并恢复上次图谱
- Inspector 能区分置信度信号、状态决策和优先级重要性

验收：

- 拖拽后坐标能保存
- 新增节点能出现在导出文件中
- 删除节点不会留下悬空边
- 新增实体 id 稳定且符合前缀规范
- 删除关键节点可记录可选 reason
- 编辑节点后关闭并重开，修改仍然存在于本地草稿
- 最近打开列表能重新打开图谱
- 外部源文件缺失时，本地草稿仍可恢复
- 拖动节点或关系置信度时，不自动修改状态
- 置信度与状态不一致时，Inspector 给出琥珀色状态建议并支持一键应用
- `deprecated` 状态不因置信度变化弹出联动提示

### P2：Diff 和导出

目标：

- 完成原始快照和当前图谱对比
- 完成 Agent Diff
- 完成完整 ACM-MD 导出

交付：

- 可导出新版图谱
- 可导出变更说明
- 可导出 Agent handoff 文件
- 可导出并保留可选字段，不丢失 `validation`

验收：

- 新增、修改、删除节点能准确识别
- 关系变化能准确识别
- Agent 读取 diff 后能知道执行调整点
- 空变更数组可按规范省略
- `summary` 和 `agent_instructions` 可由模板生成并可人工编辑
- 保存新版后可重置下一轮 diff 基线

### P3：规则推断和体验优化

目标：

- 完成关系推断规则表
- 完成候选关系选择菜单
- 完成自动布局质量优化
- 完成 undo/redo
- 完成通用模板和领域显示名

交付：

- 连线体验顺畅
- 校验提示友好
- 图谱布局可用
- Warning 级校验可视化提示完整
- 通用逻辑、软件开发、研究分析、写作策划、投标准备、个人决策模板可选

验收：

- Goal -> Module 自动推断 contains
- Feature -> API 自动推断 depends_on
- Feature -> Feature 给出候选关系
- Question -> 任意类型自动推断 needs_validation
- 自动推断关系默认 status 为 suggested
- undo/redo 能恢复编辑状态
- 切换模板只改变显示名，不改变底层节点类型、边类型和 id

### P4：任务拆解大师集成

目标：

- 任务拆解大师输出 ACM-MD
- 工具导入该输出
- 工具导出的 diff 可交给 Agent 继续执行
- 对照文档 02 与文档 03 做端到端兼容验证

交付：

- 完整闭环：Agent 生成 -> 工具编辑 -> Agent 执行
- 生成端和导入端兼容性测试样例

验收：

- 任务拆解大师生成的图谱能无报错导入
- 用户修改后导出的 diff 能被 Agent 准确理解
- 不需要人工重新解释修改点
- 若生成端输出无 layout，工具可自动布局

### P5：绿色版 exe 打包验收

目标：

- 将可用闭环打成 Windows 绿色版 exe
- 用绿色版 exe 完成功能验收，而不是用单独 HTML 文件验收
- 固化后续功能/Bug 迭代的 exe 覆盖流程

交付：

- `output/portable/Agent Context Map/Agent Context Map.exe`
- `output/portable/Agent Context Map/version.txt`
- 绿色版 exe 更新 SOP

验收：

- 使用 `npm run tauri:build -- --no-bundle` 构建 release exe
- 只覆盖绿色版 exe 和 `version.txt`
- 不生成或刷新 MSI/NSIS 安装包
- 不刷新 portable zip
- 不修改安装版本号
- 不改动 archive 历史产物
- 明确验证目标机器 WebView2 Runtime 依赖和提示路径
- 用户双击绿色版 exe 能完成导入、编辑、导出 diff 的核心闭环

## 10. 验收标准

验收分两档：

- 协议核心验收：只验证 ACM-MD 导入、编辑、diff、导出闭环，对应 P0-P2。
- 工作台完整验收：在协议核心基础上验证持久化恢复、通用模板、绿色版 exe 和打包规则，对应 P0-P5。

### 10.1 功能验收

- 能导入符合规范的 ACM-MD
- 能导入缺少 layout 的合法 ACM-MD 并自动排布
- 能导入只包含部分 changes 字段的合法 ACM-MD
- 能展示节点和关系
- 能自由拖动节点
- 能手动连接节点
- 能编辑节点和边属性
- 能保存 layout
- 能生成 diff
- 能导出给 Agent 的文件
- 能通过绿色版 exe 完成核心闭环验收
- 能保存最近打开列表
- 能关闭后重开并恢复上次图谱
- 能选择不同通用模板创建图谱

### 10.2 稳定性验收

- 非法格式不会导致应用崩溃
- schema 校验错误有明确提示
- warning 级问题有明确提示但不阻止保存
- diff 不丢失用户修改
- `validation` 等可选字段不因导入导出而丢失
- 删除节点时不会产生悬空边
- id 追踪稳定，不依赖 title
- 自动推断但未确认的关系不会被标记为 `confirmed`
- `confidence` 超出 0 到 1 时被 Error 级校验拦截
- 修改 `confidence` 不会自动修改 `status`
- `deprecated` 状态不被置信度联动建议打扰
- `priority` 与 `confidence`、`status` 保持独立
- 自动保存不能损坏原 ACM-MD 文件
- 外部源文件不可访问时，本地草稿仍可打开
- 模板切换不改变底层协议字段

### 10.3 Agent 适配验收

- Agent 能读取新版图谱
- Agent 能读取变更摘要
- Agent 能识别新增、删除、修改、关系变化
- Agent 能基于 diff 调整后续任务
- Agent 可以依赖结构化 changes 字段，而不是必须理解自然语言摘要

### 10.4 通用任务适配验收

- 同一套工具能创建“通用逻辑”图谱，不出现强软件工程依赖
- 软件开发、研究分析、写作策划、投标准备、个人决策模板都能创建和保存
- 模板显示名与底层 ACM-MD 类型映射清晰
- 导出的 ACM-MD 仍保持协议合法
- Agent Diff 不因模板显示名变化而丢失语义

### 10.5 原型性能验收

第一版先按中小型需求图谱设计：

- 目标支持 100 个节点、200 条边以内的流畅编辑
- P0/P1 阶段用该规模样例验证 React Flow 渲染、拖拽和缩放
- 若性能不足，在 P3 前决定是否引入虚拟化、分组折叠或局部视图

### 10.6 打包验收

- 最终交付物必须是 Windows 绿色版 `.exe`
- 单独 HTML 文件不能作为最终验收交付物
- 绿色版 exe 路径固定为 `output/portable/Agent Context Map/Agent Context Map.exe`
- 每次验收构建使用 `npm run tauri:build -- --no-bundle`
- 验收时只覆盖绿色版 exe 和 `version.txt`
- 默认不生成 MSI/NSIS，不刷新 zip，不修改安装版本号，不改动 archive
- 必须验证 WebView2 Runtime 依赖；缺失时有明确提示或安装引导
- 验收说明必须给出 exe 路径、构建时间和本次变更一句话摘要

## 11. 主要风险

### 风险 1：图谱协议过复杂

表现：

- Agent 输出困难
- 工具校验复杂
- 用户理解成本变高

缓解：

- v0.1 只保留最小必要字段
- 节点类型和关系类型先克制
- 高级字段设为 optional

### 风险 2：自由编辑和严格协议冲突

表现：

- 用户想随便连线，但协议不允许
- 工具提示过多，打断思考

缓解：

- 允许创建 suggested 状态关系
- 校验分为 warning 和 error
- 导出给 Agent 前再做强校验

### 风险 3：diff 语义不清晰

表现：

- Agent 看到 diff 仍然不知道怎么执行
- 纯模板生成的 summary 不够自然

缓解：

- diff 同时包含机器字段和自然语言摘要
- 每次导出用确定性模板生成 `agent_instructions`
- 允许用户在导出前编辑 `summary` 和 `agent_instructions`
- P4 验收优先依赖结构化 `changes` 字段，而不是自然语言摘要
- 对关键变更要求用户确认

### 风险 4：画布体验不顺手

表现：

- 编辑比直接写 Markdown 更慢

缓解：

- 优先打磨拖拽、连线、快捷键、自动布局
- 节点编辑尽量少弹窗
- 常用操作放在右键和快捷工具条

### 风险 5：协议漂移导致往返不忠实

表现：

- 工具内部类型与 ACM-MD 规范不一致
- 合法文档被判非法
- 导入后再导出丢失可选字段

缓解：

- Schema 模块以文档 03 为唯一协议来源
- P0 加入规范合法样例、部分 changes 样例、无 layout 样例、validation 透传样例、非数字 id 样例
- 导入时保留 `validation` 等可选字段
- 每次协议更新后先更新受控词表和 schema 测试，再开发画布能力

### 风险 6：交付形态偏离绿色版 exe

表现：

- 开发阶段只留下 Web/HTML 原型，无法给用户双击验收
- 误触发 MSI/NSIS 安装包或 portable zip 刷新
- 覆盖旧安装包、archive 或修改安装版本号，导致交付物混乱

缓解：

- P0 即建立 Tauri 桌面骨架并验证 release exe 构建
- P5 专门做绿色版 exe 打包验收
- 构建命令固定使用 `npm run tauri:build -- --no-bundle`
- 每次验收只覆盖 `output/portable/Agent Context Map/Agent Context Map.exe` 和 `version.txt`
- 只有用户明确要求发版或打安装包时，才生成 MSI/NSIS、zip 或更新 archive

### 风险 7：本地状态丢失

表现：

- 用户关闭再打开后，最近图谱、草稿或布局丢失
- 只依赖 localStorage，导致桌面端数据不可控
- 外部源文件移动后无法恢复工作现场

缓解：

- P0 建立 Tauri app data 本地存储结构
- P1 完成自动草稿保存和最近打开恢复
- 图谱正文草稿存入本地应用数据目录，不只依赖 localStorage
- 手动保存和自动保存分离，避免自动保存直接损坏源 ACM-MD
- 源文件不可访问时保留本地草稿并提示重新绑定路径

### 风险 8：工具被误解为只适合软件工程

表现：

- 节点名称过于软件化，用户很难用于研究、写作、决策、投标等场景
- 为了通用化而开放无限自定义类型，导致 Agent 读取不稳定

缓解：

- 产品定位改为通用逻辑上下文图谱
- MVP 保持 ACM-MD v0.1 受控词表稳定
- 通过 Domain Profile 改界面显示名和模板，不改变底层协议
- 后续如需真正新增通用节点类型，再通过 ACM-MD 协议升级处理

## 12. 成功定义

成功不以“功能多”为标准，而以闭环可用为标准。

### 12.1 协议核心成功

协议核心成功可以独立验收：

> 任务拆解大师或用户自己输出一份 ACM-MD，工具能稳定导入；用户在图上修改后，工具能导出清晰 diff；Agent 读取 diff 后能准确继续工作。

这一档对应 P0-P2，是第一优先级。即使通用模板、完整持久化或绿色版打包还在打磨，协议往返闭环也应尽早独立验证。

### 12.2 工作台完整成功

工作台完整成功在协议核心之上增加本地长期使用能力：

> 任务拆解大师或用户自己输出一份 ACM-MD，绿色版 exe 能稳定导入；用户在图上修改后，关闭重开仍能恢复工作现场；工具能导出清晰 diff；Agent 读取 diff 后能准确继续工作。

如果这个闭环能在绿色版 exe 中成立，并且通用逻辑模板不局限于软件工程，后续再扩展高级图谱能力、更多视图、搜索、版本管理、协议升级和正式安装包。
