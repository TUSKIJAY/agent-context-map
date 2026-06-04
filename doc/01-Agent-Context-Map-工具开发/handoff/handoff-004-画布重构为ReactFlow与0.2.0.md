# Handoff 004 · 画布重构为 React Flow（专业图渲染）与 0.2.0

状态：画布渲染层已从手搓 Canvas 重构为 **React Flow**；布局引擎换 **dagre**；新增点击高亮 / 连线样式切换 / PNG·SVG 导出；版本 **0.1.0 → 0.2.0**，绿色版 exe 已重出。改动**尚未提交 Git**。
优先级：P1（承接工具当前状态，下一手的统一入口；本文件取代 handoff-003 作为"现在是什么"）
日期：2026-06-04
目标读者：接手的 Agent（按本文件独立执行，无需本次会话上下文）

> 前瞻交接。历史细节见同目录：[handoff-001 连线避让与路由]、[handoff-002 本地持久化与启动页]、[handoff-003 当前状态与下一步（0.1.0 基线）]。
> 本文件只记录"自 003 以来的变化 + 现在的状态 + 下一步"。

---

## 0. 一句话现状

Agent Context Map：本地 **Vite + React + Tauri v2** 逻辑上下文图谱编辑器（ACM-MD v0.1），现已是 **0.2.0** 绿色版 exe。本会话把图谱画布从纯手搓 SVG 渲染**整体换成行业标准的 React Flow**，并加了点击高亮、连线样式切换、整图导出 PNG/SVG。数据模型 / 校验 / 导入导出 / Inspector / 持久化 / 启动页**一律保留不动**。

## 1. 本会话做了什么（自 0.1.0 起）

1. **画布渲染层重构为 React Flow（`@xyflow/react` v12）** —— 新增 `src/acm/FlowCanvas.jsx` 取代手搓的 `src/acm/Canvas.jsx`。
   - 自定义 ACM 节点卡片（沿用原配色/图标/状态点）、平移缩放、小地图、缩放控件。
   - 连线：带箭头 + 关系标签 + 状态着色；默认 **bezier 曲线**（自动分散、缓解重叠），可一键切 **直角(smoothstep)**。
   - `App.jsx` 画布 import 改指向 `FlowCanvas.jsx`，并多传一个 `rankdir`。其余 props 契约不变（`onSelect/onMoveNode/onCreateEdge/fitSignal/typeFilter`）。
2. **布局引擎换 dagre（`@dagrejs/dagre`）** —— `data.js` 的 `layoutGraph()` 改用 dagre 分层布局（Sugiyama，自动减少连线交叉）。手搓旧实现改名 `layoutGraphLegacy()` 保留、`packBalanced()` 随之闲置（**均为死代码，待清理**）。
   - 工具栏加 **LR/TB 方向切换**按钮（「⇄ 横向 / ⇅ 纵向」），`App.jsx` 持 `rankdir` 状态。实测交叉数从手搓布局的 74 → dagre 的 27。
3. **右栏自动让位** —— 无选中对象时右栏（Inspector）自动收起，把画布宽度还回来；选中节点 / 点「校验」时自动展开。`App.jsx` 一个 `useEffect`。
4. **点击高亮关联** —— 选中节点 → 它 + 直接邻居节点 + 连接边高亮，其余淡出（focus 子图）。纯 `FlowCanvas.jsx` 内部，按 `selection` 派生。
5. **整图导出 PNG / SVG** —— 画布右上角面板按钮，`html-to-image` 渲染整张图（非可见区，按节点包围盒计算）。文件名取图谱标题。
6. **修复若干** —— 见 §2。

## 2. 本会话修掉的坑（接手须知，别踩回去）

- **fit 负缩放导致图消失**：旧 `Canvas.jsx` 的 fit 公式 `(width - pad*2)/span`，当画布比留白还窄（两栏全开+窗口窄）时分子变负 → scale 为负 → 整图翻转缩没。已在 fit 里对可用空间和最终 scale 设正数下限。（该文件已被 React Flow 取代，但教训留底。）
- **React 多副本 / Invalid hook call**：React Flow 在 Vite dev 下命中"多个 React 实例"，导致**连线 0 渲染**。已在 `vite.config.js` 加 `resolve.dedupe:['react','react-dom']` + `optimizeDeps.include`。**改完依赖后若再现，先清 `node_modules/.vite` 再重启 dev。**
- **html-to-image 导出 SecurityError**：它想内联跨域 Google Fonts 样式表的 cssRules 触发 CORS 报错、导出中止。已加 `skipFonts:true`（字体已在页面加载，光栅化照常正确）。
- **预览浏览器易卡死（非 app 缺陷）**：本会话用的 headless 预览浏览器在反复 reload/resize 后会卡死 React Flow 的 ResizeObserver，表现为"节点在、边 0、viewport 不 fit"。**全新标签页/重启后恢复正常**。真实桌面/用户浏览器无此问题。排查"边不渲染"时先换全新上下文复测，别误判成代码 bug。

## 3. 依赖与版本变化

- 新增运行时依赖：`@dagrejs/dagre`、`@xyflow/react`、`html-to-image`（已写入 `package.json` + `package-lock.json`）。
- 试过又移除：`elkjs`（1.5MB，dagre 已够，未采用）。
- 版本 **0.1.0 → 0.2.0**：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 三处同步。
- 包体增大：前端 bundle 因 React Flow 涨到约 gzip 180KB+，构建有"chunk > 500KB"**告警（非错误）**，本地工具可接受；要消除可上 `manualChunks` 代码分割。

## 4. 如何运行与构建（同 003，命令未变）

```powershell
npm install
npm run dev          # 浏览器调试 (http://localhost:5173)，持久化走 localStorage 兜底
npm run build        # 纯前端构建校验
npm run tauri:dev    # 桌面壳里跑（真 SQLite）
npm run tauri:build -- --no-bundle   # 出绿色版 release exe（不打 MSI/NSIS/zip）
```

构建产物与交付：

```text
release 二进制: src-tauri/target/release/agent-context-map.exe   (0.2.0)
绿色版交付:     output/portable/Agent Context Map/Agent Context Map.exe  (+ version.txt)
本地数据库:     %APPDATA%\com.stargate.agent-context-map\acm.db
运行依赖:       Windows WebView2 Runtime（Win11 自带）
```

## 5. 验证现状（本会话，DOM 实测为准）

- 前端 `npm run build`：每次改动后均通过。
- React Flow 画布（全新预览上下文实测）：37 节点 / **49 边全渲染**、viewport 正常 fit、bezier 曲线生效。
- 点击高亮：选中节点 → 相关高亮、22 节点 + 35 边淡出。
- 导出：点 PNG → 生成约 2.4MB `data:image/png` 数据 URL，文件名自动取标题；SVG 同路径。
- LR/TB 切换：重排后 49 边跟随，包围盒 0.46(LR) ↔ 5.78(TB)。
- **exe（本次）**：`npm run tauri:build -- --no-bundle` 出 0.2.0 release exe（构建结果见交付目录；**双击冷启动 + 原生导入/另存弹窗仍需人工点一次**，无桌面 UI 自动化）。

## 6. 建议下一步（按优先级）

1. **连线零重叠的最终拍板**：当前 bezier 曲线**大幅减少**重叠但不保证数学零重叠。若用户要"严格正交 + 零重叠"，上 **ELK 正交布线**（重引 `elkjs`，写异步 `elkLayout` 返回节点位置 + 边拐点，配自定义边组件按拐点画线）。这是已识别但未做的较重一步。
2. **清死代码**：`src/acm/Canvas.jsx`（已无引用）、`data.js` 的 `layoutGraphLegacy()` + `packBalanced()`（dagre 上位后闲置）。提交前删，保持干净。
3. **rankdir 未持久化**：重载后方向按钮回默认 LR（节点位置仍是上次落库的）。要的话像视口一样按文档存（`store.setAppState('rankdir:'+docId, ...)`）。
4. **PROJECT_MAP.md 需同步**：画布入口已从 `Canvas.jsx` 变 `FlowCanvas.jsx`，布局从手搓变 dagre。修改入口表（本文件 §9）已更新，PROJECT_MAP 待同步。
5. 承接 handoff-003 §4 仍未做项：快照历史 UI、窗口几何恢复（`tauri-plugin-window-state`）、保存回源文件、任务拆解大师端到端。

## 7. 暂缓 / 已知缺口

- 仍不做安装包（MSI/NSIS/zip），只出 `--no-bundle` 绿色版 exe（plan §5.3）。
- 节点是大图（37 节点 / 49 边）本身就需缩放/平移，任何引擎都不能让它在小窗口里全看清——规模决定，非 bug。
- 旧 `Canvas.jsx` 暂留作参考，但已不参与渲染（import 指向 `FlowCanvas.jsx`）。
- 承接 003 §5 其余项（改名不计 diff、dev 用 localStorage 兜底）不变。

## 8. 接手检查清单

- [ ] **大量改动尚未提交 Git**。本会话改/增：`src/acm/FlowCanvas.jsx`(新)、`src/App.jsx`、`src/acm/data.js`、`src/acm/Canvas.jsx`(fit 修复，现已弃用)、`vite.config.js`、`package.json`/`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`(+`Cargo.lock`)、本 handoff。先与用户确认再 `git add <明确文件>`（勿 `git add -A`）。
- [ ] Git 外置规则核对：`git rev-parse --git-dir` 应指向 `D:/git-stores/stargate/LLM_project_agent思维导图.git`。
- [ ] 构建产物已 gitignore：`src-tauri/target/`、`src-tauri/gen/`、`output/`、`dist/`、`node_modules/`、`node_modules/.vite/`。不要提交二进制。
- [ ] 改源码后至少 `npm run build`；动桌面壳/插件/版本后 `npm run tauri:build -- --no-bundle`。
- [ ] 出 exe 后人工冒烟：双击冷启动 → 导入 `.acm.md` → 编辑 → 导出"保存到文件"（原生弹窗没法自动点）。

## 9. 修改入口速查（已更新画布/布局条目）

完整文件职责见 `PROJECT_MAP.md`（待同步）。关键入口：

| 改什么 | 看哪 |
| --- | --- |
| **画布渲染 / 节点卡片 / 连线样式 / 高亮 / 导出** | `src/acm/FlowCanvas.jsx`（React Flow） |
| **自动布局（dagre 分层 / LR·TB）** | `src/acm/data.js` 的 `layoutGraph()` |
| React 去重 / dev 依赖预打包 | `vite.config.js` |
| 启动恢复 / 视图切换 / 工具栏（含方向切换） / 右栏自动收起 / 导出弹窗 | `src/App.jsx` |
| ACM-MD 导入解析 / 导出 / 校验 / Diff / 受控词表 | `src/acm/data.js` |
| 本地读写 / 自动保存 / 最近列表 / 视口 | `src/storage/store.js` |
| 文件打开 / 另存 | `src/storage/files.js` |
| 开始页 | `src/acm/Home.jsx` |
| 侧栏 / Inspector / Diff / 校验面板 | `src/acm/Panels.jsx` |
| 表结构 / 迁移 / 插件注册 | `src-tauri/src/lib.rs` |
| 桌面窗口 / 打包配置 / 版本 | `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` |
| 权限（sql/dialog/fs） | `src-tauri/capabilities/default.json` |
| ~~画布交互 / 连线路由（旧手搓，已弃用）~~ | ~~`src/acm/Canvas.jsx`~~ |

## 10. 不要破坏（边界）

- 不改 ACM-MD v0.1 协议字段与导出语义；图谱正文在 SQLite 里按整份 JSON 存（`body`）即保真，勿拆表。
- `store.saveBody`（自动保存）**绝不可覆盖 `base_snapshot`**，否则 diff 基线被冲掉；推进基线只走 `saveBaseline`（手动保存）。
- 纯本地：不引入后端/数据库服务/云依赖。
- React Flow 渲染层可改，但保留既有 props 契约（`onSelect/onMoveNode/onCreateEdge/fitSignal/typeFilter/rankdir`），别牵动 `App.jsx` 的状态/持久化/导出逻辑。
