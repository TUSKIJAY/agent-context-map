import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  applyOperations,
  computeDocumentRevision,
  parseAcmMd,
  toAcmMd,
  validateDoc,
} from "../../acm-core/src/index.js";
import { classifyRevisionConflict } from "./conflicts.js";
import { ProjectStoreError, asProjectStoreError } from "./errors.js";
import { DocumentLockManager, IdempotencyRegistry } from "./locks.js";
import { safeReplace } from "./safe-replace.js";

const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const INDEX_SCHEMA_VERSION = 1;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function digestPayload(value) {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function validationSummary(issues) {
  return {
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
  };
}

function assertSafeDocumentId(documentId) {
  if (!DOCUMENT_ID.test(documentId || "")) {
    throw new ProjectStoreError("unsafe_document_id", "documentId must be a normalized safe ID without path fragments.", { documentId });
  }
}

function normalizedRootForLock(root) {
  if (process.platform !== "win32") return root;
  return root.replace(/^\\\\\?\\/, "").replaceAll("/", "\\").toLowerCase();
}

function strictDocument(doc, code = "invalid_document") {
  const issues = validateDoc(doc, { mode: "strict" });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) throw new ProjectStoreError(code, "The ACM-MD document failed strict validation.", { issues });
  return { doc, issues };
}

function parseStrictText(text, code = "invalid_current_document") {
  const parsed = parseAcmMd(text, { mode: "strict" });
  if (!parsed.doc || parsed.errors.length) {
    throw new ProjectStoreError(code, "The ACM-MD file could not be parsed.", { parseErrors: parsed.errors, warnings: parsed.warnings });
  }
  return strictDocument(parsed.doc, code);
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export class ProjectStore {
  constructor({ root, stateRoot, lockTimeoutMs, lockTtlMs, faultInjector, indexFaultInjector } = {}) {
    if (!root) throw new TypeError("root is required");
    if (!stateRoot) throw new TypeError("stateRoot is required and must be outside the project business directory");
    this.requestedRoot = path.resolve(root);
    this.stateRoot = path.resolve(stateRoot);
    this.faultInjector = faultInjector;
    this.indexFaultInjector = indexFaultInjector;
    this.locks = new DocumentLockManager({ stateRoot: this.stateRoot, timeoutMs: lockTimeoutMs, ttlMs: lockTtlMs });
    this.idempotency = new IdempotencyRegistry();
    this.root = null;
    this.acmDirectory = null;
    this.documentsDirectory = null;
    this.indexPath = null;
  }

  async initialize() {
    const root = await fs.realpath(this.requestedRoot).catch((error) => {
      throw new ProjectStoreError("project_root_unavailable", `Project root is unavailable: ${error?.message || error}`, { root: this.requestedRoot });
    });
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) throw new ProjectStoreError("invalid_project_root", "Project root must be a directory.", { root });
    this.root = root;
    this.acmDirectory = path.join(root, ".acm");
    this.documentsDirectory = path.join(this.acmDirectory, "documents");
    this.indexPath = path.join(this.acmDirectory, "index.json");
    return this;
  }

  async ready() {
    if (!this.root) await this.initialize();
    return this;
  }

  documentPath(documentId) {
    assertSafeDocumentId(documentId);
    const candidate = path.join(this.documentsDirectory, `${documentId}.acm.md`);
    if (path.dirname(candidate) !== this.documentsDirectory) throw new ProjectStoreError("path_escape", "Document path escaped the project store.");
    return candidate;
  }

  lockKey(documentId) {
    return `${normalizedRootForLock(this.root)}\u0000${documentId}`;
  }

  async projectId() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
      if (parsed?.schemaVersion === INDEX_SCHEMA_VERSION && typeof parsed.projectId === "string" && parsed.projectId) return parsed.projectId;
    } catch {}
    return null;
  }

  async readFileRecord(filePath) {
    const text = await fs.readFile(filePath, "utf8");
    const { doc, issues } = parseStrictText(text);
    assertSafeDocumentId(doc.doc_id);
    const expectedFilename = `${doc.doc_id}.acm.md`;
    if (path.basename(filePath) !== expectedFilename) {
      throw new ProjectStoreError("document_filename_mismatch", "The ACM-MD filename must match its doc_id.", {
        documentId: doc.doc_id,
        filename: path.basename(filePath),
        expectedFilename,
      });
    }
    const canonicalText = toAcmMd(doc);
    const revision = await computeDocumentRevision(doc);
    const stat = await fs.stat(filePath);
    return {
      documentId: doc.doc_id,
      documentRevision: revision,
      protocolVersion: doc.schema_version,
      validatedAt: new Date().toISOString(),
      validationSummary: validationSummary(issues),
      doc,
      rawText: text,
      canonicalText,
      relativePath: path.relative(this.root, filePath).split(path.sep).join("/"),
      modifiedAt: stat.mtime.toISOString(),
    };
  }

  async scanDocuments() {
    await this.ready();
    if (!await exists(this.documentsDirectory)) return { documents: [], invalid: [] };
    const entries = await fs.readdir(this.documentsDirectory, { withFileTypes: true });
    const documents = [];
    const invalid = [];
    const ids = new Set();
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isFile() || !entry.name.endsWith(".acm.md")) continue;
      const filePath = path.join(this.documentsDirectory, entry.name);
      try {
        const linkStat = await fs.lstat(filePath);
        if (linkStat.isSymbolicLink()) throw new ProjectStoreError("project_symlink_rejected", "Symlinked ACM-MD documents are not accepted.", { filename: entry.name });
        const record = await this.readFileRecord(filePath);
        if (ids.has(record.documentId)) throw new ProjectStoreError("duplicate_document_id", "Multiple files contain the same doc_id.", { documentId: record.documentId });
        ids.add(record.documentId);
        documents.push(record);
      } catch (error) {
        const normalized = asProjectStoreError(error, "invalid_current_document");
        invalid.push({ filename: entry.name, code: normalized.code, message: normalized.message, details: normalized.details });
      }
    }
    return { documents, invalid };
  }

  async inspectRecovery() {
    await this.ready();
    const issues = [];
    if (await exists(this.documentsDirectory)) {
      const entries = await fs.readdir(this.documentsDirectory, { withFileTypes: true });
      for (const entry of entries) {
        const match = entry.isFile() && entry.name.match(/^\.(.+\.acm\.md)\.acm-write-[0-9a-f-]+\.tmp$/i);
        if (!match) continue;
        const tempPath = path.join(this.documentsDirectory, entry.name);
        const targetPath = path.join(this.documentsDirectory, match[1]);
        let tempValid = false;
        let targetValid = false;
        try { parseStrictText(await fs.readFile(tempPath, "utf8")); tempValid = true; } catch {}
        try { parseStrictText(await fs.readFile(targetPath, "utf8")); targetValid = true; } catch {}
        issues.push({
          code: "recovery_required",
          tempRelativePath: path.relative(this.root, tempPath).split(path.sep).join("/"),
          targetRelativePath: path.relative(this.root, targetPath).split(path.sep).join("/"),
          tempValid,
          targetValid,
          autoActionTaken: false,
        });
      }
    }
    const lockDirectory = path.join(this.stateRoot, "project-locks");
    if (await exists(lockDirectory)) {
      const projectRoot = normalizedRootForLock(this.root);
      for (const entry of await fs.readdir(lockDirectory, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".lock")) continue;
        let payload;
        try { payload = JSON.parse(await fs.readFile(path.join(lockDirectory, entry.name), "utf8")); } catch { continue; }
        const belongsToProject = payload.projectRoot === projectRoot || String(payload.key || "").startsWith(`${projectRoot}\u0000`);
        if (!belongsToProject) continue;
        const expired = Number(payload.expiresAtMs) <= Date.now();
        const alive = this.locks.processAlive(Number(payload.pid));
        issues.push({
          code: expired && !alive ? "recovery_required" : "document_busy",
          documentId: payload.documentId || String(payload.key || "").split("\u0000").at(-1),
          expiresAtMs: payload.expiresAtMs,
          autoActionTaken: false,
        });
      }
    }
    return issues;
  }

  async listDocuments({ rebuildIndex = true } = {}) {
    const scan = await this.scanDocuments();
    const recovery = await this.inspectRecovery();
    let indexStatus = "not_requested";
    let projectId = await this.projectId();
    if (rebuildIndex && scan.documents.length) {
      try {
        const result = await this.rebuildIndex();
        indexStatus = result.status;
        projectId = result.index.projectId;
      } catch (error) {
        indexStatus = "index_stale";
      }
    }
    return {
      projectId,
      documents: scan.documents.map((record) => ({ ...record, projectId })),
      invalid: scan.invalid,
      recovery,
      indexStatus,
    };
  }

  async readDocument(documentId) {
    await this.ready();
    const record = await this.readFileRecord(this.documentPath(documentId)).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!record) return null;
    return { ...record, projectId: await this.projectId() };
  }

  async rebuildIndex() {
    await this.ready();
    return this.locks.withLock(this.lockKey("__index__"), async () => {
      const scan = await this.scanDocuments();
      if (scan.invalid.length) {
        throw new ProjectStoreError("index_rebuild_invalid_documents", "Index rebuild refused because one or more project documents are invalid.", { invalid: scan.invalid });
      }
      const oldProjectId = await this.projectId();
      const projectId = oldProjectId || randomUUID();
      let defaultDocumentId = null;
      try {
        const previous = JSON.parse(await fs.readFile(this.indexPath, "utf8"));
        if (scan.documents.some((record) => record.documentId === previous.defaultDocumentId)) defaultDocumentId = previous.defaultDocumentId;
      } catch {}
      defaultDocumentId ||= scan.documents[0]?.documentId || null;
      const index = {
        schemaVersion: INDEX_SCHEMA_VERSION,
        projectId,
        defaultDocumentId,
        documents: scan.documents.map((record) => ({
          id: record.documentId,
          relativePath: record.relativePath,
          titleCache: record.doc.meta?.title || "",
          contentRevisionCache: record.documentRevision,
          updatedAtCache: record.doc.meta?.updated_at || record.modifiedAt,
        })),
      };
      await safeReplace(this.indexPath, `${JSON.stringify(index, null, 2)}\n`, { faultInjector: this.indexFaultInjector });
      return { status: "index_rebuilt", index };
    });
  }

  async writeDocument({
    documentId,
    expectedRevision = null,
    document = null,
    operations = null,
    baseDocument = null,
    create = false,
    clientMutationId,
  } = {}) {
    await this.ready();
    assertSafeDocumentId(documentId);
    if ((document == null) === (operations == null)) {
      throw new ProjectStoreError("invalid_write_payload", "Provide exactly one of document or operations.");
    }
    const payload = { documentId, expectedRevision, document, operations, baseDocument, create };
    return this.idempotency.run(clientMutationId, digestPayload(payload), () => this.locks.withLock(this.lockKey(documentId), async () => {
      const targetPath = this.documentPath(documentId);
      let current = null;
      try { current = await this.readFileRecord(targetPath); } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }

      if (!current) {
        if (!create || expectedRevision != null) {
          throw new ProjectStoreError("document_not_found", "The document does not exist; an explicit create mutation is required.", { documentId });
        }
        const scan = await this.scanDocuments();
        if (scan.documents.some((record) => record.documentId === documentId)) {
          throw new ProjectStoreError("document_already_exists", "A document with this doc_id already exists.", { documentId });
        }
      } else {
        if (create) throw new ProjectStoreError("document_already_exists", "Create refused because the document already exists.", { documentId });
        if (!expectedRevision) throw new ProjectStoreError("missing_expected_revision", "expectedRevision is required when replacing an existing document.", { documentId });
        if (expectedRevision !== current.documentRevision) {
          const conflict = classifyRevisionConflict(baseDocument, current.doc);
          throw new ProjectStoreError("revision_conflict", "The document changed after it was read; no file was modified.", {
            documentId,
            expectedRevision,
            currentRevision: current.documentRevision,
            ...conflict,
          });
        }
      }

      let nextDocument = document;
      let appliedOperationIds = [];
      if (operations) {
        if (!current) throw new ProjectStoreError("document_not_found", "Operations cannot create a missing document.", { documentId });
        const applied = applyOperations(current.doc, operations);
        if (!applied.ok) throw new ProjectStoreError("operation_rejected", "One or more operations were rejected.", { errors: applied.errors });
        nextDocument = applied.doc;
        appliedOperationIds = applied.appliedOperationIds;
      }
      if (nextDocument?.doc_id !== documentId) {
        throw new ProjectStoreError("document_id_mismatch", "The document body doc_id does not match documentId.", { documentId, bodyDocumentId: nextDocument?.doc_id });
      }
      strictDocument(nextDocument);
      const canonicalText = toAcmMd(nextDocument);
      await safeReplace(targetPath, canonicalText, { faultInjector: this.faultInjector });
      const newRevision = await computeDocumentRevision(nextDocument);
      let indexUpdateStatus = "index_rebuilt";
      try { await this.rebuildIndex(); } catch { indexUpdateStatus = "document_committed_index_stale"; }
      return {
        status: indexUpdateStatus === "index_rebuilt" ? "committed" : "document_committed_index_stale",
        documentId,
        newRevision,
        documentRevision: newRevision,
        protocolVersion: nextDocument.schema_version,
        projectId: await this.projectId(),
        appliedOperationIds,
        indexUpdateStatus,
        canonicalText,
      };
    }));
  }

  async deleteDocument({ documentId, expectedRevision, clientMutationId } = {}) {
    await this.ready();
    assertSafeDocumentId(documentId);
    const payload = { documentId, expectedRevision, delete: true };
    return this.idempotency.run(clientMutationId, digestPayload(payload), () => this.locks.withLock(this.lockKey(documentId), async () => {
      const current = await this.readDocument(documentId);
      if (!current) return { status: "already_absent", documentId };
      if (!expectedRevision || current.documentRevision !== expectedRevision) {
        throw new ProjectStoreError("revision_conflict", "Delete refused because the document revision changed.", {
          documentId,
          expectedRevision,
          currentRevision: current.documentRevision,
          conflictClass: "content",
        });
      }
      const trashDirectory = path.join(this.stateRoot, "deleted-documents");
      await fs.mkdir(trashDirectory, { recursive: true });
      const trashPath = path.join(trashDirectory, `${documentId}-${Date.now()}-${randomUUID()}.acm.md`);
      try {
        await fs.rename(this.documentPath(documentId), trashPath);
      } catch (error) {
        if (error?.code !== "EXDEV") throw error;
        await fs.copyFile(this.documentPath(documentId), trashPath);
        const handle = await fs.open(trashPath, "r");
        try { await handle.sync(); } finally { await handle.close(); }
        await fs.unlink(this.documentPath(documentId));
      }
      let indexUpdateStatus = "index_rebuilt";
      try { await this.rebuildIndex(); } catch { indexUpdateStatus = "document_committed_index_stale"; }
      return { status: "deleted", documentId, recoveryCopy: trashPath, indexUpdateStatus };
    }));
  }
}

export const PROJECT_INDEX_SCHEMA_VERSION = INDEX_SCHEMA_VERSION;
export const SAFE_DOCUMENT_ID_PATTERN = DOCUMENT_ID;
