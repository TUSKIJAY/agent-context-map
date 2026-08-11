#!/usr/bin/env node

import path from "node:path";
import { buildArtifact, defaultSpecPath, projectRoot } from "./artifact-build-lib.mjs";

function parseArgs(argv) {
  const options = { format: "directory", specPath: defaultSpecPath };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!new Set(["--format", "--spec", "--out-dir", "--generated-at", "--max-bytes"]).has(key)) {
      throw new Error(`Unknown argument: ${key}`);
    }
    const value = argv[index + 1];
    if (value == null) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--format") options.format = value;
    if (key === "--spec") options.specPath = path.resolve(value);
    if (key === "--out-dir") options.outputRoot = path.resolve(value);
    if (key === "--generated-at") options.generatedAt = value;
    if (key === "--max-bytes") options.maxBytes = Number(value);
  }
  if (!options.outputRoot) {
    options.outputRoot = path.join(projectRoot, options.format === "single" ? "dist-artifact-single" : "dist-artifact-dir");
  }
  return options;
}

const result = await buildArtifact(parseArgs(process.argv.slice(2)));
process.stdout.write(`${JSON.stringify(result)}\n`);
