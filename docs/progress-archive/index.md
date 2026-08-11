# Progress Archive Index

本目录保存从 `PROGRESS.md` / `HANDOFF.md` 启动路径迁出的长期历史。归档不改变当前状态，也不授予任何计划权限。

| Period or topic | Source coverage | Archive path | Current-state redirect |
| --- | --- | --- | --- |
| 2026-06 pre-harness product and layout history | Dagre/ELK、子树与组折叠、分组容器、导出不变量 | [2026-06-pre-harness-history.md](2026-06-pre-harness-history.md) | `../../PROGRESS.md` / `../../HANDOFF.md` |

## Archive Rules

- 触发条件：`python3 scripts/check-startup-doc-budget.py --root .` 报告 `attention_required=true`，或人工判断内容开始挤占启动上下文。`PROGRESS.md` / `HANDOFF.md` 迁移历史，`AGENTS.md` / `INSTRUCTIONS.md` 压缩稳定规则，`PROJECT_MAP.md` 则拆分详细子系统地图；不要等到 hard limit 才处理。
- 迁移步骤：把最老的已完成/历史条目按主题或时间段迁入 `docs/progress-archive/<topic-or-period>.md`；在本索引表登记一行；在 `PROGRESS.md` 的 Historical Redirects 留一行指针。
- 保存原始事实、日期和证据路径，不把归档摘要当作当前真相。
- `HANDOFF.md` 是整体重写的会话书签，本身不产生历史；历史会话叙述若有保留价值，从 `PROGRESS.md` 迁入本目录。
