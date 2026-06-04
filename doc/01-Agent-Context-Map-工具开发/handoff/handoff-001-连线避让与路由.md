# Handoff 001 · 连线避让与路由（Edge Routing）

状态：已实现，已完成浏览器冒烟验证
优先级：P1（影响图谱可读性）
目标读者：接手实现的 Agent（无需本次会话上下文，按本文件独立执行）

---

## 0. 背景与如何运行

Agent Context Map（ACM）是一个本地运行的 **Vite + React** 需求图谱编辑器，三栏布局：左栏（文档/模板/节点类型）· 中间图谱画布 · 右侧 Inspector / Agent Diff / 校验。画布支持平移、缩放、拖拽节点、从节点右侧圆点拖线建边。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 验证编译
```

关键文件：

```
src/acm/Canvas.jsx   # 图谱画布：节点卡片 + SVG 连线渲染（本次主要改这里）
src/App.jsx          # 状态、工具栏、autoLayout（自动布局，分层树形）
src/acm/data.js      # 受控词表、示例图谱、推断/校验/diff/导出（一般不用动）
```

画布坐标模型：每个节点有 `n.x / n.y`（图坐标，左上角）。节点卡片固定宽 **210px**，高度自适应（约 90px 左右），运行时由 `GraphCanvas` 内的 `sizesRef/sizes` + `ResizeObserver` 测量，用 `sz(id) => {w,h}` 读取（未测量时回退 `{w:210,h:92}`）。视口 `vp = {x, y, scale}`。

---

## 1. 问题描述

自动布局（层级树形）后，**部分连线会从节点卡片下方穿过、被卡片挡住**，看起来像断线/压线，图谱可读性差。本质是连线走的是"两端中心连线方向"的直接贝塞尔曲线，不躲避中间的卡片，也没有固定的进出端口。

期望对标 **Coze / Dify / XMind** 等思维导图/流程编排工具的连线表现：

- 连线从节点**固定端口**进出（左右流向图：源在右侧中点出、目标在左侧中点进），垂直于卡片边离开/进入；
- 连线走在**列与列之间的空白区**，不穿过任何卡片；
- 多条边共用同一侧时**分散错开**（fan-out），不重叠成一条；
- 反向边、同列边、竖直边也要合理绕行，不压卡片；
- 整体是平滑的正交/smoothstep 曲线，箭头、关系标签、虚线（suggested/needs_validation）样式保持现有规则。

---

## 2. 根因分析（定位到代码）

全部在 `src/acm/Canvas.jsx`：

1. **`boxAnchor(node, w, h, tx, ty)`（约 L9）**：把连接点取在"卡片边框上、指向对方中心"的交点。方向是 center→center，因此一条边会朝对方中心直奔，途中若有卡片就压过去。没有"端口"概念。
2. **`edgePath(a, b)`（约 L19）**：在两个锚点间画一条三次贝塞尔，控制点只按主轴（横/纵）外推 `k=clamp(40,160,|主轴差|*0.5)`。曲线大体是直连，不会为避让卡片而绕行。
3. **`edgeGeo`（约 L226）**：用上述两个函数算每条边的 `d`（path）和 `mid`（标签位置=两锚点中点）。`mid` 落在直连中点，跨多列时也可能落在某张卡片上。
4. **渲染层级（约 L246 / L294）**：SVG 连线在 DOM 中先渲染、节点卡片后渲染，二者都是绝对定位 → **卡片不透明，天然盖住经过它的连线**。所以即便不改路由，单靠 z-order 也救不回被卡片覆盖的线（卡片本就该在上层）。真正的解法是**让连线走在卡片之间的空白**。

> 注：连线的点击命中区是一条 `strokeWidth=16` 的透明粗 path（L264），改路由时这条命中 path 的 `d` 要和可见 path 用同一个，保持可点选。

---

## 3. 目标方案（建议分阶段，A 必做，B 必做，C 可选）

### Phase A — 固定端口 + smoothstep 路由（最大收益、最低风险）

参考 React Flow 的 `smoothstep`/floating edge 思路：

1. **按主导方向选择进出端口**（卡片四边中点之一）：比较两节点中心的 dx/dy。
   - |dx| ≥ |dy|：水平流向 → 源用**右**端口 `(x+w, y+h/2)`，目标用**左**端口 `(x, y+h/2)`；若目标在源左侧（反向边）则源用**左**、目标用**右**。
   - |dy| > |dx|：竖直流向 → 源用**下** `(x+w/2, y+h)`，目标用**上** `(x+w/2, y)`；反向同理用上/下。
2. **曲线垂直于卡片边离开/进入**：控制点沿端口法线方向外推一个 stub（建议 `stub = max(28, gap*0.4)`，`gap` 为两卡片在该轴上的间距），让曲线先直出一小段再弯，进入目标前也先对齐再直入。等价于"圆角正交（smoothstep）"或"两端法向加长的贝塞尔"。
3. 因为自动布局是左→右分列、列间有 ~110px 空白（COL_W=320，卡宽 210），用右出/左入的端口后，绝大多数跨列边自然落在列间空白，不再压卡片。

效果：层级布局下基本消除压线，观感接近 Dify/Coze。

### Phase B — 同侧多边分散 + 反向/同列/竖直边绕行（必做）

1. **Fan-out**：统计每个节点每条边在每一侧的数量与序号，把端口沿该边均匀错开（例如该侧有 k 条边，第 i 条的 y 偏移 = `(i - (k-1)/2) * spacing`，`spacing≈14`）。避免同一节点多条边挤成一条。
2. **反向边/同列边**：当目标在源左侧或同列时，直连必压卡片。改为从源侧端口出、绕到列间空白竖直走、再水平进目标（正交三段/五段折线，圆角）。
3. **竖直相邻**（同列上下）：用下/上端口短折线连接。

### Phase C — 障碍避让（可选，进一步逼近 XMind/ELK）

若 A+B 仍有个别穿插，二选一：

- **轻量自实现**：对每条边的直线段做"是否与其它卡片 bbox 相交"检测，命中则在最近的列间空白插入一段竖直绕行（贪心，单次足够）。bbox 用 `sz(id)` + `n.x/n.y` 计算，可加 `padding≈12`。
- **引入成熟库**（更彻底，但改动大）：用 `elkjs`（`org.eclipse.elk.layered` + `elk.edgeRouting=ORTHOGONAL`）同时算节点布局和**带避让的正交连线**，或整体迁移到 `@xyflow/react`（React Flow，自带端口、smoothstep、避让、拖拽/缩放）。**如选迁移 React Flow，需保留本项目所有既有交互与 ACM-MD 协议逻辑**（见 §5），评估成本后再定，不要贸然重写。

> 推荐路径：先做 **A + B**（纯手写、改动集中在 Canvas.jsx，风险小、收益大），验收后再决定是否需要 C。

---

## 4. 需要改的函数（落点）

`src/acm/Canvas.jsx`：

- 替换 `boxAnchor` → 新增 `portFor(node, w, h, side, offset)`：返回四边中点端口坐标（含 fan-out 偏移）。
- 新增 `chooseSides(a, sa, b, sb)`：按主导方向返回 `{fromSide, toSide}`。
- 改写 `edgePath(p1, p2, fromSide, toSide, stub)`：按端口法线生成 smoothstep/法向贝塞尔；同列/反向走正交折线。
- 改写 `edgeGeo`（L226）：先做 fan-out 分组统计，再对每条边算端口、路径、以及**新的标签锚点**（取路径在列间空白处的点，而不是两锚点中点；可用 path 的中段点或几何中点后做避让微调）。
- 连接拖拽的临时连线（`conn`，L272）也尽量复用新 `edgePath`，让预览与落库一致。

`src/App.jsx`：一般不需要改 `autoLayout`；如 Phase B 需要更宽的列间空白以容纳绕行，可适度增大 `COL_W`（当前 320）或行距 `ROW_H`（当前 132），改动需同时保证 fit 仍美观。

---

## 5. 约束 / 不要破坏（重要）

- **不得改动 ACM-MD v0.1 协议语义**：连线只是显示层，节点/边的 `type/status/from/to/id` 等数据不变；导出（ACM-MD / Agent Diff / JSON / Mermaid）结果不受影响。
- 保留全部既有交互：拖空白平移、滚轮缩放、拖节点、从右侧圆点**拖线建边**（连接落点检测 `document.elementFromPoint` 找 `.acm-node`）、点击边/节点选中、邻居高亮变暗（dim）、`typeFilter` 过滤。
- 保留连线**视觉规则**：按 `RELATION_META[type].c` 着色、`suggested`/`needs_validation` 用虚线 `6 5`、每种关系各自的箭头 `marker#arr-<type>`、选中态加粗+阴影。
- 保留**关系标签**（`RELATION_META[type].label` + suggested 时 `·建议`），但标签新位置要落在空白处、不压卡片、不压线难读（可加白底，现已是 `#ffffffea`）。
- 保留**边的点击命中**：透明粗 path 与可见 path 用同一 `d`。
- 保持性能：目标 100 节点 / 200 边内流畅（plan §10.4）。fan-out 与避让算法控制在 O(E) 或 O(E·N) 量级即可，避免每帧重算重布局。
- 不引入后端；保持纯本地前端。

---

## 6. 验收标准

功能/视觉：

1. 载入示例图谱（工具栏"打开"）或点"自动布局"后，**没有任何连线被卡片遮挡或穿过卡片内部**。
2. 连线从卡片边的固定端口垂直进出，走在列/行之间的空白里，整体像 Dify/Coze 的连线。
3. 同一节点同侧的多条边明显分开，不重叠成一条。
4. 反向边、同列上下边、竖直边都能绕开卡片。
5. 箭头、配色、虚线（suggested/needs_validation）、选中加粗、关系标签 均与改动前一致且不压卡片。
6. 切换三种卡片样式（Tweaks：bar/chip/minimal，高度略不同）连线仍贴合端口。
7. 拖拽节点时连线实时跟随且仍不压卡片；从圆点拖线的预览曲线风格与正式边一致。

工程：

8. `npm run build` 通过，浏览器控制台无新增报错/警告。
9. 不破坏 §5 列出的任何交互与导出。

### 验证步骤

```bash
npm run build && npm run dev
```

- 浏览器打开 5173，点工具栏"自动布局"，肉眼检查 §6.1–6.5。
- 也可用脚本读取每条边 path 与每张卡片 bbox，做"path 是否进入任一非端点卡片 bbox"的自动检测（命中数应为 0）。
- 拖动 goal_001、constraint_001（右侧批注节点）等，观察连线跟随且不压卡片。
- 切 Tweaks 卡片样式逐一复检。

---

## 7. 备注：当前自动布局（上下文）

`App.jsx` 的 `autoLayout` 已是**分层树形**：`contains` 为主干，父节点垂直居中于子节点；批注类节点（约束/风险/问题/接口/数据对象）放到所连节点右侧一列并对齐其高度；同列重叠按 `ROW_H` 下推。本 handoff 只需在此布局之上把**连线路由**做好；如布局本身还需微调（列距/行距/批注节点列位），可一并提出但属次要。

示例图谱（自描述）规模：18 节点 / 19 边，含 `contains / depends_on / references / constrains / impacts / needs_validation` 等关系，足够覆盖正反向、跨列、竖直等各类连线场景，作为主测样例。

---

## 8. 本次实施结果（2026-06-03）

本 handoff 对应目标已完成，当前实现不再采用硬直角总线，而是保留第一版较自然的圆弧/贝塞尔观感，并补上避让与稳定性。

已完成改动：

- `src/acm/Canvas.jsx`
  - 替换旧的 `boxAnchor + edgePath` 直连方案。
  - 新增固定端口选择 `chooseSides` 与端口定位 `portFor`。
  - 同侧多边按端口 fan-out 分散，根节点多条出线不再挤在同一点。
  - 路由使用自然贝塞尔圆弧候选，避免大直线、大直角框和管道感。
  - 对候选曲线采样，评分时同时考虑：
    - 是否穿过非端点节点卡片；
    - 是否与已选边产生同方向连续贴近重叠；
    - 形状复杂度。
  - 透明点击命中 path 与可见 path 使用同一 `d`。
  - 临时拖线预览复用圆弧风格。
  - 接入 `ResizeObserver` 测量节点卡片尺寸，修复刷新后首屏连线和点击后连线不一致的问题。
  - 在所有节点尺寸测齐后再显示边和标签，避免首帧用兜底尺寸绘制导致“自己动”。

- `src/App.jsx`
  - 左侧栏和右侧 Inspector 面板增加收起/展开按钮。
  - 面板收起后保留 30px 窄栏，可随时展开。
  - 双侧收起后画布可释放更多横向空间，浏览器冒烟中画布宽度达到 `1380px`。

保留行为：

- 未改 ACM-MD v0.1 协议字段和导出语义。
- 未新增后端、数据库或云依赖。
- 保留节点拖拽、画布平移/缩放、边点击选中、节点圆点拖线建边、关系虚线/颜色/箭头、标签展示。
- 关系类型、状态、Diff、导出逻辑不因连线路由改动而变化。

## 9. 已完成验证

已执行并通过：

```powershell
npm run build
```

浏览器冒烟验证通过：

- 页面加载正常，示例图谱为 18 个节点 / 19 条边。
- 路由检查：
  - `nodeHits: []`，没有边穿过节点卡片内部；
  - `segmentOverlaps: []`，没有同方向连续线段重叠；
  - 刷新后等待布局稳定再点击画布，19 条边 path 无变化，`changed: []`。
- 左右侧栏收起/展开通过：
  - 可收起左栏；
  - 可收起右栏；
  - 可重新展开；
  - 双侧收起后画布宽度约 `1380px`。
- 拖圆点建边通过：
  - 边数量从 19 增至 20；
  - 临时连线可见；
  - 新边被选中并落为待确认关系。
- 控制台错误：0。

截图证据保存在系统临时目录，最近一次为：

```text
C:\Users\LENOVO\AppData\Local\Temp\acm-final-smoke.png
C:\Users\LENOVO\AppData\Local\Temp\acm-no-jump-stable-after-click.png
```

## 10. 打包 exe 前注意事项

当前源码层面的前端构建已通过，但打包 exe 前请额外确认桌面壳配置：

- 当前 `package.json` 中已确认存在：
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
- 若准备按 plan 中 P5 绿色版 exe 规则打包，需要先确认项目内是否已有 Tauri 配置和脚本，例如：
  - `src-tauri/`
  - `tauri.conf.json`
  - `npm run tauri:build`
- 如果尚未接入 Tauri，本次连线路由和侧栏折叠改动只能证明 Web/Vite 前端可构建，不能直接证明 exe 产物可生成。
- 若已补齐 Tauri 配置，建议按 plan 约定执行：

```powershell
npm run tauri:build -- --no-bundle
```

绿色版验收仍建议记录：

```text
exe: output/portable/Agent Context Map/Agent Context Map.exe
构建时间: YYYY-MM-DD HH:mm
本次变更: 连线圆弧避让、线段重叠避让、刷新后连线稳定、左右侧栏可收起
```

打包后建议用 exe 再跑一轮人工冒烟：

- 双击 exe 打开主界面；
- 点击“自动布局”；
- 收起/展开左右侧栏；
- 点击画布确认连线不跳动；
- 拖动节点确认连线跟随；
- 从节点圆点拖线新建关系；
- 打开导出弹窗确认 ACM-MD / Diff / JSON / Mermaid 仍可生成。

## 11. 便携版 exe 打包完成记录（2026-06-03）

§10 预留的桌面壳此前为空缺，本次已补齐并产出首个 Windows 绿色版 exe。

新增桌面壳工程（Tauri v2）：

- `src-tauri/`（`tauri.conf.json` / `Cargo.toml` / `build.rs` / `src/main.rs` / `src/lib.rs` / `capabilities/default.json` / `icons/`）
  - `identifier`: `com.stargate.agent-context-map`
  - Cargo 包名: `agent-context-map`（release 二进制即 `agent-context-map.exe`）
  - 主窗口: 1280×860，最小 960×640，居中
  - `frontendDist: ../dist`，`beforeBuildCommand: npm run build`
- `package.json` 新增脚本：`tauri` / `tauri:dev` / `tauri:build`
- `.gitignore` 新增忽略：`src-tauri/target/`、`src-tauri/gen/`、`output/`（构建产物不入库）

构建与验收：

```text
命令: npm run tauri:build -- --no-bundle   （未打 MSI/NSIS/zip，仅 release exe）
编译: Rust 1.95 / Tauri CLI 2.11.2，release 编译用时约 2m23s，exit 0
产物: src-tauri/target/release/agent-context-map.exe (≈9.48 MB)
交付: output/portable/Agent Context Map/Agent Context Map.exe（+ version.txt）
构建时间: 2026-06-03 15:57
WebView2 Runtime: 本机已安装 v148.0.3967.96（P5 依赖满足）
```

exe 冒烟（自动）已通过：

- 进程正常启动，主窗口标题 `Agent Context Map`；
- WebView2 子进程被拉起（前端页面已加载渲染）；
- 干净退出，无启动即崩溃。

仍建议人工补跑 §10 末尾的交互冒烟清单（自动布局 / 侧栏收展 / 连线不跳动 / 拖线建边 / 导出弹窗）。

待办（下一手）：

- 本次仅打通桌面壳与 exe 产物，尚未接入 Tauri 本地文件/持久化能力（plan P5 的「可恢复工作现场」仍是 Web 侧浏览器存储）。
- 以上改动尚未提交 Git，由用户确认后再 commit。
