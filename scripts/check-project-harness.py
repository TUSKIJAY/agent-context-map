#!/usr/bin/env python3
"""Dependency-free structural and contract check for the project-local harness."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


MINIMAL = (
    "AGENTS.md",
    "CLAUDE.md",
    "INSTRUCTIONS.md",
    "PROGRESS.md",
    "HANDOFF.md",
    "PROJECT_MAP.md",
    ".harness/config.json",
    "scripts/check-project-harness.py",
    "scripts/check-startup-doc-budget.py",
)

GOVERNED = (
    "docs/README.md",
    "docs/exec-plans/roadmap.md",
    "docs/exec-plans/plan-template.md",
    "docs/exec-plans/proposed/index.md",
    "docs/exec-plans/active/index.md",
    "docs/exec-plans/completed/index.md",
    "docs/exec-plans/reviews/index.md",
    "docs/exec-plans/reviews/review-template.md",
    "docs/decisions/index.md",
    "docs/decisions/decision-template.md",
    "docs/optimization/SOP.md",
    "docs/optimization/index.md",
    "docs/optimization/record-template.md",
    "docs/progress-archive/index.md",
)

CONTENT_RULES: dict[str, tuple[tuple[str, str], ...]] = {
    "AGENTS.md": (
        ("routes INSTRUCTIONS.md", "INSTRUCTIONS.md"),
        ("routes PROGRESS.md", "PROGRESS.md"),
        ("routes HANDOFF.md", "HANDOFF.md"),
        ("routes PROJECT_MAP.md", "PROJECT_MAP.md"),
        ("routes docs authority", "docs/README.md"),
        ("keeps direct-execute fast path", "直接执行"),
        ("requires Git status readback", "git status --short --branch"),
    ),
    "CLAUDE.md": (("points to AGENTS.md", "AGENTS.md"),),
    "INSTRUCTIONS.md": (
        ("defines objective", "## Objective"),
        ("records stable facts", "## Stable Project Facts"),
        ("records stable invariants", "## Stable Invariants"),
        ("documents verification baseline", "## Verification Baseline"),
        ("documents native build", "npm run build"),
    ),
    "PROGRESS.md": (
        ("records current status", "## Current Status"),
        ("records in-progress state", "## In Progress"),
        ("records blockers", "## Blocked"),
        ("records to-do state", "## To Do"),
        ("records verification baseline", "## Verification Baseline"),
        ("routes historical state", "## Historical Redirects"),
    ),
    "HANDOFF.md": (
        ("records resume point", "## Resume Point"),
        ("records last verification", "## Last Verification"),
        ("records next gate", "## Next Gate"),
    ),
    "PROJECT_MAP.md": (
        ("maps AGENTS.md", "AGENTS.md"),
        ("maps application entry", "src/App.jsx"),
        ("maps docs authority", "docs/README.md"),
        ("maps local harness checker", "scripts/check-project-harness.py"),
    ),
    "docs/README.md": (
        ("routes exec plans", "exec-plans/"),
        ("routes decisions", "decisions/"),
        ("routes optimization intake", "optimization/"),
        ("routes progress archive", "progress-archive/"),
    ),
    "docs/exec-plans/roadmap.md": (
        ("documents direct execution", "直接执行"),
        ("documents proposed state", "proposed"),
        ("documents active state", "active"),
        ("documents completed state", "completed"),
    ),
    "docs/exec-plans/plan-template.md": (
        ("marks template proposed", "Status: Proposed"),
        ("defines context", "Context And Evidence"),
        ("defines phases", "## 4. Phases"),
        ("defines activation gate", "Review And Activation Gate"),
    ),
    "docs/exec-plans/reviews/review-template.md": (
        ("identifies review target", "Review target"),
        ("records verdict", "Verdict"),
        ("records findings", "## Findings"),
    ),
    "docs/decisions/decision-template.md": (
        ("marks template proposed", "Status: Proposed"),
        ("records context", "## Context"),
        ("records decision", "## Decision"),
        ("defines activation boundary", "## Activation Boundary"),
    ),
    "docs/optimization/SOP.md": (
        ("denies implementation authority", "不授权实施"),
        ("routes proposed state", "proposed"),
        ("routes active state", "active"),
    ),
    "docs/optimization/record-template.md": (
        ("marks record-only status", "Record-only"),
        ("provides optimization id", "OPT-001"),
        ("records lifecycle status", "Lifecycle status"),
    ),
    "docs/progress-archive/index.md": (
        ("identifies progress archive", "Progress Archive Index"),
        ("routes current state", "Current-state redirect"),
    ),
}

INDEX_TITLES = {
    "docs/exec-plans/proposed/index.md": "Proposed Exec Plans",
    "docs/exec-plans/active/index.md": "Active Exec Plans",
    "docs/exec-plans/completed/index.md": "Completed Exec Plans",
    "docs/exec-plans/reviews/index.md": "Exec Plan Reviews",
    "docs/decisions/index.md": "Decision Index",
    "docs/optimization/index.md": "Optimization Index",
}


def infer_profile(root: Path) -> str:
    config = root / ".harness" / "config.json"
    if config.is_file():
        try:
            value = json.loads(config.read_text(encoding="utf-8")).get("profile")
            if value in {"minimal", "governed"}:
                return value
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            pass
    return "governed" if (root / "docs/exec-plans/roadmap.md").is_file() else "minimal"


def validate_config(root: Path, profile: str) -> str | None:
    try:
        config = json.loads((root / ".harness/config.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, AttributeError) as exc:
        return f"{type(exc).__name__}: {exc}"

    if not isinstance(config, dict):
        return "config must be a JSON object"
    if config.get("schema_version") != "project-harness-config-v1":
        return "unsupported schema_version"
    if config.get("profile") != profile:
        return f"profile mismatch: config={config.get('profile')} requested={profile}"
    for field in ("project_name", "project_type"):
        if not isinstance(config.get(field), str) or not config[field].strip():
            return f"{field} must be a non-empty string"
    commands = config.get("verification_commands")
    if not isinstance(commands, list) or not commands or any(not isinstance(item, str) or not item.strip() for item in commands):
        return "verification_commands must be a non-empty array of non-empty strings"
    return None


def inspect_file(root: Path, relative: str) -> tuple[dict[str, object], list[dict[str, str]]]:
    path = root / relative
    present = path.is_file()
    nonempty = False
    text = ""
    read_error: str | None = None
    if present:
        try:
            text = path.read_text(encoding="utf-8")
            nonempty = bool(text.strip())
        except (OSError, UnicodeDecodeError) as exc:
            read_error = f"{type(exc).__name__}: {exc}"

    errors: list[dict[str, str]] = []
    if read_error:
        errors.append({"path": relative, "rule": "readable UTF-8 text", "detail": read_error})
    elif present and nonempty:
        rules = list(CONTENT_RULES.get(relative, ()))
        if relative in INDEX_TITLES:
            rules.append(("keeps canonical index title", INDEX_TITLES[relative]))
        for label, needle in rules:
            if needle not in text:
                errors.append({"path": relative, "rule": label, "detail": f"missing {needle!r}"})
        if relative == "CLAUDE.md" and len(text.encode("utf-8")) > 4096:
            errors.append({"path": relative, "rule": "remains a compact pointer", "detail": "exceeds 4096 bytes"})

    return {"path": relative, "present": present, "nonempty": nonempty, "read_error": read_error}, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--profile", choices=("auto", "minimal", "governed"), default="auto")
    args = parser.parse_args(argv)

    root = args.root.expanduser().resolve()
    profile = infer_profile(root) if args.profile == "auto" else args.profile
    required = list(MINIMAL) + (list(GOVERNED) if profile == "governed" else [])

    files: list[dict[str, object]] = []
    content_errors: list[dict[str, str]] = []
    for relative in required:
        item, errors = inspect_file(root, relative)
        files.append(item)
        content_errors.extend(errors)

    missing = [str(item["path"]) for item in files if not item["present"]]
    empty = [str(item["path"]) for item in files if item["present"] and not item["nonempty"] and item["read_error"] is None]
    config_error = validate_config(root, profile)
    passed = not missing and not empty and not content_errors and config_error is None
    payload = {
        "schema_version": "project-local-harness-check-v2",
        "root": str(root),
        "profile": profile,
        "files": files,
        "missing": missing,
        "empty": empty,
        "content_errors": content_errors,
        "config_error": config_error,
        "passed": passed,
    }
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
    for label, values in (("Missing harness files", missing), ("Empty harness files", empty)):
        if values:
            print(f"{label}:", file=sys.stderr)
            for relative in values:
                print(f"  - {relative}", file=sys.stderr)
    for error in content_errors:
        print(f"Content error: {error['path']}: {error['rule']} ({error['detail']})", file=sys.stderr)
    if config_error:
        print(f"Config error: {config_error}", file=sys.stderr)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
