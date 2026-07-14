import { TYPE_PREFIX } from "./schema.js";

export const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

export function nextId(prefix, existing) {
  let max = 0;
  for (const id of existing || []) {
    const match = new RegExp(`^${prefix}_(\\d+)$`).exec(id);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `${prefix}_${String(max + 1).padStart(3, "0")}`;
}

export function nextNodeId(type, existing) {
  return nextId(TYPE_PREFIX[type] || "node", existing);
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function deterministicId(prefix, value) {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

export function normalizeDocument(doc) {
  const copy = clone(doc);
  copy.nodes = Array.isArray(copy.nodes) ? copy.nodes : [];
  copy.edges = Array.isArray(copy.edges) ? copy.edges : [];
  return copy;
}
