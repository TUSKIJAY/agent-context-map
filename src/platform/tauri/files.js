import { openTextFile } from "../browser/dom.js";

export { openTextFile };

export async function saveTauriTextFile(text, { defaultName = "context-map.acm.md", path = null } = {}) {
  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const target = path || await save({ defaultPath: defaultName, filters: [{ name: "ACM-MD", extensions: ["md"] }] });
  if (!target) return null;
  await writeTextFile(target, text);
  return { path: target };
}
