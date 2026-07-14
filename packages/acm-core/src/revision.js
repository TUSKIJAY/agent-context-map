import { canonicalAcmMdBytes } from "./serialize.js";

const hex = (bytes) => [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");

export async function sha256Revision(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this runtime");
  const input = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  return `sha256:${hex(new Uint8Array(digest))}`;
}

export function canonicalRevisionBytes(doc, changeSet) {
  return canonicalAcmMdBytes(doc, changeSet);
}

export async function computeDocumentRevision(doc, changeSet) {
  return sha256Revision(canonicalRevisionBytes(doc, changeSet));
}

export function revisionsMatch(expectedRevision, currentRevision) {
  return typeof expectedRevision === "string" && expectedRevision.length > 0 && expectedRevision === currentRevision;
}
