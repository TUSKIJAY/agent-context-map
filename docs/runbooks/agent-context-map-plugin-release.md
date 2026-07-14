# Agent Context Map 插件 Phase 8 Canary、发布与回滚 Runbook

## 状态与授权

- 状态：Prepared / 未执行。
- 权威计划：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md` Phase 8。
- 当前候选：`0.3.0-rc.1`；release tree SHA-256 `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e`。
- 当前固定候选来源：commit `28425f8`、workflow run `29327685652`、artifact `8308656602`。
- 本 runbook 的创建不授权真实 Codex 安装、marketplace、Git tag、GitHub Release 或 stable 发布。
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
  --expected-version 0.3.0-rc.1 `
  --expected-tree-sha256 2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e
```

必须得到 13 files、12 checksum entries。失败即停止，不得安装。

## Gate 2：一次性 Windows Canary

仅在用户批准后执行：

1. 创建脱敏配置备份和测试项目 hash 清单；不得复制 auth token 到仓库。
2. 创建获批的 repo marketplace 文件，重启 Codex Desktop。
3. 从 repo marketplace 安装 `agent-context-map 0.3.0-rc.1`，记录实际 cache 版本目录。
4. 新建 task A1、A2、B1：A1/A2 绑定项目 A，B1 绑定项目 B；验证 session 隔离、project fingerprint 和 active document。
5. 重载 A1，再新建 A3；旧 Widget instance 必须 superseded，不能 ready/commit/send。
6. 在 A1 打开原生 Widget：React mounted、project hydrated、canvas first frame 三项齐全才算 ready。
7. 创建 proposal，分别验证 reject 与 accept；accept 前正式 `.acm` hash 不变，accept 后仅目标文档产生可解释变更。
8. 执行 selected、related、execution 三种 send preview；没有当前 Widget gesture 时不得发送，二次确认后只发送一次到当前 task。
9. 复核模型参数、额外 writable dir、旧 task/instance、stale revision 均不能改变授权项目。
10. 记录 plugin Node 进程网络连接；不得出现远程业务请求、遥测或非预期 listener。

任何一步失败都触发 Windows 停止规则，不进入修复重跑。

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

- tag：`plugin-v0.3.0-rc.1`；
- tag 指向产生已验证固定资产的 commit；
- GitHub Release 标记 prerelease；
- 上传 `agent-context-map-plugin-0.3.0-rc.1.zip`、外层 `.sha256`、SBOM/依赖清单；
- 下载 Release 资产并重复 standalone verification，不能只验证 Actions 临时 artifact。

### Stable

- 把 manifest 与 CHANGELOG 固定为 `0.3.0`；
- 重新执行 Phase 7 完整 release-candidate Gate；Windows 若失败，按停止规则终止；
- 通过真实升级/回滚/卸载恢复后创建 `plugin-v0.3.0`；
- GitHub Release 不指向 `main`/`latest` 浮动来源；
- repo marketplace 只安装已验证的 `0.3.0` 解压目录；
- 至少保留 `0.3.0-rc.1` 作为前一个可回滚资产。

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
