#!/usr/bin/env python3
"""Validate Agent Context Map Markdown (ACM-MD) files."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    print("ERROR: PyYAML is required. Install with: pip install pyyaml", file=sys.stderr)
    raise SystemExit(2) from exc


FORMAL_SCHEMA_VERSION = "acm-md/0.1"
LEGACY_SCHEMA_VERSION = "0.1"
SUPPORTED_SCHEMA_VERSIONS = {FORMAL_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION}

NODE_TYPES = {
    "Goal",
    "Module",
    "Feature",
    "Page",
    "DataEntity",
    "API",
    "Constraint",
    "Risk",
    "Assumption",
    "Question",
    "Decision",
    "Task",
}

STATUSES = {"confirmed", "suggested", "needs_validation", "deprecated"}

EDGE_TYPES = {
    "contains",
    "depends_on",
    "impacts",
    "conflicts_with",
    "requires",
    "replaces",
    "references",
    "constrains",
    "answers",
    "needs_validation",
}

ACM_FENCE_RE = re.compile(r"```[ \t]*acm[^\r\n]*\r?\n(.*?)\r?\n```", re.DOTALL)


def extract_yaml(text: str, mode: str) -> tuple[str | None, list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    blocks = ACM_FENCE_RE.findall(text)

    if mode == "strict":
        if len(blocks) == 0:
            errors.append("Strict mode requires exactly one ```acm fenced block; found 0.")
            return None, errors, warnings
        if len(blocks) > 1:
            errors.append(f"Strict mode requires exactly one ```acm fenced block; found {len(blocks)}.")
            return None, errors, warnings
        return blocks[0], errors, warnings

    if len(blocks) == 0:
        warnings.append("No ```acm fenced block found; parsing the whole file as YAML.")
        return text, errors, warnings
    if len(blocks) > 1:
        warnings.append(f"Found {len(blocks)} ```acm fenced blocks; validating the first one only.")
    return blocks[0], errors, warnings


def load_yaml(yaml_text: str) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        raw = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        return None, [f"YAML parse failed: {exc}"]
    if not isinstance(raw, dict):
        return None, ["ACM content must be a YAML object."]
    return raw, []


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def validate_doc(doc: dict[str, Any], mode: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    schema_version = doc.get("schema_version")
    if is_blank(schema_version):
        errors.append("Missing required top-level field: schema_version.")
    elif schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        errors.append(f"Unsupported schema_version: {schema_version!r}.")
    elif schema_version == LEGACY_SCHEMA_VERSION:
        msg = f"Legacy schema_version {LEGACY_SCHEMA_VERSION!r}; export should use {FORMAL_SCHEMA_VERSION!r}."
        if mode == "strict":
            errors.append(msg)
        else:
            warnings.append(msg)

    if is_blank(doc.get("doc_id")):
        errors.append("Missing required top-level field: doc_id.")

    meta = doc.get("meta")
    if not isinstance(meta, dict):
        errors.append("Missing or invalid required top-level field: meta must be an object.")
        meta = {}
    if is_blank(meta.get("title")):
        errors.append("Missing required field: meta.title.")

    nodes = doc.get("nodes")
    edges = doc.get("edges")
    if not isinstance(nodes, list):
        errors.append("Missing or invalid required top-level field: nodes must be an array.")
        nodes = []
    if not isinstance(edges, list):
        errors.append("Missing or invalid required top-level field: edges must be an array.")
        edges = []

    node_ids: set[str] = set()
    for index, node in enumerate(nodes):
        ref = f"nodes[{index}]"
        if not isinstance(node, dict):
            errors.append(f"{ref} must be an object.")
            continue
        node_id = node.get("id")
        node_type = node.get("type")
        status = node.get("status")

        for field in ("id", "type", "title", "status"):
            if is_blank(node.get(field)):
                errors.append(f"{ref} missing required field: {field}.")

        if not is_blank(node_id):
            if node_id in node_ids:
                errors.append(f"Duplicate node id: {node_id}.")
            node_ids.add(str(node_id))

        if not is_blank(node_type) and node_type not in NODE_TYPES:
            errors.append(f"{ref} has invalid node type: {node_type!r}.")
        if not is_blank(status) and status not in STATUSES:
            errors.append(f"{ref} has invalid status: {status!r}.")

        confidence = node.get("confidence")
        if confidence is not None and not valid_confidence(confidence):
            errors.append(f"{ref} confidence must be a number between 0 and 1.")

        if "confidence" not in node:
            warnings.append(f"{ref} missing recommended field: confidence.")
        if is_blank(node.get("source")):
            warnings.append(f"{ref} missing recommended field: source.")

    edge_ids: set[str] = set()
    for index, edge in enumerate(edges):
        ref = f"edges[{index}]"
        if not isinstance(edge, dict):
            errors.append(f"{ref} must be an object.")
            continue
        edge_id = edge.get("id")
        edge_type = edge.get("type")
        status = edge.get("status")
        source = edge.get("from")
        target = edge.get("to")

        for field in ("id", "from", "to", "type", "status"):
            if is_blank(edge.get(field)):
                errors.append(f"{ref} missing required field: {field}.")

        if not is_blank(edge_id):
            if edge_id in edge_ids:
                errors.append(f"Duplicate edge id: {edge_id}.")
            edge_ids.add(str(edge_id))

        if not is_blank(edge_type) and edge_type not in EDGE_TYPES:
            errors.append(f"{ref} has invalid edge type: {edge_type!r}.")
        if not is_blank(status) and status not in STATUSES:
            errors.append(f"{ref} has invalid status: {status!r}.")

        if not is_blank(source) and str(source) not in node_ids:
            errors.append(f"{ref} source node does not exist: {source}.")
        if not is_blank(target) and str(target) not in node_ids:
            errors.append(f"{ref} target node does not exist: {target}.")

        confidence = edge.get("confidence")
        if confidence is not None and not valid_confidence(confidence):
            errors.append(f"{ref} confidence must be a number between 0 and 1.")
        if status == "suggested":
            warnings.append(f"{ref} is still suggested and not confirmed.")

    changes = doc.get("changes")
    if changes is not None:
        if not isinstance(changes, dict):
            errors.append("changes must be an object when present.")
        elif is_blank(changes.get("summary")):
            errors.append("changes.summary is required when changes is present.")

    add_semantic_warnings(nodes, edges, warnings)
    return errors, warnings


def valid_confidence(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    return 0 <= float(value) <= 1


def add_semantic_warnings(nodes: list[Any], edges: list[Any], warnings: list[str]) -> None:
    node_map = {node.get("id"): node for node in nodes if isinstance(node, dict)}
    outgoing: dict[Any, list[dict[str, Any]]] = {}
    incoming: dict[Any, list[dict[str, Any]]] = {}
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        outgoing.setdefault(edge.get("from"), []).append(edge)
        incoming.setdefault(edge.get("to"), []).append(edge)

    goals = [node for node in node_map.values() if node.get("type") == "Goal"]
    for goal in goals:
        if not outgoing.get(goal.get("id")):
            warnings.append(f"Goal has no outgoing edge: {goal.get('id')}.")
    if len(goals) > 1:
        goal_ids = {goal.get("id") for goal in goals}
        linked = any(edge.get("from") in goal_ids and edge.get("to") in goal_ids for edge in edges if isinstance(edge, dict))
        if not linked:
            warnings.append("Multiple Goal nodes exist but no relation links them.")

    for node in node_map.values():
        node_id = node.get("id")
        node_type = node.get("type")
        if node_type == "Risk" and not any(edge.get("type") == "impacts" for edge in outgoing.get(node_id, [])):
            warnings.append(f"Risk has no impacts edge: {node_id}.")
        if node_type == "Question" and not (incoming.get(node_id) or outgoing.get(node_id)):
            warnings.append(f"Question has no validation relation: {node_id}.")
        if node_type == "Feature":
            has_module_parent = any(
                edge.get("type") == "contains" and node_map.get(edge.get("from"), {}).get("type") == "Module"
                for edge in incoming.get(node_id, [])
            )
            if not has_module_parent:
                warnings.append(f"Feature has no containing Module: {node_id}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate ACM-MD files.")
    parser.add_argument("file", help="Path to .acm.md/.md file, or '-' for stdin.")
    parser.add_argument("--mode", choices=("strict", "tolerant"), default="strict")
    args = parser.parse_args()

    if args.file == "-":
        label = "<stdin>"
        text = sys.stdin.buffer.read().decode("utf-8")
    else:
        path = Path(args.file)
        label = str(path)
        text = path.read_text(encoding="utf-8")

    yaml_text, errors, warnings = extract_yaml(text, args.mode)
    if yaml_text is not None:
        doc, parse_errors = load_yaml(yaml_text)
        errors.extend(parse_errors)
        if doc is not None:
            doc_errors, doc_warnings = validate_doc(doc, args.mode)
            errors.extend(doc_errors)
            warnings.extend(doc_warnings)

    if errors:
        print(f"[FAIL] {label}")
        for error in errors:
            print(f"ERROR: {error}")
    else:
        print(f"[OK] {label}")

    for warning in warnings:
        print(f"WARN: {warning}")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
