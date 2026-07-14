import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ProjectStoreError } from "./errors.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class FairMutex {
  #tail = Promise.resolve();

  async runExclusive(callback) {
    let release;
    const previous = this.#tail;
    this.#tail = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await callback();
    } finally {
      release();
    }
  }
}

function defaultProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function lockFileNameForKey(key) {
  return `${createHash("sha256").update(key).digest("hex")}.lock`;
}

export class DocumentLockManager {
  constructor({ stateRoot, timeoutMs = 2000, ttlMs = 30_000, now = () => Date.now(), processAlive = defaultProcessAlive } = {}) {
    if (!stateRoot) throw new TypeError("stateRoot is required for document locks");
    this.stateRoot = path.resolve(stateRoot);
    this.timeoutMs = timeoutMs;
    this.ttlMs = ttlMs;
    this.now = now;
    this.processAlive = processAlive;
    this.mutexes = new Map();
  }

  mutexFor(key) {
    if (!this.mutexes.has(key)) this.mutexes.set(key, new FairMutex());
    return this.mutexes.get(key);
  }

  async acquireOsLock(key) {
    const directory = path.join(this.stateRoot, "project-locks");
    await fs.mkdir(directory, { recursive: true });
    const lockPath = path.join(directory, lockFileNameForKey(key));
    const deadline = this.now() + this.timeoutMs;
    const nonce = randomUUID();
    const payload = {
      schemaVersion: 1,
      key,
      pid: process.pid,
      processNonce: nonce,
      acquiredAt: new Date(this.now()).toISOString(),
      expiresAtMs: this.now() + this.ttlMs,
    };

    while (true) {
      try {
        const handle = await fs.open(lockPath, "wx", 0o600);
        try {
          await handle.writeFile(`${JSON.stringify(payload)}\n`, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        return { lockPath, nonce };
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        let existing = null;
        try { existing = JSON.parse(await fs.readFile(lockPath, "utf8")); } catch {}
        const unambiguouslyStale = existing
          && Number(existing.expiresAtMs) < this.now()
          && !this.processAlive(Number(existing.pid));
        if (unambiguouslyStale) {
          try { await fs.unlink(lockPath); } catch (unlinkError) {
            if (unlinkError?.code !== "ENOENT") throw unlinkError;
          }
          continue;
        }
        if (this.now() >= deadline) {
          throw new ProjectStoreError("document_busy", "The document lock could not be acquired before timeout.", {
            key,
            lockPath,
            lock: existing,
          });
        }
        await delay(Math.min(25, Math.max(1, deadline - this.now())));
      }
    }
  }

  async releaseOsLock(lease) {
    try {
      const payload = JSON.parse(await fs.readFile(lease.lockPath, "utf8"));
      if (payload.processNonce !== lease.nonce) {
        throw new ProjectStoreError("lock_ownership_lost", "The lock file is no longer owned by this process.", { lockPath: lease.lockPath });
      }
      await fs.unlink(lease.lockPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  async withLock(key, callback) {
    return this.mutexFor(key).runExclusive(async () => {
      const lease = await this.acquireOsLock(key);
      try {
        return await callback();
      } finally {
        await this.releaseOsLock(lease);
      }
    });
  }
}

export class IdempotencyRegistry {
  constructor({ ttlMs = 10 * 60_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
  }

  prune() {
    const cutoff = this.now();
    for (const [key, value] of this.entries) if (value.expiresAtMs <= cutoff) this.entries.delete(key);
  }

  async run(clientMutationId, payloadDigest, callback) {
    if (!clientMutationId) throw new ProjectStoreError("missing_client_mutation_id", "clientMutationId is required for project mutations.");
    this.prune();
    const previous = this.entries.get(clientMutationId);
    if (previous) {
      if (previous.payloadDigest !== payloadDigest) {
        throw new ProjectStoreError("idempotency_key_reused", "clientMutationId was reused with a different payload.", { clientMutationId });
      }
      return previous.promise;
    }
    const promise = Promise.resolve().then(callback);
    this.entries.set(clientMutationId, {
      payloadDigest,
      promise,
      expiresAtMs: this.now() + this.ttlMs,
    });
    try {
      return await promise;
    } catch (error) {
      this.entries.delete(clientMutationId);
      throw error;
    }
  }
}
