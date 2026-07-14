import os from "node:os";
import path from "node:path";

export function defaultAgentStateRoot({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  if (platform === "win32") {
    if (!env.LOCALAPPDATA) throw new Error("LOCALAPPDATA is required for Agent Context Map user state");
    return path.win32.join(env.LOCALAPPDATA, "AgentContextMap");
  }
  if (platform === "darwin") return path.posix.join(home, "Library", "Application Support", "AgentContextMap");
  return path.posix.join(env.XDG_STATE_HOME || path.posix.join(home, ".local", "state"), "agent-context-map");
}
