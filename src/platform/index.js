import { createBrowserPlatform } from "./browser/index.js";
import { createTauriPlatform } from "./tauri/index.js";

export function isTauriRuntime(globalObject = globalThis) {
  return globalObject?.isTauri === true || typeof globalObject?.__TAURI_INTERNALS__ !== "undefined";
}

export function createDesktopPlatform(globalObject = globalThis) {
  return isTauriRuntime(globalObject) ? createTauriPlatform() : createBrowserPlatform();
}
