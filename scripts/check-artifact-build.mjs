#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildArtifact,
  defaultSpecPath,
  escapeInlineScript,
  escapeInlineStyle,
} from "./artifact-build-lib.mjs";

const fixedGeneratedAt = "2026-08-12T00:00:00.000Z";
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "acm-artifact-check-"));

try {
  assert.equal(escapeInlineScript("a</ScRiPt>b"), "a<\\/script>b");
  assert.equal(escapeInlineStyle("a</StYlE>b"), "a<\\/style>b");
  await assert.rejects(
    buildArtifact({ format: "single", outputRoot: path.join(temporaryRoot, "invalid-limit"), generatedAt: fixedGeneratedAt, maxBytes: Number.NaN, logLevel: "silent" }),
    /positive finite number/,
  );

  const directoryA = await buildArtifact({ format: "directory", specPath: defaultSpecPath, outputRoot: path.join(temporaryRoot, "dir-a"), generatedAt: fixedGeneratedAt, logLevel: "warn" });
  const directoryB = await buildArtifact({ format: "directory", specPath: defaultSpecPath, outputRoot: path.join(temporaryRoot, "dir-b"), generatedAt: fixedGeneratedAt, logLevel: "warn" });
  assert.equal(directoryA.runtime_sha256, directoryB.runtime_sha256, "directory runtime hash must be reproducible");
  assert.equal(directoryA.canonical_structure_sha256, directoryB.canonical_structure_sha256);
  assert.equal(directoryA.includes_elk, false);
  assert.ok(directoryA.files.some((file) => file.path === "artifact.html"));
  assert.ok(directoryA.files.every((file) => file.bytes > 0));

  const directoryHtml = await fs.readFile(directoryA.outputPath, "utf8");
  assert.match(directoryHtml, /Content-Security-Policy/);
  assert.doesNotMatch(directoryHtml, /(?:src|href)=["']https?:\/\//i);
  const directoryManifest = JSON.parse(await fs.readFile(directoryA.manifestPath, "utf8"));
  assert.equal(directoryManifest.runtime_sha256, directoryA.runtime_sha256);
  assert.equal(directoryManifest.doc_id, "acm_viewer_three_views");
  assert.equal(directoryManifest.schema_version, "acm-md/0.1");
  assert.equal(directoryManifest.generated_at, fixedGeneratedAt);

  const singleA = await buildArtifact({ format: "single", specPath: defaultSpecPath, outputRoot: path.join(temporaryRoot, "single-a"), generatedAt: fixedGeneratedAt, logLevel: "warn" });
  const singleB = await buildArtifact({ format: "single", specPath: defaultSpecPath, outputRoot: path.join(temporaryRoot, "single-b"), generatedAt: fixedGeneratedAt, logLevel: "warn" });
  assert.equal(singleA.runtime_sha256, singleB.runtime_sha256, "single-file hash must be reproducible");
  assert.equal(singleA.files.length, 1);
  assert.deepEqual(await fs.readdir(path.dirname(singleA.outputPath)), ["artifact.html"]);
  const singleHtml = await fs.readFile(singleA.outputPath, "utf8");
  assert.match(singleHtml, /Content-Security-Policy/);
  assert.match(singleHtml, /meta name="acm:generated_at" content="2026-08-12T00:00:00.000Z"/);
  assert.equal((singleHtml.match(/<\/script/gi) || []).length, 1, "only the wrapper script closing tag may remain literal");
  assert.equal((singleHtml.match(/<\/style/gi) || []).length, 1, "only the wrapper style closing tag may remain literal");

  process.stdout.write(`${JSON.stringify({
    ok: true,
    generated_at: fixedGeneratedAt,
    directory_runtime_sha256: directoryA.runtime_sha256,
    single_runtime_sha256: singleA.runtime_sha256,
    canonical_structure_sha256: singleA.canonical_structure_sha256,
    directory_bytes: directoryA.total_runtime_bytes,
    single_bytes: singleA.total_runtime_bytes,
    max_runtime_bytes: singleA.max_runtime_bytes,
  })}\n`);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
