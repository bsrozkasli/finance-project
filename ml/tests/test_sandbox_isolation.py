"""Nothing in data-service, backend, or frontend references the learning sandbox (spec §4.10)."""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PRODUCT_ROOTS = ("data-service", "backend", "frontend")
# Generated, vendored-dependency, and tool-cache directories; every dot-directory is skipped too.
SKIP_DIRS = {"venv", "node_modules", "target", "dist", "build", "coverage", "playwright-report", "test-results", "__pycache__"}
TEXT_SUFFIXES = {
    ".py", ".java", ".kt", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json",
    ".yml", ".yaml", ".toml", ".ini", ".cfg", ".txt", ".properties", ".xml", ".md", ".sh", ".ps1",
}
SANDBOX_REFERENCE = re.compile(r"ml[\/.]sandbox|\bfrom\s+sandbox\b|\bimport\s+sandbox\b")


def find_sandbox_references(root: Path, product_roots: tuple[str, ...] = PRODUCT_ROOTS) -> list[str]:
    hits: list[str] = []
    for product in product_roots:
        base = root / product
        if not base.exists():
            continue
        stack = [base]
        while stack:
            directory = stack.pop()
            for entry in directory.iterdir():
                if entry.is_dir():
                    if entry.name not in SKIP_DIRS and not entry.name.startswith("."):
                        stack.append(entry)
                elif entry.suffix in TEXT_SUFFIXES:
                    text = entry.read_text(encoding="utf-8", errors="ignore")
                    for number, line in enumerate(text.splitlines(), start=1):
                        if SANDBOX_REFERENCE.search(line):
                            hits.append(f"{entry.relative_to(root).as_posix()}:{number}")
    return sorted(hits)


def test_guard_detects_a_planted_reference(tmp_path):
    (tmp_path / "data-service" / "app").mkdir(parents=True)
    (tmp_path / "data-service" / "app" / "leak.py").write_text("from sandbox.lesson01_garch import models\n", encoding="utf-8")
    (tmp_path / "frontend" / "src").mkdir(parents=True)
    (tmp_path / "frontend" / "src" / "leak.ts").write_text("import x from '../../ml/sandbox/x';\n", encoding="utf-8")
    (tmp_path / "frontend" / "node_modules").mkdir()
    (tmp_path / "frontend" / "node_modules" / "ignored.js").write_text("ml/sandbox\n", encoding="utf-8")

    assert find_sandbox_references(tmp_path) == ["data-service/app/leak.py:1", "frontend/src/leak.ts:1"]


def test_product_runtimes_do_not_reference_the_sandbox():
    assert find_sandbox_references(REPO_ROOT) == []
