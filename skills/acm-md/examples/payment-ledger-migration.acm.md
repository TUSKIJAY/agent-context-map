# Agent Context Map: 支付账本数据库零停机迁移

这份示例用于架构评审与上线闸门。Structure 展示迁移工作包，Dependency 显示双写、回填、核对与切换顺序，Inquiry 汇总仍需证据支持的风险、假设与回滚决策。

```acm
schema_version: "acm-md/0.1"
doc_id: "payment_ledger_zero_downtime_migration"
meta:
  title: "支付账本数据库零停机迁移"
  created_by: "payments-architecture-review"
  created_at: "2026-08-12"
  updated_at: "2026-08-12"
  purpose: "在不中断记账且不丢失审计链的前提下，把支付账本迁移到新数据库集群。"
  source: "migration-readiness-review"
nodes:
  - { id: "goal_zero_downtime", type: "Goal", title: "零停机迁移支付账本", status: "confirmed", description: "迁移期间持续接受记账请求，账目完整且可在十分钟内回滚。", source: "architecture_charter", confidence: 0.98, priority: "P0", tags: ["支付", "迁移", "零停机"] }
  - { id: "module_change_capture", type: "Module", title: "双写与变更捕获", status: "confirmed", description: "在源库继续服务时把新写入可靠复制到目标库。", source: "migration_design", confidence: 0.96, priority: "P0", tags: ["双写", "CDC"] }
  - { id: "module_backfill_verify", type: "Module", title: "历史回填与一致性核对", status: "confirmed", description: "分片回填历史账目并持续比对余额与流水。", source: "migration_design", confidence: 0.96, priority: "P0", tags: ["回填", "核对"] }
  - { id: "module_cutover", type: "Module", title: "灰度切读与回滚", status: "confirmed", description: "逐步把读流量切到目标库，并在明确阈值下自动回退。", source: "cutover_runbook", confidence: 0.95, priority: "P0", tags: ["灰度", "回滚"] }
  - { id: "feature_idempotent_dual_write", type: "Feature", title: "幂等双写记账", status: "confirmed", description: "使用业务事件 ID 保证源库与目标库重复写入不产生重复账目。", source: "migration_design", confidence: 0.94, priority: "P0", tags: ["幂等", "双写"] }
  - { id: "feature_cdc_replay", type: "Feature", title: "变更日志断点续传", status: "confirmed", description: "记录消费位点并支持故障后从最后确认位置恢复。", source: "migration_design", confidence: 0.93, priority: "P0", tags: ["CDC", "恢复"] }
  - { id: "feature_partition_backfill", type: "Feature", title: "按账户分片限速回填", status: "confirmed", description: "控制回填并发，避免影响源库线上延迟。", source: "backfill_plan", confidence: 0.94, priority: "P0", tags: ["分片", "限速"] }
  - { id: "feature_ledger_reconcile", type: "Feature", title: "流水与余额双层核对", status: "confirmed", description: "同时核对逐笔事件、账户余额和日终总账。", source: "finance_control", confidence: 0.97, priority: "P0", tags: ["对账", "完整性"] }
  - { id: "feature_shadow_read", type: "Feature", title: "影子读比对", status: "confirmed", description: "正式响应仍来自源库，同时异步比较目标库查询结果。", source: "cutover_runbook", confidence: 0.93, priority: "P0", tags: ["影子流量", "灰度"] }
  - { id: "feature_read_canary", type: "Feature", title: "百分之一读流量灰度", status: "confirmed", description: "先切低风险租户并观察错误率、延迟和结果差异。", source: "cutover_runbook", confidence: 0.92, priority: "P0", tags: ["canary", "读切换"] }
  - { id: "feature_rollback_switch", type: "Feature", title: "十分钟内回切源库", status: "confirmed", description: "保持源库写入与必要索引，回滚时无需数据逆迁移。", source: "rollback_plan", confidence: 0.95, priority: "P0", tags: ["回滚", "开关"] }
  - { id: "feature_audit_dashboard", type: "Feature", title: "迁移审计与闸门看板", status: "confirmed", description: "汇总复制延迟、差异数、回填进度与切换状态。", source: "operations_requirement", confidence: 0.92, priority: "P1", tags: ["审计", "可观测"] }
  - { id: "data_ledger_event", type: "DataEntity", title: "不可变账本事件", status: "confirmed", description: "以事件 ID、账户、币种、金额、方向和发生时间记录账目。", source: "ledger_schema", confidence: 0.98, tags: ["账本", "事件"] }
  - { id: "data_account_balance", type: "DataEntity", title: "账户余额快照", status: "confirmed", description: "由账本事件派生，用于在线查询与日终核对。", source: "ledger_schema", confidence: 0.97, tags: ["余额", "快照"] }
  - { id: "data_migration_checkpoint", type: "DataEntity", title: "迁移检查点", status: "confirmed", description: "记录分片回填水位、CDC 位点和最近核对结果。", source: "migration_design", confidence: 0.96, tags: ["检查点", "恢复"] }
  - { id: "api_ledger_write", type: "API", title: "记账写入接口", status: "confirmed", description: "接受幂等事件并返回唯一账本序号。", source: "payments_api", confidence: 0.98, tags: ["写入", "幂等"] }
  - { id: "api_ledger_read", type: "API", title: "余额与流水查询接口", status: "confirmed", description: "在灰度期间按租户路由到源库或目标库。", source: "payments_api", confidence: 0.97, tags: ["读取", "路由"] }
  - { id: "constraint_no_event_loss", type: "Constraint", title: "任何已确认事件不得丢失或重复", status: "confirmed", description: "源库与目标库的业务事件集合必须逐项一致。", source: "finance_control", confidence: 1.0, priority: "P0", tags: ["完整性", "审计"] }
  - { id: "constraint_latency_budget", type: "Constraint", title: "双写新增延迟 P99 小于十五毫秒", status: "confirmed", description: "超过预算时停止扩大灰度并保留源库主路径。", source: "service_slo", confidence: 0.99, priority: "P0", tags: ["SLO", "延迟"] }
  - { id: "constraint_rollback_window", type: "Constraint", title: "切换后保留七十二小时可回滚窗口", status: "confirmed", description: "窗口内不执行破坏源库回切能力的 schema 变更。", source: "risk_committee", confidence: 1.0, priority: "P0", tags: ["回滚", "窗口"] }
  - { id: "risk_replication_lag", type: "Risk", title: "复制延迟造成读到旧余额", status: "needs_validation", description: "流量峰值或目标库抖动可能扩大 CDC 延迟。", source: "load_test_review", confidence: 0.82, tags: ["复制延迟", "一致性"] }
  - { id: "risk_hot_account", type: "Risk", title: "热点账户导致分片回填阻塞", status: "needs_validation", description: "高频账户可能在回填过程中持续产生大量变更。", source: "backfill_review", confidence: 0.78, tags: ["热点", "回填"] }
  - { id: "risk_irreversible_schema", type: "Risk", title: "过早升级 schema 破坏回滚", status: "needs_validation", description: "目标库新字段若进入主写路径可能无法回放到源库。", source: "schema_review", confidence: 0.86, tags: ["schema", "回滚"] }
  - { id: "assumption_target_capacity", type: "Assumption", title: "目标集群可承受两倍峰值流量", status: "needs_validation", description: "容量结论需要以生产形态压测而非开发环境推断。", source: "capacity_plan", confidence: 0.7, tags: ["容量", "压测"] }
  - { id: "question_reconcile_threshold", type: "Question", title: "允许多少短暂差异后自动停止灰度？", status: "needs_validation", description: "需要区分复制未到达和不可恢复的数据差异。", source: "cutover_review", confidence: 0.75, tags: ["阈值", "闸门"] }
  - { id: "question_cutover_time", type: "Question", title: "切换窗口是否必须避开日终清算？", status: "needs_validation", description: "需评估清算批次与回填、核对资源竞争。", source: "finance_operations", confidence: 0.72, tags: ["窗口", "清算"] }
  - { id: "decision_abort_threshold", type: "Decision", title: "不可恢复差异大于零立即停止灰度", status: "confirmed", description: "复制延迟可等待追平；业务事件缺失或重复必须立即回退。", source: "risk_committee", confidence: 0.98, tags: ["停止条件", "数据完整性"] }
  - { id: "decision_avoid_settlement", type: "Decision", title: "首次切换避开日终清算窗口", status: "confirmed", description: "选择低峰时段，减少批处理竞争和故障定位变量。", source: "finance_operations", confidence: 0.95, tags: ["切换窗口", "低峰"] }
  - { id: "task_production_load_test", type: "Task", title: "完成生产形态双倍峰值压测", status: "confirmed", description: "覆盖双写、CDC、回填、影子读同时运行的最坏组合。", source: "readiness_checklist", confidence: 0.93, priority: "P0", tags: ["压测", "容量"] }
  - { id: "task_rollback_drill", type: "Task", title: "演练灰度中断与十分钟回切", status: "confirmed", description: "记录操作者、指令、观察点和恢复耗时。", source: "readiness_checklist", confidence: 0.95, priority: "P0", tags: ["演练", "回滚"] }
edges:
  - { id: "edge_goal_capture", from: "goal_zero_downtime", to: "module_change_capture", type: "contains", status: "confirmed", reason: "零停机需要持续复制新写入。", source: "architecture_charter", confidence: 0.99 }
  - { id: "edge_goal_backfill", from: "goal_zero_downtime", to: "module_backfill_verify", type: "contains", status: "confirmed", reason: "迁移需要补齐并核对历史数据。", source: "architecture_charter", confidence: 0.99 }
  - { id: "edge_goal_cutover", from: "goal_zero_downtime", to: "module_cutover", type: "contains", status: "confirmed", reason: "迁移需要安全切读与回滚。", source: "architecture_charter", confidence: 0.99 }
  - { id: "edge_capture_dual", from: "module_change_capture", to: "feature_idempotent_dual_write", type: "contains", status: "confirmed", reason: "双写属于变更捕获工作包。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_capture_cdc", from: "module_change_capture", to: "feature_cdc_replay", type: "contains", status: "confirmed", reason: "CDC 属于变更捕获工作包。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_backfill_partition", from: "module_backfill_verify", to: "feature_partition_backfill", type: "contains", status: "confirmed", reason: "分片回填属于历史迁移。", source: "backfill_plan", confidence: 0.98 }
  - { id: "edge_backfill_reconcile", from: "module_backfill_verify", to: "feature_ledger_reconcile", type: "contains", status: "confirmed", reason: "一致性核对属于历史迁移闸门。", source: "finance_control", confidence: 0.99 }
  - { id: "edge_cutover_shadow", from: "module_cutover", to: "feature_shadow_read", type: "contains", status: "confirmed", reason: "影子读是切换前验证。", source: "cutover_runbook", confidence: 0.97 }
  - { id: "edge_cutover_canary", from: "module_cutover", to: "feature_read_canary", type: "contains", status: "confirmed", reason: "读灰度是正式切换步骤。", source: "cutover_runbook", confidence: 0.97 }
  - { id: "edge_cutover_rollback", from: "module_cutover", to: "feature_rollback_switch", type: "contains", status: "confirmed", reason: "回切能力属于切换工作包。", source: "rollback_plan", confidence: 0.99 }
  - { id: "edge_cutover_dashboard", from: "module_cutover", to: "feature_audit_dashboard", type: "contains", status: "confirmed", reason: "看板承载切换闸门。", source: "operations_requirement", confidence: 0.96 }
  - { id: "edge_cutover_load_test", from: "module_cutover", to: "task_production_load_test", type: "contains", status: "confirmed", reason: "压测是切换前任务。", source: "readiness_checklist", confidence: 0.96 }
  - { id: "edge_cutover_drill", from: "module_cutover", to: "task_rollback_drill", type: "contains", status: "confirmed", reason: "回滚演练是切换前任务。", source: "readiness_checklist", confidence: 0.98 }
  - { id: "edge_dual_write_api", from: "feature_idempotent_dual_write", to: "api_ledger_write", type: "depends_on", status: "confirmed", reason: "双写由记账接口执行。", source: "payments_api", confidence: 0.98 }
  - { id: "edge_dual_write_event", from: "feature_idempotent_dual_write", to: "data_ledger_event", type: "references", status: "confirmed", reason: "事件 ID 是幂等键。", source: "ledger_schema", confidence: 0.99 }
  - { id: "edge_cdc_checkpoint", from: "feature_cdc_replay", to: "data_migration_checkpoint", type: "references", status: "confirmed", reason: "CDC 位点写入迁移检查点。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_backfill_checkpoint", from: "feature_partition_backfill", to: "data_migration_checkpoint", type: "references", status: "confirmed", reason: "回填水位写入同一检查点。", source: "backfill_plan", confidence: 0.98 }
  - { id: "edge_reconcile_event", from: "feature_ledger_reconcile", to: "data_ledger_event", type: "references", status: "confirmed", reason: "逐笔核对读取不可变事件。", source: "finance_control", confidence: 0.99 }
  - { id: "edge_reconcile_balance", from: "feature_ledger_reconcile", to: "data_account_balance", type: "references", status: "confirmed", reason: "余额核对读取快照。", source: "finance_control", confidence: 0.99 }
  - { id: "edge_shadow_reconcile", from: "feature_shadow_read", to: "feature_ledger_reconcile", type: "depends_on", status: "confirmed", reason: "影子结果使用核对逻辑比较。", source: "cutover_runbook", confidence: 0.96 }
  - { id: "edge_shadow_read_api", from: "feature_shadow_read", to: "api_ledger_read", type: "depends_on", status: "confirmed", reason: "影子读通过统一查询接口执行。", source: "payments_api", confidence: 0.97 }
  - { id: "edge_canary_shadow", from: "feature_read_canary", to: "feature_shadow_read", type: "depends_on", status: "confirmed", reason: "影子读稳定后才进入正式灰度。", source: "cutover_runbook", confidence: 0.98 }
  - { id: "edge_dashboard_checkpoint", from: "feature_audit_dashboard", to: "data_migration_checkpoint", type: "references", status: "confirmed", reason: "看板展示迁移检查点。", source: "operations_requirement", confidence: 0.96 }
  - { id: "edge_no_loss_constrains_dual", from: "constraint_no_event_loss", to: "feature_idempotent_dual_write", type: "constrains", status: "confirmed", reason: "双写不得丢失或重复事件。", source: "finance_control", confidence: 1.0 }
  - { id: "edge_no_loss_constrains_reconcile", from: "constraint_no_event_loss", to: "feature_ledger_reconcile", type: "constrains", status: "confirmed", reason: "核对必须证明事件集合一致。", source: "finance_control", confidence: 1.0 }
  - { id: "edge_latency_constrains_dual", from: "constraint_latency_budget", to: "feature_idempotent_dual_write", type: "constrains", status: "confirmed", reason: "双写受在线延迟预算约束。", source: "service_slo", confidence: 1.0 }
  - { id: "edge_window_constrains_rollback", from: "constraint_rollback_window", to: "feature_rollback_switch", type: "constrains", status: "confirmed", reason: "七十二小时内必须保持回切能力。", source: "risk_committee", confidence: 1.0 }
  - { id: "edge_lag_impacts_canary", from: "risk_replication_lag", to: "feature_read_canary", type: "impacts", status: "needs_validation", reason: "复制延迟会造成灰度读旧值。", source: "load_test_review", confidence: 0.84 }
  - { id: "edge_hot_impacts_backfill", from: "risk_hot_account", to: "feature_partition_backfill", type: "impacts", status: "needs_validation", reason: "热点账户会延长分片追平时间。", source: "backfill_review", confidence: 0.8 }
  - { id: "edge_schema_impacts_rollback", from: "risk_irreversible_schema", to: "feature_rollback_switch", type: "impacts", status: "needs_validation", reason: "不可逆 schema 会破坏回切。", source: "schema_review", confidence: 0.88 }
  - { id: "edge_threshold_validates_reconcile", from: "question_reconcile_threshold", to: "feature_ledger_reconcile", type: "needs_validation", status: "needs_validation", reason: "核对结果需要明确停止阈值。", source: "cutover_review", confidence: 0.8 }
  - { id: "edge_time_validates_cutover", from: "question_cutover_time", to: "module_cutover", type: "needs_validation", status: "needs_validation", reason: "切换时段需评估清算竞争。", source: "finance_operations", confidence: 0.78 }
  - { id: "edge_abort_answers_threshold", from: "decision_abort_threshold", to: "question_reconcile_threshold", type: "answers", status: "confirmed", reason: "不可恢复差异零容忍回答停止阈值。", source: "risk_committee", confidence: 0.98 }
  - { id: "edge_time_answers_question", from: "decision_avoid_settlement", to: "question_cutover_time", type: "answers", status: "confirmed", reason: "首次切换避开日终清算。", source: "finance_operations", confidence: 0.96 }
  - { id: "edge_capacity_validates_test", from: "task_production_load_test", to: "assumption_target_capacity", type: "needs_validation", status: "confirmed", reason: "压测用于验证目标集群容量。", source: "capacity_plan", confidence: 0.94 }
  - { id: "edge_drill_requires_rollback", from: "task_rollback_drill", to: "feature_rollback_switch", type: "requires", status: "confirmed", reason: "演练需要完整回切能力。", source: "readiness_checklist", confidence: 0.98 }
  - { id: "edge_capture_contains_event", from: "module_change_capture", to: "data_ledger_event", type: "contains", status: "confirmed", reason: "账本事件归入变更捕获域。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_capture_contains_write_api", from: "module_change_capture", to: "api_ledger_write", type: "contains", status: "confirmed", reason: "写入接口归入变更捕获域。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_capture_contains_no_loss", from: "module_change_capture", to: "constraint_no_event_loss", type: "contains", status: "confirmed", reason: "事件完整性是变更捕获硬边界。", source: "finance_control", confidence: 1.0 }
  - { id: "edge_capture_contains_latency", from: "module_change_capture", to: "constraint_latency_budget", type: "contains", status: "confirmed", reason: "双写延迟是变更捕获验收条件。", source: "service_slo", confidence: 1.0 }
  - { id: "edge_backfill_contains_balance", from: "module_backfill_verify", to: "data_account_balance", type: "contains", status: "confirmed", reason: "余额快照归入核对域。", source: "finance_control", confidence: 0.98 }
  - { id: "edge_backfill_contains_checkpoint", from: "module_backfill_verify", to: "data_migration_checkpoint", type: "contains", status: "confirmed", reason: "迁移检查点归入回填核对域。", source: "migration_design", confidence: 0.98 }
  - { id: "edge_backfill_contains_hot_risk", from: "module_backfill_verify", to: "risk_hot_account", type: "contains", status: "confirmed", reason: "热点账户风险由回填域验证。", source: "backfill_review", confidence: 0.92 }
  - { id: "edge_cutover_contains_read_api", from: "module_cutover", to: "api_ledger_read", type: "contains", status: "confirmed", reason: "查询路由归入切换域。", source: "cutover_runbook", confidence: 0.98 }
  - { id: "edge_cutover_contains_window", from: "module_cutover", to: "constraint_rollback_window", type: "contains", status: "confirmed", reason: "回滚窗口是切换域边界。", source: "risk_committee", confidence: 1.0 }
  - { id: "edge_cutover_contains_lag_risk", from: "module_cutover", to: "risk_replication_lag", type: "contains", status: "confirmed", reason: "复制延迟风险由切换域监控。", source: "load_test_review", confidence: 0.92 }
  - { id: "edge_cutover_contains_schema_risk", from: "module_cutover", to: "risk_irreversible_schema", type: "contains", status: "confirmed", reason: "schema 回滚风险归入切换域。", source: "schema_review", confidence: 0.94 }
  - { id: "edge_cutover_contains_capacity", from: "module_cutover", to: "assumption_target_capacity", type: "contains", status: "confirmed", reason: "容量假设由切换前压测闭合。", source: "capacity_plan", confidence: 0.9 }
  - { id: "edge_cutover_contains_threshold_question", from: "module_cutover", to: "question_reconcile_threshold", type: "contains", status: "confirmed", reason: "差异阈值属于切换闸门。", source: "cutover_review", confidence: 0.94 }
  - { id: "edge_cutover_contains_time_question", from: "module_cutover", to: "question_cutover_time", type: "contains", status: "confirmed", reason: "切换时段问题归入切换域。", source: "finance_operations", confidence: 0.94 }
  - { id: "edge_cutover_contains_abort_decision", from: "module_cutover", to: "decision_abort_threshold", type: "contains", status: "confirmed", reason: "停止阈值决策归入切换域。", source: "risk_committee", confidence: 0.98 }
  - { id: "edge_cutover_contains_time_decision", from: "module_cutover", to: "decision_avoid_settlement", type: "contains", status: "confirmed", reason: "切换时段决策归入切换域。", source: "finance_operations", confidence: 0.96 }
validation:
  status: "valid"
  scenario: "payment_ledger_zero_downtime_migration"
```
