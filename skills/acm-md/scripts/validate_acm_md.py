#!/usr/bin/env python3
"""Validate Agent Context Map Markdown (ACM-MD) files."""

from __future__ import annotations

import argparse
import math
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
FENCE_DELIMITER = "```"


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


def validate_fence_hygiene(yaml_text: str, mode: str) -> tuple[list[str], list[str]]:
    """Detect raw Markdown fence delimiters inside the YAML payload.

    The app importer treats the next raw three-backtick sequence as the end of
    the outer ACM block. If a text field contains that sequence, the importer can
    truncate the YAML before parsing it. Generated ACM-MD should avoid the
    sequence entirely inside the main YAML body.
    """
    errors: list[str] = []
    warnings: list[str] = []
    if FENCE_DELIMITER not in yaml_text:
        return errors, warnings

    line_no = yaml_text[: yaml_text.index(FENCE_DELIMITER)].count("\n") + 1
    msg = (
        "YAML body contains a raw three-backtick Markdown fence delimiter "
        f"at payload line {line_no}; paraphrase it before export/import."
    )
    if mode == "strict":
        errors.append(msg)
    else:
        warnings.append(msg)
    return errors, warnings


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def require_string(value: Any, ref: str, field: str, errors: list[str]) -> None:
    if value is not None and not isinstance(value, str):
        errors.append(f"{ref}.{field} must be a string.")


def validate_tags(value: Any, ref: str, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, list):
        errors.append(f"{ref}.tags must be an array of strings.")
        return
    for index, item in enumerate(value):
        if not isinstance(item, str):
            errors.append(f"{ref}.tags[{index}] must be a string.")


def validate_doc(doc: dict[str, Any], mode: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    schema_version = doc.get("schema_version")
    require_string(schema_version, "top-level", "schema_version", errors)
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

    require_string(doc.get("doc_id"), "top-level", "doc_id", errors)
    if is_blank(doc.get("doc_id")):
        errors.append("Missing required top-level field: doc_id.")

    meta = doc.get("meta")
    if not isinstance(meta, dict):
        errors.append("Missing or invalid required top-level field: meta must be an object.")
        meta = {}
    require_string(meta.get("title"), "meta", "title", errors)
    if is_blank(meta.get("title")):
        errors.append("Missing required field: meta.title.")
    for field in ("created_by", "created_at", "updated_at", "purpose", "source"):
        require_string(meta.get(field), "meta", field, errors)

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
            else:
                require_string(node.get(field), ref, field, errors)
        for field in ("description", "source", "priority", "notes"):
            require_string(node.get(field), ref, field, errors)
        validate_tags(node.get("tags"), ref, errors)

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
    edge_pairs: dict[tuple[str, str], list[str]] = {}
    edge_triples: set[tuple[str, str, str]] = set()
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
            else:
                require_string(edge.get(field), ref, field, errors)
        for field in ("reason", "source"):
            require_string(edge.get(field), ref, field, errors)

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
        if not is_blank(source) and not is_blank(target):
            if str(source) == str(target):
                warnings.append(f"{ref} is a self-loop; confirm the target app supports it.")
            pair = (str(source), str(target))
            edge_pairs.setdefault(pair, []).append(ref)
            if not is_blank(edge_type):
                triple = (str(source), str(target), str(edge_type))
                if triple in edge_triples:
                    warnings.append(f"{ref} duplicates an existing relation with the same from/to/type: {source} -> {target} ({edge_type}).")
                edge_triples.add(triple)

        confidence = edge.get("confidence")
        if confidence is not None and not valid_confidence(confidence):
            errors.append(f"{ref} confidence must be a number between 0 and 1.")
        if status == "suggested":
            warnings.append(f"{ref} is still suggested and not confirmed.")

    for (source, target), refs in edge_pairs.items():
        if len(refs) > 1:
            warnings.append(f"Multiple edges share the same from/to pair {source} -> {target}: {', '.join(refs)}.")

    changes = doc.get("changes")
    validate_changes(changes, node_ids, errors, warnings)

    layout = doc.get("layout")
    validate_layout(layout, node_ids, errors, warnings)

    validation = doc.get("validation")
    if validation is not None and not isinstance(validation, dict):
        errors.append("validation must be an object when present.")

    add_semantic_warnings(nodes, edges, warnings)
    return errors, warnings


def valid_confidence(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    return 0 <= float(value) <= 1


def validate_layout(layout: Any, node_ids: set[str], errors: list[str], warnings: list[str]) -> None:
    if layout is None:
        return
    if not isinstance(layout, dict):
        errors.append("layout must be an object when present.")
        return

    require_string(layout.get("engine"), "layout", "engine", errors)
    layout_nodes = layout.get("nodes")
    if layout_nodes is None:
        warnings.append("layout is present but layout.nodes is missing.")
        return
    if not isinstance(layout_nodes, dict):
        errors.append("layout.nodes must be an object keyed by node id.")
        return

    for node_id, pos in layout_nodes.items():
        ref = f"layout.nodes[{node_id!r}]"
        if not isinstance(node_id, str):
            errors.append(f"{ref} key must be a string node id.")
        elif node_id not in node_ids:
            warnings.append(f"{ref} references an unknown node id.")
        if not isinstance(pos, dict):
            errors.append(f"{ref} must be an object with numeric x and y.")
            continue
        for axis in ("x", "y"):
            if axis not in pos:
                errors.append(f"{ref} missing required coordinate: {axis}.")
            elif not is_number(pos.get(axis)):
                errors.append(f"{ref}.{axis} must be a finite number.")


def validate_changes(changes: Any, node_ids: set[str], errors: list[str], warnings: list[str]) -> None:
    if changes is None:
        return
    if not isinstance(changes, dict):
        errors.append("changes must be an object when present.")
        return

    for field in ("change_set_id", "base_doc_id", "summary"):
        if is_blank(changes.get(field)):
            errors.append(f"changes.{field} is required when changes is present.")
        else:
            require_string(changes.get(field), "changes", field, errors)

    instructions = changes.get("agent_instructions")
    if instructions is not None:
        if not isinstance(instructions, list):
            errors.append("changes.agent_instructions must be an array of strings.")
        else:
            for index, item in enumerate(instructions):
                if not isinstance(item, str):
                    errors.append(f"changes.agent_instructions[{index}] must be a string.")

    added_node_ids: set[str] = set()
    for index, node in enumerate(as_list(changes, "added_nodes", errors)):
        ref = f"changes.added_nodes[{index}]"
        if not isinstance(node, dict):
            errors.append(f"{ref} must be an object.")
            continue
        validate_change_node(node, ref, errors)
        if isinstance(node.get("id"), str):
            added_node_ids.add(node["id"])

    known_change_node_ids = set(node_ids) | added_node_ids
    for index, edge in enumerate(as_list(changes, "added_edges", errors)):
        ref = f"changes.added_edges[{index}]"
        if not isinstance(edge, dict):
            errors.append(f"{ref} must be an object.")
            continue
        validate_change_edge(edge, ref, known_change_node_ids, errors)

    for field in ("modified_nodes", "modified_edges"):
        for index, item in enumerate(as_list(changes, field, errors)):
            ref = f"changes.{field}[{index}]"
            if not isinstance(item, dict):
                errors.append(f"{ref} must be an object.")
                continue
            for required in ("id", "field"):
                if is_blank(item.get(required)):
                    errors.append(f"{ref} missing required field: {required}.")
                else:
                    require_string(item.get(required), ref, required, errors)
            for required in ("before", "after"):
                if required not in item:
                    errors.append(f"{ref} missing required field: {required}.")

    for index, item in enumerate(as_list(changes, "removed_nodes", errors)):
        ref = f"changes.removed_nodes[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{ref} must be an object.")
            continue
        if is_blank(item.get("id")):
            errors.append(f"{ref} missing required field: id.")
        else:
            require_string(item.get("id"), ref, "id", errors)
        require_string(item.get("title"), ref, "title", errors)
        require_string(item.get("reason"), ref, "reason", errors)

    for index, item in enumerate(as_list(changes, "removed_edges", errors)):
        ref = f"changes.removed_edges[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{ref} must be an object.")
            continue
        for required in ("id", "from", "to", "type"):
            if is_blank(item.get(required)):
                errors.append(f"{ref} missing required field: {required}.")
            else:
                require_string(item.get(required), ref, required, errors)
        edge_type = item.get("type")
        if not is_blank(edge_type) and edge_type not in EDGE_TYPES:
            errors.append(f"{ref} has invalid edge type: {edge_type!r}.")
        require_string(item.get("reason"), ref, "reason", errors)

    for index, item in enumerate(as_list(changes, "layout_changes", errors)):
        ref = f"changes.layout_changes[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{ref} must be an object.")
            continue
        if is_blank(item.get("id")):
            errors.append(f"{ref} missing required field: id.")
        else:
            require_string(item.get("id"), ref, "id", errors)
        for side in ("before", "after"):
            point = item.get(side)
            if point is None:
                errors.append(f"{ref} missing required field: {side}.")
            elif not isinstance(point, dict):
                errors.append(f"{ref}.{side} must be an object with numeric x and y.")
            else:
                for axis in ("x", "y"):
                    if axis not in point:
                        errors.append(f"{ref}.{side} missing required coordinate: {axis}.")
                    elif not is_number(point.get(axis)):
                        errors.append(f"{ref}.{side}.{axis} must be a finite number.")

    for field in (
        "added_nodes",
        "modified_nodes",
        "removed_nodes",
        "added_edges",
        "modified_edges",
        "removed_edges",
        "layout_changes",
    ):
        if field in changes and changes.get(field) == []:
            warnings.append(f"changes.{field} is present but empty; omit it unless needed.")


def as_list(parent: dict[str, Any], field: str, errors: list[str]) -> list[Any]:
    value = parent.get(field)
    if value is None:
        return []
    if not isinstance(value, list):
        errors.append(f"changes.{field} must be an array when present.")
        return []
    return value


def validate_change_node(node: dict[str, Any], ref: str, errors: list[str]) -> None:
    for field in ("id", "type", "title", "status"):
        if is_blank(node.get(field)):
            errors.append(f"{ref} missing required field: {field}.")
        else:
            require_string(node.get(field), ref, field, errors)
    for field in ("description", "source", "priority", "notes"):
        require_string(node.get(field), ref, field, errors)
    validate_tags(node.get("tags"), ref, errors)
    node_type = node.get("type")
    status = node.get("status")
    if not is_blank(node_type) and node_type not in NODE_TYPES:
        errors.append(f"{ref} has invalid node type: {node_type!r}.")
    if not is_blank(status) and status not in STATUSES:
        errors.append(f"{ref} has invalid status: {status!r}.")
    confidence = node.get("confidence")
    if confidence is not None and not valid_confidence(confidence):
        errors.append(f"{ref} confidence must be a number between 0 and 1.")


def validate_change_edge(edge: dict[str, Any], ref: str, node_ids: set[str], errors: list[str]) -> None:
    for field in ("id", "from", "to", "type", "status"):
        if is_blank(edge.get(field)):
            errors.append(f"{ref} missing required field: {field}.")
        else:
            require_string(edge.get(field), ref, field, errors)
    for field in ("reason", "source"):
        require_string(edge.get(field), ref, field, errors)
    edge_type = edge.get("type")
    status = edge.get("status")
    source = edge.get("from")
    target = edge.get("to")
    if not is_blank(edge_type) and edge_type not in EDGE_TYPES:
        errors.append(f"{ref} has invalid edge type: {edge_type!r}.")
    if not is_blank(status) and status not in STATUSES:
        errors.append(f"{ref} has invalid status: {status!r}.")
    if not is_blank(source) and str(source) not in node_ids:
        errors.append(f"{ref} source node does not exist in current or added nodes: {source}.")
    if not is_blank(target) and str(target) not in node_ids:
        errors.append(f"{ref} target node does not exist in current or added nodes: {target}.")
    confidence = edge.get("confidence")
    if confidence is not None and not valid_confidence(confidence):
        errors.append(f"{ref} confidence must be a number between 0 and 1.")


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
        fence_errors, fence_warnings = validate_fence_hygiene(yaml_text, args.mode)
        errors.extend(fence_errors)
        warnings.extend(fence_warnings)
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
