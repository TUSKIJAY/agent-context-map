from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKER = REPO_ROOT / "scripts" / "check-project-harness.py"

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

CONTENT = {
    "AGENTS.md": "INSTRUCTIONS.md PROGRESS.md HANDOFF.md PROJECT_MAP.md docs/README.md 直接执行 git status --short --branch\n",
    "CLAUDE.md": "Rules: AGENTS.md\n",
    "INSTRUCTIONS.md": "## Objective\n## Stable Project Facts\n## Stable Invariants\n## Verification Baseline\nnpm run build\n",
    "PROGRESS.md": "## Current Status\n## In Progress\n## Blocked\n## To Do\n## Verification Baseline\n## Historical Redirects\n",
    "HANDOFF.md": "## Resume Point\n## Last Verification\n## Next Gate\n",
    "PROJECT_MAP.md": "AGENTS.md src/App.jsx docs/README.md scripts/check-project-harness.py\n",
    "docs/README.md": "exec-plans/ decisions/ optimization/ progress-archive/\n",
    "docs/exec-plans/roadmap.md": "直接执行 proposed active completed\n",
    "docs/exec-plans/plan-template.md": "Status: Proposed\nContext And Evidence\n## 4. Phases\nReview And Activation Gate\n",
    "docs/exec-plans/proposed/index.md": "Proposed Exec Plans\n",
    "docs/exec-plans/active/index.md": "Active Exec Plans\n",
    "docs/exec-plans/completed/index.md": "Completed Exec Plans\n",
    "docs/exec-plans/reviews/index.md": "Exec Plan Reviews\n",
    "docs/exec-plans/reviews/review-template.md": "Review target\nVerdict\n## Findings\n",
    "docs/decisions/index.md": "Decision Index\n",
    "docs/decisions/decision-template.md": "Status: Proposed\n## Context\n## Decision\n## Activation Boundary\n",
    "docs/optimization/SOP.md": "不授权实施 proposed active\n",
    "docs/optimization/index.md": "Optimization Index\n",
    "docs/optimization/record-template.md": "Record-only OPT-001 Lifecycle status\n",
    "docs/progress-archive/index.md": "Progress Archive Index\nCurrent-state redirect\n",
}


class HarnessCheckerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        for relative in MINIMAL + GOVERNED:
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(CONTENT.get(relative, "# present\n"), encoding="utf-8")
        (self.root / ".harness/config.json").write_text(
            json.dumps(
                {
                    "schema_version": "project-harness-config-v1",
                    "profile": "governed",
                    "project_name": "Fixture",
                    "project_type": "Test",
                    "verification_commands": ["test command"],
                }
            ),
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def run_checker(self) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
        result = subprocess.run(
            [sys.executable, str(CHECKER), "--root", str(self.root), "--profile", "governed"],
            check=False,
            capture_output=True,
            text=True,
        )
        return result, json.loads(result.stdout)

    def test_complete_governed_fixture_passes(self) -> None:
        result, payload = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(payload["passed"])

    def test_empty_required_file_fails(self) -> None:
        (self.root / "AGENTS.md").write_text("", encoding="utf-8")
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("AGENTS.md", payload["empty"])

    def test_missing_project_map_fails(self) -> None:
        (self.root / "PROJECT_MAP.md").unlink()
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("PROJECT_MAP.md", payload["missing"])

    def test_missing_governed_template_fails(self) -> None:
        relative = "docs/decisions/decision-template.md"
        (self.root / relative).unlink()
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(relative, payload["missing"])

    def test_claude_without_agents_pointer_fails(self) -> None:
        (self.root / "CLAUDE.md").write_text("# duplicated rules\n", encoding="utf-8")
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(any(item["path"] == "CLAUDE.md" for item in payload["content_errors"]))

    def test_empty_verification_commands_fail(self) -> None:
        config = json.loads((self.root / ".harness/config.json").read_text(encoding="utf-8"))
        config["verification_commands"] = []
        (self.root / ".harness/config.json").write_text(json.dumps(config), encoding="utf-8")
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("verification_commands", str(payload["config_error"]))


if __name__ == "__main__":
    unittest.main()
