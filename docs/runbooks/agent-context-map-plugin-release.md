# Agent Context Map 插件 Phase 8 Canary、发布与回滚 Runbook

## 状态与授权

- 状态：`0.3.0-rc.2` 五项 Release Candidate Gate 全绿；strict-valid repo-root A1 的 health/open/get/validate 已通过，但 Widget 未 ready，按规则停止且不重试，不推进 stable。
- 权威计划：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md` Phase 8。
- 上一固定候选：`0.3.0-rc.1`；release tree SHA-256 `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e`；来源 commit `28425f8`、workflow run `29327685652`、artifact `8308656602`。
- 修复候选：`0.3.0-rc.2`；release tree SHA-256 `828de7e21b11786263de9bda30b4b6d21236f5a09c541b3dd8312d5805912441`；run `29380789287` 五 job 全绿，artifact `8329665419` 下载复核通过并已安装 enabled。
- 用户于 2026-07-14 已授权真实 Windows Codex Desktop canary、repo-local marketplace，以及 canary 通过后的固定 Git tag、GitHub Release 和 stable 发布；Windows 若再次失败立即停止，不再重试。
- 本轮固定候选验证、marketplace 注册和 `0.3.0-rc.1` 安装通过；创建真实 Codex task A1 时 Codex app 返回失败，未产生 task。失败预算已消耗，未创建 A2/B1，未推进 canary/stable tag 或 Release。
- 安全清理已移除 plugin 与 marketplace 配置项；版本化 cache 因 Windows `os error 32` 文件锁残留。按停止规则未重试清理，项目 `.acm` 未修改。
- 用户于 2026-07-15 明确要求联网查因并修复，恢复一次“修复后 A1 创建”验证；该请求不自动授权 tag、GitHub Release 或 stable 发布。
- Desktop 重启后插件工具成功加载，但 manifest/安装版本为 `0.3.0-rc.1` 时 MCP health 上报 `0.2.0`。这证明发布包运行时版本与 manifest 不一致，真实宿主 retry 失败并按停止规则终止。
- 修复已把 manifest 设为 MCP/Widget 构建时唯一版本来源，并增加 packaged server 版本断言；为保持候选不可变，修复进入新候选 `0.3.0-rc.2`，不改写 `rc.1` 历史资产。
- rc.2 正式 A1 task `019f637e-3721-73e1-b15b-a6b46a109dff` 的 health 版本正确，但 open 返回非重试 `no_trusted_workspace`。复盘确认 deep-link 目标是 non-Git 临时目录；Codex 未为该 task 提供 host-owned workspace metadata，而 DEC-005/Phase 5 本来就要求这种情况 fail closed。用户随后明确授权 host-binding 调查/修复及一次 Git-workspace A1 复验。
- runtime 不接受 cwd、模型路径参数或最近项目作为授权根；修复只增加 canary workspace preflight，强制公开 deep-link 的 path 等于 `git rev-parse --show-toplevel` 且目标 ACM-MD 已存在。
- repo-root A1 task `019f6390-dfdd-7240-a17c-461df2f465b2` 已签发 project/session，证明 host workspace 绑定修复有效；但 fixture 使用不受控边类型 `constrained_by`，严格扫描未收录该文档，open 返回 `document_not_found`。该次授权已消耗，未自动重跑。
- preflight 现在还必须通过 core strict ACM-MD validation，并验证内部 `doc_id` 与请求 ID 相等；只检查 Git root 和文件存在不再构成放行条件。
- 用户随后明确授权一次修正 fixture 的真实 Windows A1。task `019f63a0-518b-7cd0-b147-fd349209cb0d` 已通过 health/open/get/validate，读取 2 nodes / 1 edge 且 validation 无 diagnostics；`await_agent_context_map_ready` 对 openAttempt `640e3e1b-0be1-4001-b34d-837c5b7a8b89` 返回 `ready=false`、无 widget instance/state/transitions。按停止规则不再调用或重跑；fixture hash 前后一致并已删除。
- public plugin directory 不属于 v1；不得提交公开目录或引入远程业务 MCP。

执行前必须在 Phase 8 证据中分别记录：

1. 用户批准真实 Windows Codex Desktop canary 与 repo-local/private marketplace；
2. 用户批准固定 Git tag、GitHub Release、canary 与 stable 发布；
3. 批准时间、批准原文摘要和执行分支。

## Windows 停止规则

- 用户于 2026-07-14 规定：Windows 再失败一次就停止尝试。
- `windowsFailureBudget=1`，从该指令之后计数；成功的必要 Gate 不消耗失败额度。
- 任一真实 Windows Codex canary Gate 或必要 Windows release Gate 再次失败后：
  - 立即停止新的 Windows 重跑、修复后重跑和 stable 推进；
  - 只允许采集已经存在的日志、版本、hash 和失败阶段，并执行不会覆盖项目数据的安全清理；
  - 将 Phase 8 证据状态设为 `windows_failed_stop_no_retry`；
  - 在 `PROGRESS.md`、`HANDOFF.md` 和 active plan 记录阻塞，等待用户另行决定。
- docs-only 提交使用 `[skip ci]`，避免无意义触发 Windows matrix。

## 2026-07-15 失败复盘与修复

上次失败不是 release 资产、manifest、marketplace 注册或插件安装失败。实际顺序是：

1. 在已运行的 Codex Desktop task 中通过 CLI 注册 marketplace 并安装插件；
2. 未重启 Desktop，立即调用非公开的动态 `codex_app.create_thread` 工具；
3. `create_thread` 返回通用错误且未创建 task；清理 cache 时同一 Desktop 进程仍持有文件锁。

官方当前 [Build plugins](https://learn.chatgpt.com/docs/build-plugins.md) 流程要求 repo marketplace 变更后重启 ChatGPT/Codex Desktop，再在新 task 中测试；官方 [desktop app commands](https://learn.chatgpt.com/docs/reference/commands.md) 给出的公开新任务入口是 UI 的 New task 或 `codex://new?path=...&prompt=...` deep link。因此修复为：

- 把 Desktop 完全重启设为安装后的硬闸门；重启前禁止创建 A1；
- A1/A2/B1 只通过 New task UI 或公开 deep link 创建，不再依赖内部 `codex_app.create_thread`；
- deep link 只预填 workspace 与 prompt，不自动发送；用户发送后才开始真实宿主 Gate；
- 重启后先确认插件为 installed/enabled，再创建 A1；任何 MCP/Widget 失败仍按真实 canary 失败处理。

原始错误只有通用提示，不能证明某个插件源码缺陷；“缺少重启且使用内部入口”是由执行顺序、官方流程和 cache 文件锁共同支持的高置信操作根因。修复后的真实 A1 仍必须在重启后验证，不能用 mock/CLI 代替。

重启后的复核补充了第二个、已由运行时证据证明的问题：Desktop 已加载插件工具，health 也返回 `ok=true`，但 `0.3.0-rc.1` manifest 对应的 MCP server 上报 `0.2.0`。MCP server 与 Widget 的版本原先分别写死，发布校验没有启动 bundle 并与 manifest 对照。修复后，构建脚本把 manifest 版本注入 MCP 和 Widget；分发测试会启动实际 bundle 并断言 `serverInfo.version === manifest.version`，Widget bundle policy 同样断言包含 manifest 版本。该修复只能进入新候选，且不恢复已耗尽的 Windows 重试授权。

## 固定分发拓扑

Codex Desktop 的 repo marketplace 文件位于：

```text
$REPO_ROOT/.agents/plugins/marketplace.json
```

本项目不提交 release build 产物，因此 marketplace 不指向源码目录，也不指向 `main`。获批后采用以下拓扑：

```text
.agents/plugins/marketplace.json       # 经批准后创建并跟踪
dist/agent-context-map-plugin/         # 被忽略；来自固定 Release 资产解压或固定工具链构建
```

marketplace entry 使用 local source `./dist/agent-context-map-plugin`。该路径相对 marketplace root，也就是仓库根；安装前必须先用 standalone verifier 校验版本、全部 checksums 和固定 tree。Codex Desktop 安装后从自己的 plugin cache 运行已安装副本。

计划中的 marketplace 内容如下；批准前不得创建真实文件：

```json
{
  "name": "agent-context-map-local",
  "interface": {
    "displayName": "Agent Context Map Local"
  },
  "plugins": [
    {
      "name": "agent-context-map",
      "source": {
        "source": "local",
        "path": "./dist/agent-context-map-plugin"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

## Gate 0：只读预检

以下命令不得修改真实 Codex 状态：

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
git remote get-url origin
git tag --list 'plugin-v*'
gh release list --limit 20
```

预期：权威根为 `D:/Code/agent-context-map`、git-dir 为 `.git`、分支为 `codex/acm-pluginization-plan`、origin 正确；执行前没有冲突 tag/Release。

记录但不输出凭证：

- Codex Desktop 与 CLI 版本；
- 当前 marketplace/plugin 列表；
- `~/.codex/config.toml` 与 plugin cache 的存在性及脱敏备份位置；
- 测试项目 A/B 的 canonical root fingerprint；
- 测试项目全部 `.acm` 文件 SHA-256；
- 当前分支、commit、候选版本、release tree、外层资产 hash。

## Gate 1：固定候选资产

从固定 workflow 或 GitHub Release 下载候选到临时目录，解压到 `dist/agent-context-map-plugin`，然后运行：

```powershell
node plugins/agent-context-map/scripts/verify-release.mjs `
  dist/agent-context-map-plugin `
  --expected-version 0.3.0-rc.2 `
  --expected-tree-sha256 828de7e21b11786263de9bda30b4b6d21236f5a09c541b3dd8312d5805912441
```

必须得到 13 files、12 checksum entries。失败即停止，不得安装。

## Gate 2：一次性 Windows Canary

仅在用户批准后执行：

1. 创建脱敏配置备份和测试项目 hash 清单；不得复制 auth token 到仓库。A1/A2/B1 的 deep-link path 必须是实际 Git top-level，non-Git 目录与 Git 子目录均不得进入真实 Gate。
2. 创建获批的 repo marketplace 文件，通过 CLI 或插件目录安装 `agent-context-map 0.3.0-rc.2`，记录实际 cache 版本目录。
3. 完全退出并重启 Codex Desktop；重启后确认 marketplace 可见且插件为 installed/enabled。此闸门未完成时禁止创建 A1。
4. 对每个目标先运行 `npm run check:phase8-host-workspace -- --project-root <git-top-level> --document-id <doc-id>`；只有 JSON 同时返回 `gitWorkspaceRootVerified=true` 与 `strictAcmMdVerified=true` 才能继续。
5. 通过 New task UI 或公开 deep link 新建 A1、A2、B1；不得调用内部 `codex_app.create_thread`。A1/A2 绑定项目 A，B1 绑定项目 B；验证 session 隔离、project fingerprint 和 active document。
6. 重载 A1，再新建 A3；旧 Widget instance 必须 superseded，不能 ready/commit/send。
7. 在 A1 打开原生 Widget：React mounted、project hydrated、canvas first frame 三项齐全才算 ready。
8. 创建 proposal，分别验证 reject 与 accept；accept 前正式 `.acm` hash 不变，accept 后仅目标文档产生可解释变更。
9. 执行 selected、related、execution 三种 send preview；没有当前 Widget gesture 时不得发送，二次确认后只发送一次到当前 task。
10. 复核模型参数、额外 writable dir、旧 task/instance、stale revision 均不能改变授权项目。
11. 记录 plugin Node 进程网络连接；不得出现远程业务请求、遥测或非预期 listener。

任何一步失败都触发 Windows 停止规则，不进入修复重跑。

A1 的公开 deep link 可按下面方式生成；它只打开并预填 composer，仍需用户检查后发送：

```powershell
$projectRoot = 'D:\Code\agent-context-map'
$documentId = 'acm_phase8_canary_a'
npm run check:phase8-host-workspace -- --project-root $projectRoot --document-id $documentId
$prompt = '[@Agent Context Map](plugin://agent-context-map@agent-context-map-local) 执行 Phase 8 Windows canary A1；只读验证绑定、get/validate 与 Widget ready，不修改 tracked 文件。'
$url = 'codex://new?path=' + [uri]::EscapeDataString($projectRoot) + '&prompt=' + [uri]::EscapeDataString($prompt)
Start-Process $url
```

## Gate 3：Tauri 与 Widget 冲突矩阵

只使用 disposable 项目副本；每个场景前后记录文档 hash：

| 场景 | 并发修改 | 必须结果 |
| --- | --- | --- |
| content/content | Tauri 与 Widget 修改同一内容字段 | `revision_conflict`，`conflictClass=content`，列出受影响 ID，无丢失 |
| layout/layout | 两端移动同一或相关节点 | `revision_conflict`，`conflictClass=layout_only`，显示 currentRevision 新预览 |
| layout/content | 一端改 layout、一端改内容 | `revision_conflict`，`conflictClass=mixed`，列出受影响 ID |

layout-only 也不得后台 rebase。用户必须看到基于 currentRevision 的新预览并再次确认，旧 preview/gesture 失效。

## Gate 4：生命周期与恢复

执行顺序：

1. canary fresh install；
2. canary → stable upgrade；
3. stable → 前一已验证 release rollback；
4. 卸载插件但保留项目 `.acm` 和用户状态；
5. 只清理明确批准的 plugin cache/config entry，不删除项目数据；
6. 重装固定 stable；
7. 验证 active doc、非业务 UI state 和 pending cache 的恢复规则；过期或绑定不匹配的 pending 必须丢弃；
8. 比较所有项目 `.acm` hash，只有用户明确提交的目标变更可以不同。

无法确认恢复状态时进入只读 recovery，不覆盖或降级文档。

## Gate 5：固定 Tag、Release 与 Stable

外部状态动作仅在独立批准后执行。

### Canary

- tag：`plugin-v0.3.0-rc.2`；
- tag 指向产生已验证固定资产的 commit；
- GitHub Release 标记 prerelease；
- 上传 `agent-context-map-plugin-0.3.0-rc.2.zip`、外层 `.sha256`、SBOM/依赖清单；
- 下载 Release 资产并重复 standalone verification，不能只验证 Actions 临时 artifact。

### Stable

- 把 manifest 与 CHANGELOG 固定为 `0.3.0`；
- 重新执行 Phase 7 完整 release-candidate Gate；Windows 若失败，按停止规则终止；
- 通过真实升级/回滚/卸载恢复后创建 `plugin-v0.3.0`；
- GitHub Release 不指向 `main`/`latest` 浮动来源；
- repo marketplace 只安装已验证的 `0.3.0` 解压目录；
- 至少保留已重新完成 Phase 7/8 Gate 的 `0.3.0-rc.2` 作为前一个可回滚资产；`rc.1` 仅作失败证据，不得作为 stable 回滚目标。

## 完成判定

Phase 8 只有同时满足以下条件才能 Completed：

- 两项用户授权均有证据；
- Windows canary、task/reload/multi-project、Widget、proposal/commit/send 全通过；
- 三类 Tauri/Widget 冲突都有真实宿主证据；
- 生命周期、状态清理、重装、数据恢复通过；
- canary 与 stable tag/Release 固定、可下载、可校验、可回滚；
- repo marketplace 安装的是固定 stable 资产；
- 项目 hash 守卫闭合，无遥测或远程业务请求；
- `README.md`、`PROGRESS.md`、`HANDOFF.md`、active/completed 索引与证据 JSON 同步；
- 完整验收命令通过，最终 diff 只含 Phase 8 范围。
