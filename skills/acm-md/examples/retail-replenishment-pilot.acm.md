# Agent Context Map: 连锁零售补货预警试点

这份示例用于产品、运营与数据团队共同评审补货预警试点。Structure 展示业务拆分，Dependency 展示数据与执行依赖，Inquiry 集中呈现尚未闭合的经营问题、风险与决策。

```acm
schema_version: "acm-md/0.1"
doc_id: "retail_replenishment_pilot"
meta:
  title: "连锁零售补货预警试点"
  created_by: "product-operations-working-group"
  created_at: "2026-08-12"
  updated_at: "2026-08-12"
  purpose: "在不自动下单的前提下，用可解释的补货建议降低试点门店缺货损失。"
  source: "cross-functional-pilot-brief"
nodes:
  - id: "goal_reduce_stockouts"
    type: "Goal"
    title: "降低试点门店缺货损失"
    status: "confirmed"
    description: "通过每日补货预警缩短发现与处理缺货风险的时间，同时控制过量库存。"
    source: "pilot_charter"
    confidence: 0.96
    priority: "P0"
    tags: ["零售", "补货", "试点"]
  - id: "module_demand_signal"
    type: "Module"
    title: "需求与库存信号"
    status: "confirmed"
    description: "汇总门店销售、促销和库存快照，形成可追溯的日粒度输入。"
    source: "data_workshop"
    confidence: 0.94
    priority: "P0"
    tags: ["数据", "需求"]
  - id: "module_replenishment_policy"
    type: "Module"
    title: "补货建议与人工复核"
    status: "confirmed"
    description: "计算建议数量、解释触发原因，并交由门店负责人确认。"
    source: "operations_workshop"
    confidence: 0.95
    priority: "P0"
    tags: ["策略", "审批"]
  - id: "module_pilot_rollout"
    type: "Module"
    title: "试点运营与成效评估"
    status: "confirmed"
    description: "选择门店、培训责任人、监控异常并评估经营结果。"
    source: "pilot_charter"
    confidence: 0.93
    priority: "P1"
    tags: ["试点", "评估"]
  - id: "feature_sales_ingest"
    type: "Feature"
    title: "每日销售与促销事件接入"
    status: "confirmed"
    description: "按门店和 SKU 拉取销量、退货、促销类型与生效区间。"
    source: "data_contract"
    confidence: 0.92
    priority: "P0"
    tags: ["POS", "促销"]
  - id: "feature_inventory_snapshot"
    type: "Feature"
    title: "库存与在途快照校验"
    status: "confirmed"
    description: "识别负库存、长时间未更新和在途数量异常。"
    source: "inventory_process"
    confidence: 0.91
    priority: "P0"
    tags: ["库存", "质量"]
  - id: "feature_demand_forecast"
    type: "Feature"
    title: "七日需求区间预测"
    status: "needs_validation"
    description: "输出基准销量与上下界，并显示促销修正是否生效。"
    source: "data_science_proposal"
    confidence: 0.78
    priority: "P0"
    tags: ["预测", "可解释"]
  - id: "feature_order_guardrail"
    type: "Feature"
    title: "库存上限与最小陈列约束"
    status: "confirmed"
    description: "结合货架容量、整箱规格和安全库存裁剪建议数量。"
    source: "replenishment_policy"
    confidence: 0.9
    priority: "P0"
    tags: ["约束", "库存"]
  - id: "feature_recommendation"
    type: "Feature"
    title: "生成可解释补货建议"
    status: "confirmed"
    description: "展示建议数量、缺货概率、关键输入和触发原因。"
    source: "product_brief"
    confidence: 0.92
    priority: "P0"
    tags: ["建议", "解释"]
  - id: "feature_manager_approval"
    type: "Feature"
    title: "门店负责人复核与驳回"
    status: "confirmed"
    description: "负责人可确认、调整或驳回建议，并记录标准原因。"
    source: "operations_workshop"
    confidence: 0.96
    priority: "P0"
    tags: ["人工复核", "审计"]
  - id: "feature_erp_submission"
    type: "Feature"
    title: "已确认建议写入 ERP 草稿单"
    status: "confirmed"
    description: "仅把人工确认后的数量写入采购草稿，不自动提交订单。"
    source: "integration_boundary"
    confidence: 0.95
    priority: "P1"
    tags: ["ERP", "草稿"]
  - id: "feature_pilot_dashboard"
    type: "Feature"
    title: "试点成效与异常看板"
    status: "confirmed"
    description: "按门店展示采纳率、缺货率、周转天数和数据延迟。"
    source: "pilot_metrics"
    confidence: 0.9
    priority: "P1"
    tags: ["看板", "指标"]
  - id: "data_daily_demand"
    type: "DataEntity"
    title: "门店 SKU 日需求记录"
    status: "confirmed"
    description: "包含净销量、促销标识、星期与节假日特征。"
    source: "data_contract"
    confidence: 0.94
    tags: ["日粒度", "SKU"]
  - id: "data_stock_position"
    type: "DataEntity"
    title: "可售库存与在途库存"
    status: "confirmed"
    description: "保存快照时间、可售数量、锁定数量与预计到货日。"
    source: "inventory_contract"
    confidence: 0.93
    tags: ["库存", "在途"]
  - id: "data_replenishment_advice"
    type: "DataEntity"
    title: "补货建议与复核记录"
    status: "confirmed"
    description: "保存建议、调整后数量、原因、责任人和时间戳。"
    source: "audit_requirement"
    confidence: 0.96
    tags: ["建议", "审计"]
  - id: "api_pos_daily"
    type: "API"
    title: "POS 日结数据接口"
    status: "confirmed"
    description: "在每日 02:00 前提供前一营业日的门店销售明细。"
    source: "integration_inventory"
    confidence: 0.9
    tags: ["POS", "批处理"]
  - id: "api_erp_draft"
    type: "API"
    title: "ERP 采购草稿接口"
    status: "confirmed"
    description: "支持幂等创建草稿，并返回业务单号供人工提交。"
    source: "integration_inventory"
    confidence: 0.88
    tags: ["ERP", "幂等"]
  - id: "constraint_human_approval"
    type: "Constraint"
    title: "试点期禁止自动下单"
    status: "confirmed"
    description: "系统只生成建议；采购订单仍由授权人员显式提交。"
    source: "risk_committee"
    confidence: 1.0
    priority: "P0"
    tags: ["人工确认", "边界"]
  - id: "constraint_data_freshness"
    type: "Constraint"
    title: "关键数据延迟不得超过六小时"
    status: "confirmed"
    description: "超时或缺失时停止生成建议，并显示具体数据源。"
    source: "data_sla"
    confidence: 0.98
    priority: "P0"
    tags: ["SLA", "失败关闭"]
  - id: "constraint_no_customer_pii"
    type: "Constraint"
    title: "不处理顾客个人信息"
    status: "confirmed"
    description: "输入只保留门店、SKU、日期和汇总数量。"
    source: "privacy_review"
    confidence: 1.0
    tags: ["隐私", "数据最小化"]
  - id: "risk_promotion_distortion"
    type: "Risk"
    title: "促销事件造成需求信号失真"
    status: "needs_validation"
    description: "短期促销可能被误判为长期需求上升。"
    source: "model_review"
    confidence: 0.76
    tags: ["促销", "模型风险"]
  - id: "risk_overstock"
    type: "Risk"
    title: "建议过量导致滞销库存"
    status: "needs_validation"
    description: "预测偏高或整箱约束可能推高周转天数。"
    source: "operations_review"
    confidence: 0.82
    tags: ["库存", "经营风险"]
  - id: "assumption_history_window"
    type: "Assumption"
    title: "八周历史足以形成首版基线"
    status: "needs_validation"
    description: "新品和季节性 SKU 可能不满足该前提。"
    source: "data_science_proposal"
    confidence: 0.65
    tags: ["历史窗口", "冷启动"]
  - id: "question_success_metric"
    type: "Question"
    title: "试点成功应以哪组经营指标判定？"
    status: "needs_validation"
    description: "缺货率下降不能以周转天数显著恶化为代价。"
    source: "steering_committee"
    confidence: 0.72
    tags: ["成功标准", "指标"]
  - id: "question_exception_owner"
    type: "Question"
    title: "数据异常由谁在营业前处置？"
    status: "needs_validation"
    description: "需要明确门店、区域运营与数据团队的升级路径。"
    source: "operations_workshop"
    confidence: 0.7
    tags: ["责任人", "异常"]
  - id: "decision_pilot_scope"
    type: "Decision"
    title: "先在二十家中等规模门店试点"
    status: "confirmed"
    description: "覆盖三种城市层级和两种配送频次，运行六周。"
    source: "steering_committee"
    confidence: 0.94
    tags: ["试点范围", "六周"]
  - id: "decision_balanced_metric"
    type: "Decision"
    title: "采用缺货率与周转天数双门槛"
    status: "confirmed"
    description: "缺货率改善且周转天数不超过对照组容忍区间才判定通过。"
    source: "steering_committee"
    confidence: 0.92
    tags: ["双门槛", "经营指标"]
  - id: "task_backtest"
    type: "Task"
    title: "完成八周历史回测与误差分层"
    status: "confirmed"
    description: "按门店、品类、促销与新品标签报告误差。"
    source: "pilot_plan"
    confidence: 0.9
    priority: "P0"
    tags: ["回测", "分层"]
  - id: "task_store_training"
    type: "Task"
    title: "培训门店负责人处理建议与异常"
    status: "confirmed"
    description: "覆盖复核动作、驳回原因、数据延迟与升级联系人。"
    source: "pilot_plan"
    confidence: 0.91
    priority: "P1"
    tags: ["培训", "运营"]
edges:
  - { id: "edge_goal_signal", from: "goal_reduce_stockouts", to: "module_demand_signal", type: "contains", status: "confirmed", reason: "目标需要可靠的需求与库存输入。", source: "pilot_charter", confidence: 0.98 }
  - { id: "edge_goal_policy", from: "goal_reduce_stockouts", to: "module_replenishment_policy", type: "contains", status: "confirmed", reason: "目标需要受约束的补货建议。", source: "pilot_charter", confidence: 0.98 }
  - { id: "edge_goal_rollout", from: "goal_reduce_stockouts", to: "module_pilot_rollout", type: "contains", status: "confirmed", reason: "目标需要可评估的运营试点。", source: "pilot_charter", confidence: 0.98 }
  - { id: "edge_signal_sales", from: "module_demand_signal", to: "feature_sales_ingest", type: "contains", status: "confirmed", reason: "销售事件属于信号模块。", source: "data_workshop", confidence: 0.96 }
  - { id: "edge_signal_inventory", from: "module_demand_signal", to: "feature_inventory_snapshot", type: "contains", status: "confirmed", reason: "库存快照属于信号模块。", source: "data_workshop", confidence: 0.96 }
  - { id: "edge_signal_forecast", from: "module_demand_signal", to: "feature_demand_forecast", type: "contains", status: "confirmed", reason: "需求预测消费并解释信号。", source: "data_workshop", confidence: 0.94 }
  - { id: "edge_policy_guardrail", from: "module_replenishment_policy", to: "feature_order_guardrail", type: "contains", status: "confirmed", reason: "数量约束属于补货策略。", source: "replenishment_policy", confidence: 0.96 }
  - { id: "edge_policy_advice", from: "module_replenishment_policy", to: "feature_recommendation", type: "contains", status: "confirmed", reason: "建议生成属于补货策略。", source: "product_brief", confidence: 0.96 }
  - { id: "edge_policy_approval", from: "module_replenishment_policy", to: "feature_manager_approval", type: "contains", status: "confirmed", reason: "人工复核属于补货流程。", source: "operations_workshop", confidence: 0.98 }
  - { id: "edge_policy_erp", from: "module_replenishment_policy", to: "feature_erp_submission", type: "contains", status: "confirmed", reason: "ERP 草稿是复核后的交接点。", source: "integration_boundary", confidence: 0.96 }
  - { id: "edge_rollout_dashboard", from: "module_pilot_rollout", to: "feature_pilot_dashboard", type: "contains", status: "confirmed", reason: "成效看板服务试点评估。", source: "pilot_metrics", confidence: 0.95 }
  - { id: "edge_rollout_backtest", from: "module_pilot_rollout", to: "task_backtest", type: "contains", status: "confirmed", reason: "回测是试点前置任务。", source: "pilot_plan", confidence: 0.94 }
  - { id: "edge_rollout_training", from: "module_pilot_rollout", to: "task_store_training", type: "contains", status: "confirmed", reason: "培训是试点启动任务。", source: "pilot_plan", confidence: 0.94 }
  - { id: "edge_sales_pos", from: "feature_sales_ingest", to: "api_pos_daily", type: "depends_on", status: "confirmed", reason: "销售接入依赖 POS 日结。", source: "data_contract", confidence: 0.96 }
  - { id: "edge_sales_demand", from: "feature_sales_ingest", to: "data_daily_demand", type: "references", status: "confirmed", reason: "接入结果形成日需求记录。", source: "data_contract", confidence: 0.96 }
  - { id: "edge_inventory_stock", from: "feature_inventory_snapshot", to: "data_stock_position", type: "references", status: "confirmed", reason: "库存校验读取库存与在途快照。", source: "inventory_contract", confidence: 0.96 }
  - { id: "edge_forecast_sales", from: "feature_demand_forecast", to: "feature_sales_ingest", type: "depends_on", status: "confirmed", reason: "预测依赖清洗后的销售事件。", source: "model_design", confidence: 0.94 }
  - { id: "edge_forecast_history", from: "feature_demand_forecast", to: "data_daily_demand", type: "references", status: "confirmed", reason: "预测读取日需求历史。", source: "model_design", confidence: 0.94 }
  - { id: "edge_advice_forecast", from: "feature_recommendation", to: "feature_demand_forecast", type: "depends_on", status: "confirmed", reason: "建议数量依赖需求区间。", source: "product_brief", confidence: 0.95 }
  - { id: "edge_advice_inventory", from: "feature_recommendation", to: "feature_inventory_snapshot", type: "depends_on", status: "confirmed", reason: "建议数量依赖当前库存。", source: "product_brief", confidence: 0.95 }
  - { id: "edge_advice_guardrail", from: "feature_recommendation", to: "feature_order_guardrail", type: "depends_on", status: "confirmed", reason: "建议必须经过数量约束。", source: "replenishment_policy", confidence: 0.97 }
  - { id: "edge_advice_entity", from: "feature_recommendation", to: "data_replenishment_advice", type: "references", status: "confirmed", reason: "建议与解释写入审计记录。", source: "audit_requirement", confidence: 0.97 }
  - { id: "edge_approval_advice", from: "feature_manager_approval", to: "data_replenishment_advice", type: "depends_on", status: "confirmed", reason: "复核基于同一建议记录。", source: "operations_workshop", confidence: 0.97 }
  - { id: "edge_erp_approval", from: "feature_erp_submission", to: "feature_manager_approval", type: "depends_on", status: "confirmed", reason: "只有确认后才允许写草稿。", source: "integration_boundary", confidence: 1.0 }
  - { id: "edge_erp_api", from: "feature_erp_submission", to: "api_erp_draft", type: "depends_on", status: "confirmed", reason: "草稿写入依赖 ERP 接口。", source: "integration_inventory", confidence: 0.95 }
  - { id: "edge_human_constrains_erp", from: "constraint_human_approval", to: "feature_erp_submission", type: "constrains", status: "confirmed", reason: "不得绕过人工确认。", source: "risk_committee", confidence: 1.0 }
  - { id: "edge_freshness_constrains_forecast", from: "constraint_data_freshness", to: "feature_demand_forecast", type: "constrains", status: "confirmed", reason: "过期数据必须阻止建议生成。", source: "data_sla", confidence: 1.0 }
  - { id: "edge_privacy_constrains_sales", from: "constraint_no_customer_pii", to: "feature_sales_ingest", type: "constrains", status: "confirmed", reason: "销售输入只能使用汇总数据。", source: "privacy_review", confidence: 1.0 }
  - { id: "edge_promo_impacts_forecast", from: "risk_promotion_distortion", to: "feature_demand_forecast", type: "impacts", status: "needs_validation", reason: "促销可能推高预测偏差。", source: "model_review", confidence: 0.78 }
  - { id: "edge_overstock_impacts_advice", from: "risk_overstock", to: "feature_recommendation", type: "impacts", status: "needs_validation", reason: "建议偏高会增加滞销风险。", source: "operations_review", confidence: 0.82 }
  - { id: "edge_history_validates_forecast", from: "question_success_metric", to: "assumption_history_window", type: "needs_validation", status: "needs_validation", reason: "成功标准需要确认不同历史窗口下的稳定性。", source: "steering_committee", confidence: 0.72 }
  - { id: "edge_exception_validates_freshness", from: "question_exception_owner", to: "constraint_data_freshness", type: "needs_validation", status: "needs_validation", reason: "数据超时需要明确处置责任。", source: "operations_workshop", confidence: 0.74 }
  - { id: "edge_scope_impacts_rollout", from: "decision_pilot_scope", to: "module_pilot_rollout", type: "impacts", status: "confirmed", reason: "试点范围决定运营执行规模。", source: "steering_committee", confidence: 0.96 }
  - { id: "edge_metric_answers_question", from: "decision_balanced_metric", to: "question_success_metric", type: "answers", status: "confirmed", reason: "双门槛回答试点成功标准。", source: "steering_committee", confidence: 0.95 }
  - { id: "edge_metric_constrains_dashboard", from: "decision_balanced_metric", to: "feature_pilot_dashboard", type: "impacts", status: "confirmed", reason: "看板必须同时呈现两个门槛。", source: "pilot_metrics", confidence: 0.94 }
  - { id: "edge_signal_contains_demand", from: "module_demand_signal", to: "data_daily_demand", type: "contains", status: "confirmed", reason: "日需求记录归入信号域。", source: "data_workshop", confidence: 0.95 }
  - { id: "edge_signal_contains_stock", from: "module_demand_signal", to: "data_stock_position", type: "contains", status: "confirmed", reason: "库存快照归入信号域。", source: "data_workshop", confidence: 0.95 }
  - { id: "edge_signal_contains_pos", from: "module_demand_signal", to: "api_pos_daily", type: "contains", status: "confirmed", reason: "POS 接口归入信号域。", source: "data_workshop", confidence: 0.95 }
  - { id: "edge_signal_contains_freshness", from: "module_demand_signal", to: "constraint_data_freshness", type: "contains", status: "confirmed", reason: "数据时效是信号域验收条件。", source: "data_sla", confidence: 0.98 }
  - { id: "edge_signal_contains_privacy", from: "module_demand_signal", to: "constraint_no_customer_pii", type: "contains", status: "confirmed", reason: "数据最小化是信号域边界。", source: "privacy_review", confidence: 0.98 }
  - { id: "edge_signal_contains_promo_risk", from: "module_demand_signal", to: "risk_promotion_distortion", type: "contains", status: "confirmed", reason: "促销失真由信号域负责验证。", source: "model_review", confidence: 0.9 }
  - { id: "edge_signal_contains_history", from: "module_demand_signal", to: "assumption_history_window", type: "contains", status: "confirmed", reason: "历史窗口假设归入信号域。", source: "data_science_proposal", confidence: 0.9 }
  - { id: "edge_policy_contains_advice_data", from: "module_replenishment_policy", to: "data_replenishment_advice", type: "contains", status: "confirmed", reason: "建议记录归入补货策略域。", source: "audit_requirement", confidence: 0.96 }
  - { id: "edge_policy_contains_erp", from: "module_replenishment_policy", to: "api_erp_draft", type: "contains", status: "confirmed", reason: "ERP 交接归入补货策略域。", source: "integration_boundary", confidence: 0.96 }
  - { id: "edge_policy_contains_human", from: "module_replenishment_policy", to: "constraint_human_approval", type: "contains", status: "confirmed", reason: "人工确认是策略域硬边界。", source: "risk_committee", confidence: 1.0 }
  - { id: "edge_policy_contains_overstock", from: "module_replenishment_policy", to: "risk_overstock", type: "contains", status: "confirmed", reason: "过量库存风险归入策略域。", source: "operations_review", confidence: 0.94 }
  - { id: "edge_rollout_contains_success_question", from: "module_pilot_rollout", to: "question_success_metric", type: "contains", status: "confirmed", reason: "成功标准由试点域闭合。", source: "steering_committee", confidence: 0.94 }
  - { id: "edge_rollout_contains_owner_question", from: "module_pilot_rollout", to: "question_exception_owner", type: "contains", status: "confirmed", reason: "异常责任由试点运营闭合。", source: "operations_workshop", confidence: 0.94 }
  - { id: "edge_rollout_contains_scope_decision", from: "module_pilot_rollout", to: "decision_pilot_scope", type: "contains", status: "confirmed", reason: "试点范围决策归入试点域。", source: "steering_committee", confidence: 0.96 }
  - { id: "edge_rollout_contains_metric_decision", from: "module_pilot_rollout", to: "decision_balanced_metric", type: "contains", status: "confirmed", reason: "指标决策归入试点域。", source: "steering_committee", confidence: 0.96 }
validation:
  status: "valid"
  scenario: "retail_replenishment_pilot"
```
