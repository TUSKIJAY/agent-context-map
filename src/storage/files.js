// files.js — open / save ACM-MD files on disk.
//
//   • Open:  uses a hidden <input type=file>, which works in BOTH the browser
//            (npm run dev) and the Tauri WebView2, so no fs read permission is
//            needed. The OS file path is not exposed by the input, so opened
//            files have no source_path (the document is persisted to SQLite).
//   • Save:  desktop uses the native save dialog + fs writeTextFile (so it can
//            track a real path); browser falls back to an <a download> blob.
import { persistenceMode } from "./store.js";

const inTauri = persistenceMode === "sqlite";

export async function openTextFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.acmmd,.acm,.markdown,.txt,text/markdown,text/plain";
    let settled = false;
    input.onchange = async () => {
      settled = true;
      const f = input.files && input.files[0];
      if (!f) { resolve(null); return; }
      try { resolve({ name: f.name, text: await f.text(), path: null }); }
      catch { resolve(null); }
      finally { try { input.remove(); } catch {} }
    };
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.click();
    // clean up if the user cancels (no change event fires)
    setTimeout(() => { if (!settled) { try { input.remove(); } catch {} resolve(null); } }, 120000);
  });
}

// Returns { path } on success, or null if cancelled.
export async function saveTextFile(text, { defaultName = "context-map.acm.md", path = null } = {}) {
  if (inTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    let target = path;
    if (!target) {
      target = await save({ defaultPath: defaultName, filters: [{ name: "ACM-MD", extensions: ["md"] }] });
      if (!target) return null;
    }
    await writeTextFile(target, text);
    return { path: target };
  }
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { try { a.remove(); } catch {} URL.revokeObjectURL(url); }, 1000);
  return { path: defaultName };
}
