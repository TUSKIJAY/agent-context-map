// Compatibility facade for pre-Phase-3 callers. Product composition injects
// platform.store directly into AcmEditorShell; new editor code must not import
// this module.
import { createDesktopPlatform } from "../platform/index.js";

const store = createDesktopPlatform().store;

export const persistenceMode = store.persistenceMode;
export const listDocuments = (...args) => store.listDocuments(...args);
export const getDocument = (...args) => store.getDocument(...args);
export const upsertDocument = (...args) => store.upsertDocument(...args);
export const saveBody = (...args) => store.saveBody(...args);
export const saveBaseline = (...args) => store.saveBaseline(...args);
export const deleteDocument = (...args) => store.deleteDocument(...args);
export const getAppState = (...args) => store.getAppState(...args);
export const setAppState = (...args) => store.setAppState(...args);
export const addSnapshot = (...args) => store.addSnapshot(...args);
export const listSnapshots = (...args) => store.listSnapshots(...args);
export const selectProjectRoot = (...args) => store.selectProjectRoot(...args);
export const getProjectInfo = (...args) => store.getProjectInfo(...args);
export const getProjectDiagnostics = (...args) => store.getProjectDiagnostics(...args);
export const previewLegacyMigration = (...args) => store.previewLegacyMigration(...args);
export const backupLegacyMigration = (...args) => store.backupLegacyMigration(...args);
export const migrateLegacyDocument = (...args) => store.migrateLegacyDocument(...args);
