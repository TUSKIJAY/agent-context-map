const MAX_EVENTS = 64;

const COUNTER_NAMES = [
  "mcp_initialize",
  "tool_descriptors_list",
  "ui_resources_list",
  "ui_resource_read",
  "tool_call",
  "open_result",
  "widget_bootstrap_result",
  "widget_ready_result",
];

function boundedIdentifier(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128 ? value : undefined;
}

export class HostLifecycleObservability {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now;
    this.processStartedAt = now();
    this.sequence = 0;
    this.counters = Object.fromEntries(COUNTER_NAMES.map((name) => [name, 0]));
    this.events = [];
  }

  record(stage, fields = {}) {
    if (!Object.hasOwn(this.counters, stage)) return;
    this.counters[stage] += 1;
    const event = {
      sequence: ++this.sequence,
      at: this.now(),
      stage,
      ...(boundedIdentifier(fields.outcome) ? { outcome: fields.outcome } : {}),
      ...(boundedIdentifier(fields.toolName) ? { toolName: fields.toolName } : {}),
      ...(boundedIdentifier(fields.correlationId) ? { correlationId: fields.correlationId } : {}),
      ...(boundedIdentifier(fields.openAttemptId) ? { openAttemptId: fields.openAttemptId } : {}),
      ...(boundedIdentifier(fields.widgetInstanceId) ? { widgetInstanceId: fields.widgetInstanceId } : {}),
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
  }

  snapshot() {
    return {
      schemaVersion: "agent-context-map-host-lifecycle/v1",
      storage: "process_memory_only",
      sensitiveContentRecorded: false,
      processStartedAt: this.processStartedAt,
      eventLimit: MAX_EVENTS,
      counters: { ...this.counters },
      events: this.events.map((event) => ({ ...event })),
    };
  }
}
