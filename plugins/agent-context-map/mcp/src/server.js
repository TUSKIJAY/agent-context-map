#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { startStdioServer } from "./protocol.js";
import { SessionService } from "./session/session-service.js";
import { createToolRegistry } from "./tools/registry.js";

const SERVER_NAME = "agent-context-map";
const SERVER_VERSION = "0.2.0";
const instanceId = randomUUID();
const sessionService = new SessionService();
const toolRegistry = createToolRegistry({ sessionService, instanceId, version: SERVER_VERSION });

startStdioServer({ serverName: SERVER_NAME, serverVersion: SERVER_VERSION, toolRegistry });
