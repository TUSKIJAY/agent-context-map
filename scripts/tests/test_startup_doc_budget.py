from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKER = REPO_ROOT / "scripts" / "check-startup-doc-budget.py"
STARTUP_DOCS = ("AGENTS.md", "HANDOFF.md", "INSTRUCTIONS.md", "PROGRESS.md", "PROJECT_MAP.md")


class StartupDocBudgetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        for relative in STARTUP_DOCS:
            (self.root / relative).write_text("# concise\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def run_checker(self) -> tuple[subprocess.CompletedProcess[str], dict[str, object]]:
        result = subprocess.run(
            [sys.executable, str(CHECKER), "--root", str(self.root)],
            check=False,
            capture_output=True,
            text=True,
        )
        return result, json.loads(result.stdout)

    def test_project_map_is_budgeted(self) -> None:
        result, payload = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        paths = {item["path"] for item in payload["documents"]}
        self.assertIn("PROJECT_MAP.md", paths)

    def test_oversized_project_map_fails_hard_limit(self) -> None:
        oversized = "\n".join(f"line {index}" for index in range(301)) + "\n"
        (self.root / "PROJECT_MAP.md").write_text(oversized, encoding="utf-8")
        result, payload = self.run_checker()
        self.assertNotEqual(result.returncode, 0)
        project_map = next(item for item in payload["documents"] if item["path"] == "PROJECT_MAP.md")
        self.assertTrue(project_map["hard_limit_exceeded"])
        self.assertEqual(project_map["recommended_action"], "split detailed subsystem maps behind indexed docs")


if __name__ == "__main__":
    unittest.main()
