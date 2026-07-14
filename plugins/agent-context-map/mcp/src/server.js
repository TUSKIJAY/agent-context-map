#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { startStdioServer } from "./protocol.js";
import { SessionService } from "./session/session-service.js";
import { createToolRegistry } from "./tools/registry.js";
import { WidgetLifecycleService } from "./widget/lifecycle-service.js";
import { BoundProjectService } from "./state/project-service.js";
import { ContextStore } from "./state/context-store.js";
import { ProposalStore } from "./state/proposal-store.js";
import { SendService } from "./state/send-service.js";

const SERVER_NAME = "agent-context-map";
const SERVER_VERSION = "0.2.0";
const instanceId = randomUUID();
const sessionService = new SessionService();
const widgetLifecycle = new WidgetLifecycleService();
const projectService = new BoundProjectService();
const proposalStore = new ProposalStore();
const contextStore = new ContextStore();
const sendService = new SendService();
const toolRegistry = createToolRegistry({ sessionService, widgetLifecycle, projectService, proposalStore, contextStore, sendService, instanceId, version: SERVER_VERSION });

startStdioServer({ serverName: SERVER_NAME, serverVersion: SERVER_VERSION, toolRegistry });
