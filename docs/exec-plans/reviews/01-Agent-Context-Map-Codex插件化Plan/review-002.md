# 交付物评审意见

**审核对象**：`docs/exec-plans/proposed/01-Agent-Context-Map-Codex插件化Plan.md`（v2，1619 行，Proposed / review-only，按 review-001 修订后送审）

- 评审模式：修订审（基准：review-001，裁决 revise）
- 评审日期：2026-07-14
- 核查资料边界：协调者沿用上一轮设置、未另行指定清单，本评审继承 review-001 的边界，以当前仓库工作区与 Git 为事实核查边界。针对 v2 修订点重点核对了 INSTRUCTIONS.md、package.json、src/acm/data.js、src-tauri/src/lib.rs、skills/acm-md/references/acm-md-v0.1.md §13、docs/decisions/DEC-003、docs/exec-plans 双索引、PROGRESS.md、HANDOFF.md 与当前 Git 状态。按修订审规则，未修改部分不重复评审。

## 整体判断

**裁决**：approve
**置信度**：medium

## 总体评价

v2 对 review-001 的回应质量高。9 个问题全部在 §0.4 形成逐项 disposition：8 项落为计划文本修订，1 项（单文件体量）书面说明理由后延后。经逐项对照，这些修订不是表面补丁，而是把问题吸收进了计划的授权链（§14.2 新增第 3/4/5 项决策）、Gate 结构（Phase 0 拆为 0A/0B、Phase 2 停止条件双向覆盖）和契约定义（§5.1 唯一规范 operation 模型与三向映射表）。修订审范围内的全部事实性声明经仓库对照均成立。

尤其值得肯定两点：其一，S1 的解法比 review-001 的原建议更严谨——不是提前改写 INSTRUCTIONS.md，而是「activation 时记录 Accepted 数据真源决策 → Phase 2 真源实际切换后同一 Phase 内同步章程 → 切换失败则章程保持现状」，同时把「提前改写」和「切换后未同步」都列为停止条件，治理死锁与章程提前失真两个坑同时避开。其二，M4 的映射表禁得起逐格核对：与协议 changes 块的七个 bucket、per-field before/after 结构、removed_edges 的 reason 字段完全一致；`patchMeta` 的排除理由（changes 无 meta mutation bucket）经协议 §13.2 字段表核实成立；「changes 仅为应用后导出投影」与现有代码行为一致——当前实现只在导出时生成 changeSet、导入时对 `changes` 作 round-trip passthrough，并不存在会被该定义砍掉的 changes 可执行导入路径。

关键不足只剩两个轻微项：§1.1 快照在送审前又因新治理提交而过时（快照固有的腐化，措辞可再收紧），以及 Phase 2 起各 Phase 新增 npm scripts 时 package.json 未普遍列入修改范围（M1 修复模式未泛化，属可选完善）。均不影响裁决。

### review-001 问题处理核查

| ID | v2 落点 | 核查结论 |
| --- | --- | --- |
| S1 严重：INSTRUCTIONS.md 冲突无修订授权 | §10.6、Phase 0 输入、Phase 2 修改范围/实施项 6/预期/停止条件、§14.2 第 4 项 | 已解决。INSTRUCTIONS.md 现行「Product And Stack」SQLite 行与 Stable Invariant 5 定位准确；授权链、修订时序与双向停止条件完整 |
| M1 中等：Phase 0 测试命令与依赖规则矛盾 | §11 总则、Phase 0A 实施项 2、预期结果、停止条件、§14.2 第 5 项 | 已解决。package.json 现况核实仍无 test script；批准前置、lockfile 审核、真实 suite（至少一过一拒）、no-op 禁令、不批准时的 node:test 替代路径齐备 |
| M2 中等：P0 宿主证据时机过晚、停止条件不可判 | Phase 0B、Phase 4 实施项 2、§12 首行、§14.1 P0 行、§16 | 已解决。采纳 review-001 方案 (a)：隔离于 spikes/codex-host-binding/ 的最小只读 spike，含反伪造用例与三态 Gate 结论，后两态不得静默进入 Phase 1；Phase 4 复验且证据漂移须重开 ADR；停止条件已在 Phase 0 内可判定 |
| M3 中等：pending 落盘与 pending view state 边界 | §4.3、§10.6、§14.2 第 3 项、Phase 0 停止条件 | 已解决。定义为本机持久化延伸并列全排除路径；未批准时内存-only、跨重启丢弃 |
| M4 中等：三套操作词表缺映射 | §5.1 映射表、§7.2 白名单、Phase 1 实施项 5/6 与停止条件、Phase 3 实施项 7、Phase 6 实施项 2 | 已解决。映射表与协议 §13.1/13.2 及 src/acm/data.js 实际 legacy 词表（add_node/add_edge/update_node，余项确为「无」）逐格一致；退役线 Phase 1 边界适配 → Phase 3 迁调用方 → Phase 6 拒绝，停止条件禁止双命名并存 |
| L1 轻微：base_snapshot 误列为独立表 | §1.4 | 已解决。与 src-tauri/src/lib.rs MIGRATIONS（documents 含 base_snapshot 列、snapshots、app_state）一致 |
| L2 轻微：Git 快照过时 | §1.1 | 已解决，有轻微残余（见问题 1）。已标注采集时点并刷新为 D 盘权威仓库事实；DEC-003 状态 Accepted 核实无误 |
| L3 轻微：layout 冲突体验未声明 | §4.4、Phase 8 实施项 2 与验收清单、§12 | 已解决。有意选择已声明；conflictClass 三分类、受影响 ID、用户复核后重放、禁后台 rebase 与测试矩阵互相呼应 |
| L4 轻微（可选）：计划体量 | §0.4 明示延后 | 拒绝修改，理由成立：v2 保持单文件以保证对 review-001 的可追溯性，review 通过后 activation 时再把 §7/§8 迁为附属 spec 且不改语义。review-001 原列为可选，不计入问题 |

## 问题清单

### 严重问题

无。

### 中等问题

无。

### 轻微问题

1. **§1.1 快照送审前又已过时，且含跨文档一致性断言**（修订引入）
   - 位置：§1.1
   - 问题描述：v2 按 review-001 建议为快照标注了采集时点并刷新了事实，但送审时仓库已再前进一个治理提交：当前 HEAD 为 `9163936`（ahead 3），§1.1 记录 `6152a27`（ahead 2）；「PROGRESS.md、HANDOFF.md 与真实 HEAD `6152a27` 一致」是会随仓库演进立即失效的断言，且两次采集同日，日期标注无法消歧。
   - 改进建议：措辞收紧为只陈述采集时点事实（如「采集时 HEAD/ahead」），删去「与真实 HEAD 一致」类跨文档断言，或补一句「本表仅为采集时点快照，之后以 git 实测为准」。PROGRESS.md/HANDOFF.md 已带「以当前 Git 命令为准」的免责声明，实际误导风险有限，可在下次触碰该文件时顺带修订。

2. **Phase 2 起各 Phase 验收命令引入新 npm scripts，但修改范围未普遍列出 package.json**（修订引入，可选）
   - 位置：§11 Phase 2/4/5/6/7 的验收命令与修改范围
   - 问题描述：M1 修复后 Phase 0/1 的 package.json 变更已显式入范围，但 Phase 2 起的 `test:project-store`、`build:mcp`、`test:widget` 等新 script 仍隐含 package.json 修改，而这些 Phase 的修改范围只列出测试/构建目录。按计划自身「每 Phase 枚举可改文件」的严格口径，执行 session 可能面临与 review-001 S1 同构（但严重度低得多）的范围争议。
   - 改进建议：在 §11 总则补一句「各 Phase 为其列出的测试/构建命令新增 npm scripts 时，package.json 的 scripts 区段视为该 Phase 修改范围的一部分；依赖变更仍按本节审批规则执行」。可在 activation 修订时一并处理，不阻塞本轮。

## 未验证项

- v1 → v2 无法机械 diff：计划文件未被 Git 跟踪且 v1 文本未留存，本轮以 review-001 的引文、§0.4 disposition 表与 v2 全文通读交叉核对 —— 建议协调者今后对未跟踪 proposed 文档做版本修订前先留存旧版或纳入 commit，使修订审可以精确对 diff。
- Codex Desktop 可信 task/workspace 身份证据：评审环境无真实宿主，无法验证 —— 计划已将其前置为 Phase 0B Gate 并含反伪造用例，验证安排恰当，此项按设计只能在执行期落定。
- §17 v2 新增的两个外部声明（「经最新 Codex Manual 缓存复核插件/app/MCP 章节」「官方资料未建立可直接引用的宿主 identity 稳定契约」）：本环境无法核验 —— 其结论方向保守（fail closed、以 spike 实证），即使外部文档实际更强，代价只是多做一次 spike，不构成安全风险。
- review-001 未抽查的其余 8 条外部引用：属未修改部分，本轮未重复抽查 —— review-001「激活前由执行 session 复核 Phase 4/5 直接依赖条目」的建议继续有效。
- 跨平台原子替换、SQLite 迁移保真度、bundle 可复现性等执行期行为：本轮无相关修订，仍属计划内已设 Gate 的执行期验证。

## 裁决理由

选择 approve 而非 revise：review-001 的 1 个严重和 4 个中等问题全部核实为已正确解决，且解决方式经得起仓库事实对照——S1 采用「决策先行、章程随真源切换同步」的方案避免了提前失真，优于原建议；M4 的映射表与协议、现有代码逐格一致，并确认不会误伤现有 changes 导出/往返行为。本轮仅存 2 个轻微问题且均为可选优化，没有中等问题，符合「方案可行，无严重问题」的 approve 标准。

对唯一未修项 L4：起草者理由（保持 review 可追溯性、activation 时拆分不改语义）成立，且 review-001 本就列为可选项，按修订审规则不计入问题。

置信度 medium：修订审范围内所有可核查项均已对照仓库核实；受限项与 review-001 相同——真实宿主行为、外部引用与跨平台执行期行为在本环境不可验证，但计划已把这些不可验证项全部转化为执行期 Gate 而非既成事实假设。

边界提醒：approve 只表示本计划通过独立评审，不构成 activation。后续闸门按计划 §14.2 与仓库治理执行：用户逐项回答决策（特别是第 2/3/4/5 项授权类决策）并明确批准后，方可记录 Accepted 数据真源决策并迁入 `docs/exec-plans/active/`；此前不得执行任何 Phase。
