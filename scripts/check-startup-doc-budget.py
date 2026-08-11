#!/usr/bin/env python3
"""Read-only deterministic budget check for startup Markdown documents."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Budget:
    warning_lines: int
    warning_bytes: int
    hard_lines: int
    hard_bytes: int
    overflow_action: str


BUDGETS = {
    "AGENTS.md": Budget(180, 24_576, 240, 32_768, "compress stable rules behind indexed docs"),
    "HANDOFF.md": Budget(176, 38_400, 220, 49_152, "rewrite the session bookmark and move history to progress archive"),
    "INSTRUCTIONS.md": Budget(220, 30_720, 300, 40_960, "compress stable facts behind indexed docs"),
    "PROGRESS.md": Budget(280, 38_400, 350, 49_152, "move oldest completed history to progress archive"),
    "PROJECT_MAP.md": Budget(220, 30_720, 300, 40_960, "split detailed subsystem maps behind indexed docs"),
}


def evaluate(root: Path, relative: str, budget: Budget) -> dict[str, object]:
    path = root / relative
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
        lines = len(text.splitlines())
        byte_count = len(raw)
        attention_required = lines >= budget.warning_lines or byte_count >= budget.warning_bytes
        return {
            "path": relative,
            "lines": lines,
            "bytes": byte_count,
            "archive_required": attention_required,
            "attention_required": attention_required,
            "hard_limit_exceeded": lines > budget.hard_lines or byte_count > budget.hard_bytes,
            "recommended_action": budget.overflow_action if attention_required else None,
            "error": None,
        }
    except (OSError, UnicodeDecodeError) as exc:
        return {
            "path": relative,
            "lines": None,
            "bytes": None,
            "archive_required": True,
            "attention_required": True,
            "hard_limit_exceeded": True,
            "recommended_action": budget.overflow_action,
            "error": f"{type(exc).__name__}: {exc}",
        }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    root = args.root.expanduser().resolve()
    documents = [evaluate(root, path, BUDGETS[path]) for path in sorted(BUDGETS)]
    attention_required = any(bool(item["attention_required"]) for item in documents)
    payload = {
        "schema_version": "startup-doc-budget-v2",
        "root": str(root),
        "documents": documents,
        "archive_required": attention_required,
        "attention_required": attention_required,
        "hard_limit_exceeded": any(bool(item["hard_limit_exceeded"]) for item in documents),
    }
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")))
    for item in documents:
        print(
            f"{item['path']}: lines={item['lines']} bytes={item['bytes']} "
            f"attention_required={str(item['attention_required']).lower()} "
            f"hard_limit_exceeded={str(item['hard_limit_exceeded']).lower()} "
            f"recommended_action={item['recommended_action']}",
            file=sys.stderr,
        )
    return 1 if payload["hard_limit_exceeded"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
