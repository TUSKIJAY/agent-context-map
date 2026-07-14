import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ProjectStoreError } from "./errors.js";

export class SimulatedCrash extends Error {
  constructor(stage) {
    super(`Simulated crash at ${stage}`);
    this.name = "SimulatedCrash";
    this.stage = stage;
    this.preserveRecoveryArtifacts = true;
  }
}

async function syncDirectory(directory) {
  let handle;
  try {
    handle = await fs.open(directory, "r");
    await handle.sync();
  } catch (error) {
    if (!new Set(["EISDIR", "EINVAL", "ENOTSUP", "EPERM", "EACCES"]).has(error?.code)) throw error;
  } finally {
    await handle?.close();
  }
}

export async function safeReplace(targetPath, bytes, { faultInjector, mode } = {}) {
  const target = path.resolve(targetPath);
  const directory = path.dirname(target);
  const basename = path.basename(target);
  const temp = path.join(directory, `.${basename}.acm-write-${randomUUID()}.tmp`);
  if (path.dirname(temp) !== directory) throw new ProjectStoreError("unsafe_temp_path", "Temporary file escaped the target directory.");
  await fs.mkdir(directory, { recursive: true });

  let handle;
  let replaced = false;
  try {
    let inheritedMode = mode;
    if (inheritedMode == null) {
      try { inheritedMode = (await fs.stat(target)).mode; } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    handle = await fs.open(temp, "wx", inheritedMode == null ? 0o600 : inheritedMode);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await faultInjector?.("after_temp_sync", { target, temp });

    await fs.rename(temp, target);
    replaced = true;
    await faultInjector?.("after_replace", { target, temp });
    await syncDirectory(directory);
    await faultInjector?.("after_directory_sync", { target, temp });
    return { target, replaced: true };
  } catch (error) {
    await handle?.close().catch(() => {});
    if (!error?.preserveRecoveryArtifacts && !replaced) await fs.unlink(temp).catch(() => {});
    if (error instanceof SimulatedCrash) throw error;
    throw new ProjectStoreError("atomic_replace_failed", `Safe replacement failed for ${basename}: ${error?.message || error}`, {
      target,
      temp: replaced ? null : temp,
      originalPreserved: !replaced,
      replacementCommitted: replaced,
    });
  }
}
