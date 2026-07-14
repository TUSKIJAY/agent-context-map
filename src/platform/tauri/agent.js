import { invoke } from "@tauri-apps/api/core";
import { createFallbackAgentPatch, normalizeAgentPatch } from "../../acm/agentClient.js";

export async function requestTauriAgentPatch({ doc, baseNodeId, prompt, selection }) {
  const cleanPrompt = (prompt || "").trim() || "我想新增一个批量导入需求文档的功能";
  const payload = { doc: structuredClone(doc), baseNodeId, prompt: cleanPrompt, selection };
  try {
    const raw = await invoke("request_agent_patch", { payload });
    return normalizeAgentPatch(raw, { doc, baseNodeId, prompt: cleanPrompt });
  } catch (error) {
    console.warn("[acm] Tauri Agent adapter unavailable, using mock proposal", error);
    return createFallbackAgentPatch({ doc, baseNodeId, prompt: cleanPrompt }, error);
  }
}
