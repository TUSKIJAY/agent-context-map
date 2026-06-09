# 新 session prompt：对接 agy SDK 到 Agent Context Map Co-edit Mode

你现在接手项目：

```text
C:\Users\LENOVO\Desktop\工作\星际之门\LLM\project\agent思维导图
```

请先阅读并遵守：

```text
AGENTS.md
PROJECT_MAP.md
HANDOFF.md
```

开工前必须执行 Git 外置检查：

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
```

期望：

```text
show-toplevel => C:/Users/LENOVO/Desktop/工作/星际之门/LLM/project/agent思维导图
git-dir       => D:/git-stores/stargate/LLM_project_agent思维导图.git
branch        => codex/agy_agent
```

## 背景

当前项目已经完成「Agent 协作编辑 / Co-edit Mode」前端 mock：

- 顶部有 `Agent 协作` 主按钮。
- 右侧 tab 为 `Inspector / Agent / 建议变更 / 校验`。
- Agent tab 支持聊天输入、当前选中节点上下文、快捷动作。
- mock Agent 会生成 pending graph patch。
- 建议节点/建议关系在画布上以 AI 建议层渲染。
- 未采纳建议不会写入正式 `doc`，也不会污染保存、导出、Agent Diff。
- 采纳后才写入 `doc.nodes` / `doc.edges`。

当前源码改动尚未提交，主要文件：

```text
src/App.jsx
src/acm/data.js
src/acm/Panels.jsx
src/acm/FlowCanvas.jsx
```

## 本次目标

把当前 mock Agent 替换为真实 agy SDK / agy sidecar / MCP 调用的前端适配层。

不要大改 UI，不要引入后端服务，不要改变 ACM-MD v0.1 核心契约。

## 关键入口

当前 mock 入口在：

```text
src/App.jsx
  runMockAgent(text)
```

当前核心逻辑是：

```js
const patch = createMockAgentPatch(doc, baseNodeId, prompt);
setPendingAgentPatch(patch);
```

请新增一个清晰适配层，例如：

```text
src/acm/agentClient.js
```

建议导出：

```js
export async function requestAgentPatch({ doc, baseNodeId, prompt, selection }) {
  // call agy SDK / sidecar / MCP here
  // normalize response to pendingAgentPatch
}
```

然后把 `runMockAgent()` 改为 async，并替换为：

```js
const patch = await requestAgentPatch({ doc, baseNodeId, prompt, selection });
```

如果 agy SDK 当前不可用，请保留 mock fallback，并用 toast/状态明确提示当前走的是 mock。

## pendingAgentPatch 必须保持的结构

agy 返回结果需要被 normalize 成：

```js
{
  id,
  createdAt,
  source: "agy_sdk",
  prompt,
  summary,
  baseNodeId,
  operations: [
    { id, op: "add_node", status: "pending", node: {...} },
    { id, op: "add_edge", status: "pending", edge: {...} },
    { id, op: "update_node", status: "pending", nodeId, patch: {...} }
  ]
}
```

可复用的纯函数都在：

```text
src/acm/data.js
```

包括：

```text
previewAgentPatchDoc
agentPatchStats
updateAgentPatchOperation
applyAgentPatchOperations
rejectAgentPatchOperations
markAgentPatchOperations
```

## ACM-MD / 数据边界

非常重要：

- Agent 建议必须先作为 `pendingAgentPatch` / view state 存在。
- 未采纳建议不得写入正式 `doc.nodes` / `doc.edges`。
- 未采纳建议不得进入保存、导出、Agent Diff。
- 采纳后才写入正式 doc。
- AI 推断内容默认 `status: "suggested"`。
- 需要人工判断的内容 `status: "needs_validation"`。
- 不要把 AI 建议直接标为 `confirmed`。
- 不要修改 ACM-MD v0.1 核心协议；若确实要改协议，必须同步更新：

```text
doc/03-ACM-MD格式规范指导文件.md
```

## 建议实现步骤

1. 阅读 `src/App.jsx` 中 `runMockAgent()`、`pendingAgentPatch` 状态、`AgentPanel`/`SuggestionsPanel` 接入。
2. 阅读 `src/acm/data.js` 中 pending patch 纯函数和 `createMockAgentPatch()` 输出结构。
3. 新增 `src/acm/agentClient.js`，封装 agy 调用与返回值 normalization。
4. 将 `runMockAgent()` 改为 `runAgent()` 或保持原名但内部调用 `requestAgentPatch()`。
5. 加入请求状态：例如 `agentBusy` / `agentError`，避免重复提交。
6. UI 上显示调用状态：同步中 / mock fallback / agy error。
7. 保持 mock fallback，方便无 SDK 环境继续开发 UI。
8. 修改源码后运行：

```powershell
npm run build
```

9. 如需本地验证，打开：

```text
http://127.0.0.1:5173/
```

目标流程：

```text
打开图谱 -> 点击 Agent 协作 -> 选中节点 -> 输入需求 -> agy 返回 pending patch -> 画布显示 AI 建议层 -> 建议变更 tab 可逐项采纳/拒绝 -> 采纳后进入正式 doc 并出现在 Agent Diff
```

## 最终汇报请说明

- 改了哪些文件。
- agy SDK 调用入口在哪里。
- 返回值如何 normalize 成 `pendingAgentPatch`。
- mock fallback 是否保留。
- 是否仍保证未采纳建议不污染正式 ACM-MD。
- `npm run build` 是否通过。
