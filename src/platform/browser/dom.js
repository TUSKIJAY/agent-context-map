import { toPng, toSvg } from "html-to-image";

export function openTextFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.acmmd,.acm,.markdown,.txt,text/markdown,text/plain";
    let settled = false;
    input.onchange = async () => {
      settled = true;
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try { resolve({ name: file.name, text: await file.text(), path: null }); }
      catch { resolve(null); }
      finally { input.remove(); }
    };
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.click();
    setTimeout(() => { if (!settled) { input.remove(); resolve(null); } }, 120000);
  });
}

export async function saveBrowserTextFile(text, { defaultName = "context-map.acm.md" } = {}) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = defaultName;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 1000);
  return { path: defaultName };
}

export const exportAdapter = {
  async exportGraph({ format, element, options, defaultName }) {
    const dataUrl = format === "svg" ? await toSvg(element, options) : await toPng(element, options);
    const anchor = document.createElement("a");
    anchor.download = defaultName;
    anchor.href = dataUrl;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { path: defaultName };
  },
};

export const browserHost = {
  confirm(message) { return window.confirm(message); },
  alert(message) { window.alert(message); },
  getViewportSize() { return { width: window.innerWidth, height: window.innerHeight }; },
  subscribeKeydown(handler) {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  },
};
