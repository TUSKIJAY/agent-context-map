# Phase 0B Evidence

Only sanitized evidence belongs here. Raw tool arguments, absolute paths, graph content, tokens, prompts, and environment values must not be committed.

The spike writes NDJSON to the operating-system temporary directory. Each record contains field shapes and SHA-256 hashes only. A maintainer reviews those records and writes the stable Gate result to `gate-report.json`.

`gate-report.json` contains no task ID, prompt, graph body, absolute path, token, environment value, or raw tool argument. Correlation/instance IDs and SHA-256 fingerprints are retained only to prove lifecycle behavior.
