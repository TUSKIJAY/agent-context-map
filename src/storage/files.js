// Compatibility facade. New product code receives platform.files by injection.
import { createDesktopPlatform } from "../platform/index.js";

const files = createDesktopPlatform().files;

export const openTextFile = (...args) => files.openTextFile(...args);
export const saveTextFile = (...args) => files.saveTextFile(...args);
