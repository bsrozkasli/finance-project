"""Pytest environment isolation for the data-service test suite."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEST_CACHE = ROOT / ".test-cache"
TRADINGAGENTS_CACHE = TEST_CACHE / "tradingagents"

for path in (
    TEST_CACHE,
    TRADINGAGENTS_CACHE / "cache",
    TRADINGAGENTS_CACHE / "logs",
    TRADINGAGENTS_CACHE / "memory",
):
    path.mkdir(parents=True, exist_ok=True)

# Keep imports deterministic when pytest runs from different launch contexts.
root_text = str(ROOT)
if sys.path[0] != root_text:
    try:
        sys.path.remove(root_text)
    except ValueError:
        pass
    sys.path.insert(0, root_text)

# The bundled TradingAgents project defaults to ~/.tradingagents. Tests must not
# write outside the repository or require user-profile permissions.
os.environ.setdefault("TRADINGAGENTS_CACHE_DIR", str(TRADINGAGENTS_CACHE / "cache"))
os.environ.setdefault("TRADINGAGENTS_RESULTS_DIR", str(TRADINGAGENTS_CACHE / "logs"))
os.environ.setdefault(
    "TRADINGAGENTS_MEMORY_LOG_PATH",
    str(TRADINGAGENTS_CACHE / "memory" / "trading_memory.md"),
)