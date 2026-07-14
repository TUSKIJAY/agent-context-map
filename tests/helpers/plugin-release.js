import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const workspaceRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const buildScript = fileURLToPath(new URL("../../plugins/agent-context-map/scripts/build-mcp.mjs", import.meta.url));

export async function buildPluginRelease({ releaseRoot, pluginVersion } = {}) {
  const args = [buildScript, "--no-development-bundle"];
  if (releaseRoot) args.push("--release-root", releaseRoot);
  if (pluginVersion) args.push("--plugin-version", pluginVersion);
  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const line = stdout.trim().split(/\r?\n/u).at(-1);
  const result = JSON.parse(line);
  if (!result.ok) throw new Error(`Plugin release build failed: ${line}`);
  return result;
}
