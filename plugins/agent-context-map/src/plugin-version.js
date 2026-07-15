import pluginManifest from "../.codex-plugin/plugin.json" with { type: "json" };

export const PLUGIN_VERSION = globalThis.__ACM_PLUGIN_VERSION__ ?? pluginManifest.version;
