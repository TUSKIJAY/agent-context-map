# 交付物评审意见

**审核对象**：`docs/exec-plans/proposed/01-Agent-Context-Map-Codex插件化Plan.md`（1528 行，Proposed / review-only，v1 首次送审）

- 评审模式：全量审
- 评审日期：2026-07-14
- 核查资料边界：协调者未另行指定清单，本评审以当前仓库工作区与 Git 为事实核查边界，覆盖计划 §17 所列全部项目内来源（AGENTS.md、INSTRUCTIONS.md、PROGRESS.md、HANDOFF.md、PROJECT_MAP.md、docs/README.md、docs/decisions/、docs/exec-plans/ 索引、package.json、vite.config.js、src/App.jsx、src/acm/data.js、src/acm/agentClient.js、src/storage/store.js、src/storage/files.js、src-tauri/src/lib.rs、src-tauri/capabilities/default.json、skills/acm-md/ 规范与校验器），并对计划 §17 的外部引用做了可达性与内容一致性抽查。

## 整体判断

**裁决**：revise
**置信度**：medium

## 总体评价

这是一份调查质量很高的技术计划。其核心价值在于：把「原生 Codex Widget + local-first + 复用现有编辑器 + 保留 Tauri」的组合约束正确地翻译成了架构条件（core/editor/platform 解耦、项目 ACM-MD 单真源、可信 task/project 绑定），而不是用一个打包动作糊弄过去；路线比较表（A–E3）的排除理由成立，E2（单 stdio MCP 不设 daemon）保留为 ADR 比较项而非草率定案，是恰当的。安全模型（信任分层、fail closed、app-only commit、user gesture 门控、digest 复核、路径 containment）和数据模型（内容哈希 revision、锁内重读、原子替换、index 只作可重建投影、迁移不双写）设计成熟，Phase/Gate 结构与本仓库 governed 生命周期一致。

事实核查结果支持计划的基线部分：§1 的全部代码事实声明经逐项对照均准确 —— data.js 确实静态依赖 yaml 与 dagre 并混合 parse/validate/diff/export/layout/pending patch 职责；agentClient.js 的四级 fallback（window agy → Tauri invoke → 全局 MCP → HTTP sidecar）与 confirmed→suggested 降级属实；store.js 在模块加载时检测 `__TAURI_INTERNALS__` 且静态 import Tauri SQL；lib.rs 注册 SQLite migration、dialog/fs 插件与 agy CLI 桥；capabilities/default.json 存在 `{ "path": "**" }` 级文件读写权限，计划的最小化主张成立；package.json 确无测试框架与插件/MCP 构建脚本；Git 事实（分支、外置 git-dir、HEAD `6152a27`）与 §1.1 一致；ACM-MD v0.1 规范确认单主 `acm` 块 + 宽容导入、layout 为协议顶层字段（`setNodeLayout` 协议兼容）、受控词表与计划引用一致。抽查的两条关键外部引用（Codex Build plugins、Apps SDK Reference）可达且内容与计划描述相符（`.codex-plugin/plugin.json`、marketplace JSON 目录、`_meta.ui.resourceUri`、`ui/message`、`_meta.ui.visibility=["model","app"]` 均有出处）。

关键不足集中在治理完备性与首个 Gate 的可操作性，而不是技术方向：计划对 AGENTS.md 的修订授权处理得很细（§10.6），却完全遗漏了 INSTRUCTIONS.md 中与目标架构直接冲突的稳定事实与不变量；Phase 0 的验收命令与计划自身的依赖管控规则相互矛盾；P0 宿主信任风险的真实证据要到 Phase 4 才能获得，而 Phase 0 的对应停止条件在其修改范围内不可判定。这些问题都可以通过小范围修订解决。

## 问题清单

### 严重问题

1. **INSTRUCTIONS.md 稳定事实与不变量同目标架构冲突，未纳入任何修订授权**
   - 位置：§10.6（仅处理 AGENTS.md）、§11 各 Phase 修改范围、§14.2（无对应决策项）
   - 问题描述：INSTRUCTIONS.md「Product And Stack」明确「桌面：Tauri 2，SQLite 本地持久化」，Stable Invariants 第 5 条明确「图谱正文按整份 JSON 本地保存」。计划 Phase 2/3 把业务真源改为项目 `.acm` 目录下的 ACM-MD 文件、SQLite 退为只读迁移源，两处章程随之失真。计划为 AGENTS.md 的 loopback 例外句专门设计了「用户批准 + Phase 0 限定修改」的通道，但没有任何 Phase 的修改范围包含 INSTRUCTIONS.md，14.2 决策清单也没有对应条目。计划自身的严格范围管控（每 Phase 枚举可改文件）使执行 session 无权修复该冲突。
   - 影响范围：激活后执行 Phase 2 时，active 计划与项目稳定章程直接矛盾；按本仓库治理规则，执行 session 要么停摆、要么越权修改章程，两者都会破坏治理链条。这同时是对「SQLite 持久化」这一既有用户拍板决策的实质变更，应显式呈现给用户。
   - 改进建议：在 §14.2 增加决策项「批准修订 INSTRUCTIONS.md 的持久化事实与不变量 5（业务真源从 SQLite JSON blob 迁为项目 ACM-MD 文件）」；把 INSTRUCTIONS.md 列入 Phase 0（随 AGENTS.md 修订同批）或 Phase 2 完成 Gate 的修改范围；激活时在 `docs/decisions/` 落一条对应的 Accepted 决策，与 Phase 0 的「数据真源 ADR」互相引用。

### 中等问题

1. **Phase 0 测试框架引入路径与计划自身依赖管控规则矛盾**
   - 位置：§11 总则（「不得自动安装新依赖，依赖变更必须在对应 Phase 先获批准并由 lockfile 审核」）、Phase 0 验收命令 `npm test -- --run`、Phase 0 修改范围与 §14.2
   - 问题描述：仓库当前没有任何测试框架和 `test` script（已核实 package.json）。`npm test -- --run` 的 `--run` 惯用法指向 vitest 一类运行器，属于新增 devDependency；但 Phase 0 的实施项、输入和 14.2 决策清单都没有「批准并引入测试运行器」这一动作。若改用 no-op 占位脚本让命令通过，则该验收 Gate 失去意义。
   - 改进建议：在 Phase 0 实施项中显式加入「经用户批准引入测试运行器（建议 vitest，lockfile 审核）」，或改为基于 `node:test` 的零新增依赖方案并写明取舍；同步修正验收命令。

2. **P0 宿主信任风险的真实证据获取时机偏晚，Phase 0 对应停止条件不可操作**
   - 位置：§0.3、§11 Phase 0 停止条件（「无法确认可信 workspace/task 身份来源」）、Phase 4
   - 问题描述：计划把最高风险正确定位为 Codex 宿主的可信 task/workspace 身份证据，但真实宿主验证安排在 Phase 4，此前 Phase 1–3 已完成成本最高的 core/editor/真源重构。Phase 0 的修改范围只允许文档/ADR/fixture 工作，无法产生真实宿主证据，其停止条件在 Phase 0 内不可判定。
   - 改进建议：二选一并写入计划：（a）前置一个低成本 spike——最小只读 stdio MCP（无业务工具、不接 core）以 repo-local 方式装入 Codex Desktop，记录宿主实际暴露的 task/workspace 元数据，作为 Phase 0/1 之间的独立 Gate；（b）明确书面接受「Phase 0 仅做文档级确认，真实验证推迟到 Phase 4」的残余风险，并把 Phase 1–3 对纯 Tauri 路线的独立价值作为对冲理由写进 ADR。当前文本介于两者之间，会让执行 session 无所适从。

3. **pending proposal 落盘与 AGENTS.md「pending view state」边界的关系未澄清**
   - 位置：§4.3（`pending/<session>.json`）、§10.6、§14.2
   - 问题描述：AGENTS.md 规定 Agent 建议在人工采纳前「只能存在于 pending view state」。计划把 pending proposal 持久化到用户状态目录（跨重启存活、TTL 失效、重载后需全绑定匹配才可恢复）。计划已保证其不进入项目目录、正式文档、保存、导出与 Agent Diff，与规则意图一致，但「落盘到用户状态目录」是否属于「pending view state」的合规延伸没有明说，也未列入需用户批准的规则精确化范围。
   - 改进建议：在 §10.6 的 AGENTS.md 修订建议中同批加入一句对 pending 持久化边界的精确化（例如「pending 建议可持久化于本机用户状态目录，但不得进入项目目录、正式图谱、保存、导出或 Agent Diff」），或在 §14.2 增加对应决策项。

4. **三套操作词表并存，缺少规范映射**
   - 位置：§5.1（operations.js）、§7.2（write_acm_graph 白名单）、ACM-MD v0.1 §13（changes 块）
   - 问题描述：协议 changes 块使用 `added_nodes/modified_nodes/removed_nodes/added_edges/modified_edges/removed_edges/layout_changes` 结构；现有代码 pendingAgentPatch 使用 `add_node/add_edge/update_node`；计划 MCP 白名单新增 `addNode/updateNodeFields/removeNode/addEdge/updateEdgeFields/removeEdge/patchMeta/setNodeLayout`。计划未定义 acm-core 规范操作模型与这三者的映射及命名收敛策略，Phase 1（core operations）与 Phase 6（MCP tools）之间存在契约漂移风险。
   - 改进建议：在 §5.1 声明 operations.js 为唯一规范操作模型，附「MCP operations ↔ 内部 pending patch ↔ ACM-MD changes 导出」映射表，并写明 legacy 命名的兼容与退役计划。

### 轻微问题

1. **§1.4 把 base_snapshot 与数据表并列**
   - 位置：§1.4
   - 改进建议：`base_snapshot` 是 `documents` 表的列，不是独立表（lib.rs MIGRATIONS_V1 只建 documents/snapshots/app_state 三表）。改为「documents（含 base_snapshot 列）、snapshots、app_state」。

2. **§1.1 的「PROGRESS/HANDOFF HEAD 时点差异」观察已过时**
   - 位置：§1.1
   - 改进建议：当前两份状态文档记录的 HEAD 与真实 HEAD 一致（`6152a27`），工作区另有本轮未提交的治理改动，且计划文件本身尚未被 Git 跟踪。修订时给 §1.1 快照注明采集时点，或直接对账刷新，避免未来 session 误以为仍有未完成的状态对账。

3. **layout 级 revision 冲突的体验策略未声明**
   - 位置：§4.4、Phase 8
   - 改进建议：revision 覆盖规范化后全文字节（含 layout 与 meta 时间戳），拖动节点即产生新 revision；Tauri 与 Widget 并行编辑时 layout-only 的 `revision_conflict` 会高频出现。建议在 §4.4 显式声明这是有意选择，并为 layout-only 冲突设计提示/重放策略，或至少把该场景列为 Phase 8 交替编辑的显式测试项。

4. **计划体量对执行 session 不友好（可选）**
   - 位置：全文（1528 行）
   - 改进建议：激活时可把 §7 工具契约与 §8 生命周期拆为计划附属 spec 文件并在计划内引用，降低单个执行 session 的上下文负担。不影响本次评审结论。

## 未验证项

- Codex Desktop 是否提供不可由模型伪造的 task/workspace 身份证据：评审环境无真实宿主，无法验证 —— 计划已将其自标为 P0 并设 Phase 4 真实宿主 Gate，验证方式恰当（另见中等问题 2 的时机建议）。
- 计划 §17 的 10 条外部引用中抽查了 2 条（Codex Build plugins、Apps SDK Reference），可达且内容相符；其余 8 条及 Canvasight pinned commit `469a5a7…` 未逐一核查 —— 建议激活前由执行 session 复核 Phase 4/5 直接依赖的条目。
- `.agents/plugins/marketplace.json` 的确切路径与格式约定：未核查；计划已把 marketplace 创建推迟到 Phase 8 且需再次批准，风险可控。
- 「调查开始时无已跟踪工作区改动」（§1.1）：历史时点声明，无法回溯验证；不影响结论。
- 跨平台原子替换语义、SQLite 迁移保真度、bundle 可复现性等执行期行为：只能在对应 Phase 验证；计划已设测试与停止条件，属于计划内已覆盖的执行期验证。

## 裁决理由

选择 revise 而非 approve：存在 1 个严重问题 —— INSTRUCTIONS.md 章程冲突未纳入任何修订授权，而计划自身的 Phase 范围管控恰恰禁止执行 session 触碰该文件，因此它不可能「在执行阶段自然解决」，激活后将在 Phase 2 形成治理死锁；另有 4 个中等问题（首个 Gate 自相矛盾、P0 证据时机与不可操作的停止条件、pending 落盘边界、操作词表映射）数量偏多，其中前两个直接影响 Phase 0 能否被如实验收。

选择 revise 而非 reject：技术路线选择（路线 C 及其本地优先变体）论证充分，仓库内全部可核查的事实性声明经逐项对照均准确，抽查的外部依据成立，安全与数据一致性设计达到可执行水平。所有问题都是局部的、可通过小范围文本修订解决，不需要重新设计。

置信度 medium：仓库内关键内容已全面覆盖并逐项验证；但真实宿主行为、大部分外部引用与跨平台执行期行为无法在本评审环境验证。

修订后请以 v2 送 review-002（修订审），逐项标注对本轮问题的处理（修订引入 / 遗留未修 / 拒绝修改）。
