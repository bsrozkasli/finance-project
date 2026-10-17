# Local Model Decision-Support Plan 5 — C6 Learning Sandbox Lesson 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guarded `ml/sandbox/` exists that no runtime can import, and lesson 1 simulates GARCH(1,1) with known parameters, fits EWMA and GARCH, evaluates them with a rolling-origin walk-forward and QLIKE, and proves parameter recovery.

**Architecture:** `ml/sandbox/` is a Python package inside the Plan 2 workspace with its own `requirements.txt` (installed into `ml/.venv`). A repository test scans `data-service/`, `backend/`, and `frontend/` for any sandbox reference. Lesson 1 is three small modules — `models` (recursions, likelihood, fit), `simulate`, `evaluation` (QLIKE, walk-forward) — plus a printable `run_lesson` and a `LESSON.md` written for the owner as a learner. All data is simulated; no provider or owner data is read.

**Tech Stack:** Python 3.13 (`ml/.venv`), numpy, scipy (`optimize.minimize`, L-BFGS-B), pytest.

**Plan Set:** Plan 5 of 5 in `docs/superpowers/plans/2026-10-15-local-model-decision-support-plan-set.md`.

**Depends On:** Plan 2 (`ml/.venv`, `ml/pytest.ini`, `REPO_ROOT` pattern from `ml/tests/test_repository_hygiene.py`). Independent of Plans 3 and 4.

**Produces:**
- `ml/sandbox/README.md`, `ml/sandbox/requirements.txt`, `ml/tests/test_sandbox_isolation.py` with `find_sandbox_references(root: Path, product_roots=("data-service", "backend", "frontend")) -> list[str]`.
- `sandbox.lesson01_garch.models`: `GarchParams(omega, alpha, beta)` with `persistence`, `unconditional_variance`; `GarchFit(params, negative_log_likelihood, converged)`; `garch_variance_path(returns, params, initial_variance) -> np.ndarray` (length n + 1); `ewma_variance_path(returns, decay, initial_variance) -> np.ndarray`; `garch_negative_log_likelihood(returns, params, initial_variance) -> float`; `fit_garch(returns) -> GarchFit`.
- `sandbox.lesson01_garch.simulate`: `TRUE_PARAMS = GarchParams(0.02, 0.08, 0.90)`; `GarchPath(returns, variances)`; `simulate_garch(n, params, seed, burn_in=500) -> GarchPath`.
- `sandbox.lesson01_garch.evaluation`: `EWMA_DECAY = 0.94`; `qlike(proxy, forecast) -> float`; `WalkForward(index, garch_forecast, ewma_forecast, refits)`; `walk_forward(returns, initial_train=2000, refit_every=250) -> WalkForward`.
- `sandbox.lesson01_garch.run_lesson` CLI; `ml/sandbox/lesson01_garch/LESSON.md`.

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` §4.10, §5 P1.5, §8 bullet 5, §9 sandbox bullet, §11 row C6.

## Locked Decisions

- **Units.** Returns in percent; `TRUE_PARAMS = (ω 0.02, α 0.08, β 0.90)` → 1% daily volatility, persistence 0.98. Percent units keep `ω` away from optimizer tolerances (a planning run in decimal units with Nelder-Mead returned `ω` rounded to 1e-6 steps).
- **Variance-path convention.** `path[t]` is the forecast for `returns[t]` made from `returns[:t]`; `path[0]` is the supplied initial variance; `path[-1]` is the next unseen day.
- **Fit.** Gaussian MLE, L-BFGS-B, start `(0.1·var, 0.05, 0.85)`, bounds `ω ∈ [1e-8, 10·var]`, `α ∈ [0, 0.5]`, `β ∈ [0, 0.9999]`, penalty `1e12` when `α + β ≥ 0.9999`, initial variance = sample variance of the fitted window.
- **Recovery tolerances** (seed 20261015, n = 5000): `|α − 0.08| ≤ 0.03`, `|β − 0.90| ≤ 0.05`, `|α + β − 0.98| ≤ 0.02`, unconditional variance within 25%. Planning across seeds 1–7 and 20261015 gave `|Δα| ≤ 0.017`, `|Δβ| ≤ 0.019`, `|Δpersistence| ≤ 0.009`.
- **Walk-forward.** Expanding window, first fit on 2000 days, refit every 250, 3000 forecast days, 12 refits. EWMA uses `λ = 0.94` and the sample variance of the first 2000 days as its start.
- **QLIKE** = `mean(p/h − ln(p/h) − 1)`; raises `ValueError` for any non-positive proxy or forecast.
- **Guard scope.** Text files under the three product roots; skips dot-directories and `venv`, `node_modules`, `target`, `dist`, `build`, `coverage`, `playwright-report`, `test-results`, `__pycache__`. Pattern: `ml/sandbox`, `ml\sandbox`, `ml.sandbox`, `from sandbox`, `import sandbox`. Planning run on the real repository: no hits, 0.19 s.
- **Sandbox output is never committed** beyond code and `LESSON.md`; nothing is written to disk by `run_lesson`.

## Global Constraints

- "Nothing under `ml/sandbox/` is imported by `data-service`, `backend`, or `frontend`; a test enforces this." (spec §4.10)
- "Lesson 1: simulate GARCH(1,1) series with known parameters; fit EWMA and GARCH; evaluate with rolling-origin walk-forward and QLIKE; confirm parameter recovery. This rehearses C2 on synthetic data only." (spec §5 P1.5)
- "Sandbox: deterministic seeds; the import-guard test scans `data-service/`, `backend/`, and `frontend/` for references to `ml/sandbox`." (spec §9)
- "Derive expected values independently from a hand-calculated financial formula, written requirement, or logical deduction." (`docs/agent/verification.md`)
- Preserve unrelated working-tree changes; no file outside `ml/` changes.

## Review Focus

- **The guard passes because it scans nothing.** A planted reference in a temporary `data-service/` and `frontend/` must be found, and one inside `node_modules` must not. Task 1 `test_guard_detects_a_planted_reference`.
- **Look-ahead in the walk-forward.** Multiplying every return from day 2250 on by 3 must leave every forecast for days ≤ 2250 unchanged. Task 3 `test_walk_forward_uses_only_past_returns`.
- **Off-by-one in the variance recursion.** `[1, −2]` with `(0.1, 0.2, 0.7)` and `h0 = 1` must give `[1.0, 1.0, 1.6]`. Task 2 `test_garch_recursion_matches_hand_calculation`.
- **QLIKE on zero proxies.** A zero squared return would make `ln` explode; it must raise `ValueError`. Task 3 `test_qlike_rejects_non_positive_inputs`.
- **"Recovery" asserted against the fit itself.** Recovery is checked against `TRUE_PARAMS`, which the simulation used, with tolerances fixed in this plan. Task 2 `test_fit_recovers_simulated_parameters`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `ml/sandbox/__init__.py` | Create | Empty package marker |
| `ml/sandbox/README.md` | Create | Purpose and isolation rule |
| `ml/sandbox/requirements.txt` | Create | Sandbox dependency file |
| `ml/sandbox/tests/__init__.py` | Create | Empty package marker |
| `ml/tests/test_sandbox_isolation.py` | Create | Import guard |
| `ml/pytest.ini` | Modify | Add `sandbox/tests` to `testpaths` |
| `ml/sandbox/lesson01_garch/__init__.py` | Create | Empty package marker |
| `ml/sandbox/lesson01_garch/models.py` | Create | GARCH/EWMA recursions, likelihood, fit |
| `ml/sandbox/lesson01_garch/simulate.py` | Create | Known-parameter simulation |
| `ml/sandbox/tests/test_lesson01_models.py` | Create | Recursions, likelihood, recovery |
| `ml/sandbox/lesson01_garch/evaluation.py` | Create | QLIKE and walk-forward |
| `ml/sandbox/tests/test_lesson01_evaluation.py` | Create | Loss and no-look-ahead |
| `ml/sandbox/lesson01_garch/run_lesson.py` | Create | Printable lesson run |
| `ml/sandbox/lesson01_garch/LESSON.md` | Create | Learner notes and exercises |

Test counts below assume this plan runs directly after Plan 2 (26 tests). If Plan 3 ran first, add its 25 tests to every full-suite count.

---

## Task 1: Sandbox Scaffold and Import Guard

**Files:**
- Create: `ml/sandbox/__init__.py`, `ml/sandbox/README.md`, `ml/sandbox/requirements.txt`, `ml/sandbox/tests/__init__.py`
- Modify: `ml/pytest.ini`
- Test: `ml/tests/test_sandbox_isolation.py`

**Interfaces:**
- Consumes: `REPO_ROOT = Path(__file__).resolve().parents[2]` pattern (Plan 2).
- Produces: `find_sandbox_references` and the guard test.
- Preserves: every file under `data-service/`, `backend/`, `frontend/` (read only).

**Acceptance Evidence:**
- `pytest tests/test_sandbox_isolation.py -v` → 2 passed.

- [ ] **Step 1: Confirm the precondition — nothing enforces isolation yet**

Run (from `ml/`): `.\.venv\Scripts\python.exe -m pytest tests/test_sandbox_isolation.py -q`

Expected: `ERROR: file or directory not found: tests/test_sandbox_isolation.py` (exit code 4).

- [ ] **Step 2: Create the scaffold**

`ml/sandbox/requirements.txt`:

```text
# Learning sandbox dependencies (spec §5 P1.5). Installed into ml/.venv; never imported by any runtime.
numpy>=2.2
scipy>=1.14
pytest>=8.2
```

Install it (from `ml/`): `.\.venv\Scripts\python.exe -m pip install -r sandbox/requirements.txt` — Expected: "Requirement already satisfied" for all three (Plan 2 installed them). If anything new is installed, regenerate `requirements.lock.txt` with `pip freeze` and include it in this commit.

`ml/sandbox/README.md` — three short sections: **Purpose** (owner's learning track, spec §1 goal 2; output never enters the product); **Isolation** (quote spec §4.10; name the guard test; "do not import `lifecycle` or `dq` from lessons either, so lessons stay self-contained"); **Lessons** (table: `lesson01_garch` — GARCH(1,1) recovery and walk-forward QLIKE — status Phase 1; lessons 2–3 gated on lesson 1 per spec §5 Phase 2).

`ml/pytest.ini`: append ` sandbox/tests` to the `testpaths` line (result `testpaths = tests sandbox/tests`, or `tests dq/tests sandbox/tests` if Plan 3 ran first).

- [ ] **Step 3: Write the guard** — `ml/tests/test_sandbox_isolation.py`:

```python
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
SANDBOX_REFERENCE = re.compile(r"ml[\\/.]sandbox|\bfrom\s+sandbox\b|\bimport\s+sandbox\b")


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
```

- [ ] **Step 4: Run the focused check**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_sandbox_isolation.py -v` — Expected: 2 passed (the planted reference is found; the real repository is clean).

- [ ] **Step 5: Run the plan-level check**

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 28 passed.

- [ ] **Step 6: Commit**

```powershell
git add ml/sandbox/__init__.py ml/sandbox/README.md ml/sandbox/requirements.txt ml/sandbox/tests/__init__.py ml/tests/test_sandbox_isolation.py ml/pytest.ini
git diff --cached --check
git commit -m "test(ml): guard product runtimes against sandbox imports"
```

---

## Task 2: GARCH/EWMA Models, Simulation, and Parameter Recovery

**Files:**
- Create: `ml/sandbox/lesson01_garch/__init__.py`, `ml/sandbox/lesson01_garch/models.py`, `ml/sandbox/lesson01_garch/simulate.py`
- Test: `ml/sandbox/tests/test_lesson01_models.py`

**Interfaces:**
- Consumes: numpy, scipy.
- Produces: the `models` and `simulate` APIs under **Produces**.
- Preserves: nothing outside `ml/sandbox/` changes.

**Acceptance Evidence:**
- `pytest sandbox/tests/test_lesson01_models.py -v` → 6 passed.

- [ ] **Step 1: Write the failing tests** — `ml/sandbox/tests/test_lesson01_models.py`:

```python
"""Lesson 1 models: GARCH(1,1) and EWMA recursions, likelihood, simulation, recovery.

Expected values come from hand-worked recursions or from the known simulation
parameters, never from the fitted output itself.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from sandbox.lesson01_garch.models import (
    GarchParams,
    ewma_variance_path,
    fit_garch,
    garch_negative_log_likelihood,
    garch_variance_path,
)
from sandbox.lesson01_garch.simulate import TRUE_PARAMS, simulate_garch

SEED = 20261015

@pytest.fixture(scope="module")
def path():
    return simulate_garch(5000, TRUE_PARAMS, SEED)


def test_true_parameters_describe_one_percent_daily_volatility():
    assert TRUE_PARAMS.persistence == pytest.approx(0.98)
    assert TRUE_PARAMS.unconditional_variance == pytest.approx(1.0)


def test_garch_recursion_matches_hand_calculation():
    # h1 = 0.1 + 0.2*1^2 + 0.7*1 = 1.0 ; h2 = 0.1 + 0.2*(-2)^2 + 0.7*1.0 = 1.6
    variance = garch_variance_path(np.array([1.0, -2.0]), GarchParams(0.1, 0.2, 0.7), initial_variance=1.0)
    assert variance.tolist() == pytest.approx([1.0, 1.0, 1.6])


def test_ewma_recursion_matches_hand_calculation():
    # h1 = 0.94*1 + 0.06*1 = 1.0 ; h2 = 0.94*1.0 + 0.06*4 = 1.18
    variance = ewma_variance_path(np.array([1.0, -2.0]), decay=0.94, initial_variance=1.0)
    assert variance.tolist() == pytest.approx([1.0, 1.0, 1.18])


def test_negative_log_likelihood_matches_hand_calculation():
    # one return r=1 with variance 1: 0.5 * (ln(2*pi) + ln(1) + 1)
    value = garch_negative_log_likelihood(np.array([1.0]), GarchParams(0.1, 0.2, 0.7), initial_variance=1.0)
    assert value == pytest.approx(0.5 * (math.log(2 * math.pi) + 1.0))


def test_simulation_is_deterministic_and_matches_its_parameters(path):
    again = simulate_garch(5000, TRUE_PARAMS, SEED)

    assert np.array_equal(path.returns, again.returns)
    assert np.var(path.returns) == pytest.approx(TRUE_PARAMS.unconditional_variance, rel=0.25)


def test_fit_recovers_simulated_parameters(path):
    fit = fit_garch(path.returns)

    assert fit.converged
    assert fit.params.alpha == pytest.approx(TRUE_PARAMS.alpha, abs=0.03)
    assert fit.params.beta == pytest.approx(TRUE_PARAMS.beta, abs=0.05)
    assert fit.params.persistence == pytest.approx(TRUE_PARAMS.persistence, abs=0.02)
    assert fit.params.unconditional_variance == pytest.approx(TRUE_PARAMS.unconditional_variance, rel=0.25)
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest sandbox/tests/test_lesson01_models.py -v`

Expected: `ModuleNotFoundError: No module named 'sandbox.lesson01_garch'`.

- [ ] **Step 3: Implement `models.py`**

```python
"""GARCH(1,1) and EWMA conditional-variance models (sandbox lesson 1).

Units: returns in percent, so a 1% daily move is ``1.0`` and variances are in %².
``variance_path[t]`` is the variance forecast for ``returns[t]`` made with
``returns[:t]`` only; the last element is the forecast for the next, unseen day.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize

_LOG_2PI = float(np.log(2.0 * np.pi))
_MAX_PERSISTENCE = 0.9999


@dataclass(frozen=True)
class GarchParams:
    omega: float
    alpha: float
    beta: float

    @property
    def persistence(self) -> float:
        return self.alpha + self.beta

    @property
    def unconditional_variance(self) -> float:
        return self.omega / (1.0 - self.persistence)


@dataclass(frozen=True)
class GarchFit:
    params: GarchParams
    negative_log_likelihood: float
    converged: bool


def garch_variance_path(returns: np.ndarray, params: GarchParams, initial_variance: float) -> np.ndarray:
    variance = np.empty(len(returns) + 1)
    variance[0] = initial_variance
    for t, value in enumerate(returns):
        variance[t + 1] = params.omega + params.alpha * value * value + params.beta * variance[t]
    return variance


def ewma_variance_path(returns: np.ndarray, decay: float, initial_variance: float) -> np.ndarray:
    variance = np.empty(len(returns) + 1)
    variance[0] = initial_variance
    for t, value in enumerate(returns):
        variance[t + 1] = decay * variance[t] + (1.0 - decay) * value * value
    return variance


def garch_negative_log_likelihood(returns: np.ndarray, params: GarchParams, initial_variance: float) -> float:
    variance = garch_variance_path(returns, params, initial_variance)[:-1]
    return float(0.5 * np.sum(_LOG_2PI + np.log(variance) + returns * returns / variance))


def fit_garch(returns: np.ndarray) -> GarchFit:
    """Gaussian maximum likelihood with L-BFGS-B; alpha + beta < 1 enforced by a penalty."""
    sample_variance = float(np.var(returns))

    def objective(vector: np.ndarray) -> float:
        params = GarchParams(*vector)
        if params.persistence >= _MAX_PERSISTENCE:
            return 1e12
        return garch_negative_log_likelihood(returns, params, sample_variance)

    start = np.array([0.1 * sample_variance, 0.05, 0.85])
    bounds = [(1e-8, 10.0 * sample_variance), (0.0, 0.5), (0.0, _MAX_PERSISTENCE)]
    result = minimize(objective, start, method="L-BFGS-B", bounds=bounds)
    return GarchFit(GarchParams(*map(float, result.x)), float(result.fun), bool(result.success))
```

- [ ] **Step 4: Implement `simulate.py`**

```python
"""Simulate GARCH(1,1) returns with known parameters (sandbox lesson 1)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sandbox.lesson01_garch.models import GarchParams

TRUE_PARAMS = GarchParams(omega=0.02, alpha=0.08, beta=0.90)  # 1% daily volatility, persistence 0.98


@dataclass(frozen=True)
class GarchPath:
    returns: np.ndarray    # percent returns
    variances: np.ndarray  # true conditional variance of each return


def simulate_garch(n: int, params: GarchParams, seed: int, burn_in: int = 500) -> GarchPath:
    rng = np.random.default_rng(seed)
    shocks = rng.standard_normal(n + burn_in)
    returns = np.empty(n + burn_in)
    variances = np.empty(n + burn_in)
    variance = params.unconditional_variance
    for t in range(n + burn_in):
        variances[t] = variance
        returns[t] = np.sqrt(variance) * shocks[t]
        variance = params.omega + params.alpha * returns[t] ** 2 + params.beta * variance
    return GarchPath(returns[burn_in:], variances[burn_in:])
```

- [ ] **Step 5: Run the focused and plan-level checks**

Run: `.\.venv\Scripts\python.exe -m pytest sandbox/tests/test_lesson01_models.py -v` — Expected: 6 passed. The planning run fitted `α = 0.0802`, `β = 0.8909`, persistence `0.9711`, unconditional variance `0.925` on this seed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 34 passed.

- [ ] **Step 6: Commit**

```powershell
git add ml/sandbox/lesson01_garch/__init__.py ml/sandbox/lesson01_garch/models.py ml/sandbox/lesson01_garch/simulate.py ml/sandbox/tests/test_lesson01_models.py
git diff --cached --check
git commit -m "feat(ml): add sandbox GARCH and EWMA models with recovery test"
```

---

## Task 3: Walk-Forward QLIKE Evaluation and the Lesson

**Files:**
- Create: `ml/sandbox/lesson01_garch/evaluation.py`, `ml/sandbox/lesson01_garch/run_lesson.py`, `ml/sandbox/lesson01_garch/LESSON.md`
- Test: `ml/sandbox/tests/test_lesson01_evaluation.py`

**Interfaces:**
- Consumes: Task 2 APIs.
- Produces: `qlike`, `walk_forward`, `WalkForward`, `EWMA_DECAY`; CLI `python -m sandbox.lesson01_garch.run_lesson` (prints, writes nothing).
- Preserves: Task 2 behavior.

**Acceptance Evidence:**
- `pytest sandbox/tests/test_lesson01_evaluation.py -v` → 5 passed.
- `run_lesson` output pasted into the PR (spec §8: recovery and walk-forward QLIKE reported).

- [ ] **Step 1: Write the failing tests** — `ml/sandbox/tests/test_lesson01_evaluation.py`:

```python
"""Lesson 1 evaluation: QLIKE and the rolling-origin walk-forward."""

from __future__ import annotations

import math

import numpy as np
import pytest

from sandbox.lesson01_garch.evaluation import qlike, walk_forward
from sandbox.lesson01_garch.simulate import TRUE_PARAMS, simulate_garch

SEED = 20261015

@pytest.fixture(scope="module")
def path():
    return simulate_garch(5000, TRUE_PARAMS, SEED)


@pytest.mark.parametrize(
    ("proxy", "forecast", "expected"),
    [([1.0, 4.0], [1.0, 4.0], 0.0), ([2.0], [1.0], 2.0 - math.log(2.0) - 1.0)],
)
def test_qlike_matches_hand_calculation(proxy, forecast, expected):
    assert qlike(np.array(proxy), np.array(forecast)) == pytest.approx(expected)


def test_qlike_rejects_non_positive_inputs():
    with pytest.raises(ValueError):
        qlike(np.array([0.0]), np.array([1.0]))
    with pytest.raises(ValueError):
        qlike(np.array([1.0]), np.array([-1.0]))


def test_walk_forward_uses_only_past_returns(path):
    cut = 2250  # a refit boundary
    changed = path.returns.copy()
    changed[cut:] *= 3.0

    original = walk_forward(path.returns[:2600])
    perturbed = walk_forward(changed[:2600])

    before = original.index <= cut
    assert np.array_equal(original.garch_forecast[before], perturbed.garch_forecast[before])
    assert np.array_equal(original.ewma_forecast[before], perturbed.ewma_forecast[before])
    assert not np.array_equal(original.garch_forecast[~before], perturbed.garch_forecast[~before])


def test_garch_beats_ewma_on_garch_data(path):
    result = walk_forward(path.returns)
    truth = path.variances[result.index]

    assert len(result.index) == 3000 and len(result.refits) == 12
    assert qlike(truth, result.garch_forecast) < qlike(truth, result.ewma_forecast)
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest sandbox/tests/test_lesson01_evaluation.py -v`

Expected: `ModuleNotFoundError: No module named 'sandbox.lesson01_garch.evaluation'`.

- [ ] **Step 3: Implement `evaluation.py`**

```python
"""Rolling-origin walk-forward evaluation with the QLIKE loss (sandbox lesson 1)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sandbox.lesson01_garch.models import GarchParams, ewma_variance_path, fit_garch, garch_variance_path

EWMA_DECAY = 0.94  # RiskMetrics daily decay


def qlike(proxy: np.ndarray, forecast: np.ndarray) -> float:
    """Mean of proxy/forecast - ln(proxy/forecast) - 1 (Patton 2011); 0 for a perfect forecast."""
    proxy, forecast = np.asarray(proxy, dtype=float), np.asarray(forecast, dtype=float)
    if np.any(proxy <= 0) or np.any(forecast <= 0):
        raise ValueError("QLIKE needs strictly positive proxies and forecasts")
    ratio = proxy / forecast
    return float(np.mean(ratio - np.log(ratio) - 1.0))


@dataclass(frozen=True)
class WalkForward:
    index: np.ndarray            # positions of the forecast days
    garch_forecast: np.ndarray
    ewma_forecast: np.ndarray
    refits: tuple[GarchParams, ...]


def walk_forward(returns: np.ndarray, initial_train: int = 2000, refit_every: int = 250) -> WalkForward:
    """Expanding-window GARCH refit every ``refit_every`` days; each forecast uses only earlier returns."""
    index_blocks, garch_blocks, refits = [], [], []
    for start in range(initial_train, len(returns), refit_every):
        stop = min(start + refit_every, len(returns))
        train = returns[:start]
        params = fit_garch(train).params
        path = garch_variance_path(returns[:stop], params, float(np.var(train)))
        index_blocks.append(np.arange(start, stop))
        garch_blocks.append(path[start:stop])
        refits.append(params)
    index = np.concatenate(index_blocks)
    ewma_path = ewma_variance_path(returns, EWMA_DECAY, float(np.var(returns[:initial_train])))
    return WalkForward(index, np.concatenate(garch_blocks), ewma_path[index], tuple(refits))
```

- [ ] **Step 4: Implement `run_lesson.py`**

```python
"""Run lesson 1 end to end and print what was learned.

Usage (from ``ml/``)::

    .\\.venv\\Scripts\\python.exe -m sandbox.lesson01_garch.run_lesson
"""

from __future__ import annotations

from sandbox.lesson01_garch.evaluation import qlike, walk_forward
from sandbox.lesson01_garch.models import fit_garch
from sandbox.lesson01_garch.simulate import TRUE_PARAMS, simulate_garch

SEED = 20261015
N_DAYS = 5000


def main() -> int:
    path = simulate_garch(N_DAYS, TRUE_PARAMS, SEED)
    fit = fit_garch(path.returns)
    print("Parameter recovery (true vs fitted)")
    for name in ("omega", "alpha", "beta", "persistence", "unconditional_variance"):
        print(f"  {name:<22} {getattr(TRUE_PARAMS, name):>9.4f} {getattr(fit.params, name):>9.4f}")
    result = walk_forward(path.returns)
    truth = path.variances[result.index]
    proxy = path.returns[result.index] ** 2
    print(f"Walk-forward: {len(result.index)} forecast days, {len(result.refits)} refits")
    print(f"  QLIKE vs true variance   GARCH {qlike(truth, result.garch_forecast):.4f}   EWMA {qlike(truth, result.ewma_forecast):.4f}")
    print(f"  QLIKE vs squared return  GARCH {qlike(proxy, result.garch_forecast):.4f}   EWMA {qlike(proxy, result.ewma_forecast):.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Write `LESSON.md`**

````markdown
# Lesson 1 — Volatility Models on Data Whose Truth You Know

Sandbox only. Nothing here enters the product (spec §4.10). This lesson rehearses
C2 (forward volatility) on synthetic data, so every number can be checked
against a known answer before real prices are ever involved.

## 1. Why simulate first

On real prices nobody knows the true volatility, so a model that "looks good"
cannot be checked. Simulating from a model with known parameters gives you the
answer key: if the estimator cannot recover parameters it generated itself, it
will not be trustworthy on real data.

## 2. The models

Returns `r_t` are in percent. `h_t` is the variance of `r_t` given everything
before day `t`.

- **GARCH(1,1):** `h_t = ω + α·r_{t-1}² + β·h_{t-1}`.
  `α` is how strongly yesterday's surprise moves today's variance, `β` is how
  long variance remembers, `α + β` is the persistence, and `ω / (1 − α − β)`
  is the long-run variance. The lesson uses `ω = 0.02, α = 0.08, β = 0.90`:
  1% daily volatility, persistence 0.98.
- **EWMA (RiskMetrics):** `h_t = λ·h_{t-1} + (1 − λ)·r_{t-1}²` with `λ = 0.94`.
  It is GARCH with `ω = 0` and `α + β = 1`: no long-run anchor, nothing to fit.

## 3. Fitting by maximum likelihood

With Gaussian shocks, the negative log-likelihood is
`½ Σ [ln(2π) + ln h_t + r_t² / h_t]`. `fit_garch` minimizes it with L-BFGS-B
under bounds, and rejects `α + β ≥ 0.9999` with a large penalty. Read
`models.py` and check the recursion against the two hand-worked numbers in
`test_garch_recursion_matches_hand_calculation`.

## 4. Evaluating forecasts honestly

- **Rolling origin, expanding window.** Fit on the first 2000 days, forecast
  the next 250 one day at a time, then refit on everything seen so far. A
  forecast for day `t` may only use `r_0 … r_{t-1}`;
  `test_walk_forward_uses_only_past_returns` proves it by changing the future
  and checking that past forecasts do not move.
- **QLIKE loss:** `mean(p/h − ln(p/h) − 1)`, where `p` is the proxy for true
  variance. It is 0 for a perfect forecast and punishes under-forecasting risk
  more than over-forecasting. With synthetic data you can use the true variance
  as `p`; on real data only a noisy proxy such as `r_t²` exists.

## 5. Run it

From `ml/`:

```powershell
.\.venv\Scripts\python.exe -m sandbox.lesson01_garch.run_lesson
```

Expected output on seed 20261015 (numpy 2.5.4, scipy 1.18.1):

```text
Parameter recovery (true vs fitted)
  omega                     0.0200    0.0268
  alpha                     0.0800    0.0802
  beta                      0.9000    0.8909
  persistence               0.9800    0.9711
  unconditional_variance    1.0000    0.9250
Walk-forward: 3000 forecast days, 12 refits
  QLIKE vs true variance   GARCH 0.0010   EWMA 0.0119
  QLIKE vs squared return  GARCH 1.3189   EWMA 1.3268
```

## 6. What to notice

1. `α` is recovered almost exactly, `ω` least well: the long-run level is
   hard to pin down from 5000 days when persistence is near 1.
2. Against the true variance GARCH is about ten times better than EWMA; against
   `r²` the gap almost vanishes. The proxy's noise dominates — this is why
   spec §5 Phase 3 demands a Diebold-Mariano test before C2 can replace EWMA.
3. Both numbers come from data generated by GARCH itself. Real returns have fat
   tails, jumps, and regime changes, so this is the best case for GARCH.

## 7. Exercises (not graded, not committed)

1. Change the seed five times and write down the spread of fitted `α`, `β`.
2. Simulate with Student-t(5) shocks (see `dq/fixtures.py`) and refit with the
   Gaussian likelihood. Which parameter is biased?
3. Replace `fit_garch`'s L-BFGS-B with Nelder-Mead and compare `ω` recovery.
4. Compute QLIKE for a constant forecast equal to the sample variance.
````

- [ ] **Step 6: Run the focused checks and the lesson**

Run: `.\.venv\Scripts\python.exe -m pytest sandbox/tests/test_lesson01_evaluation.py -v` — Expected: 5 passed (about 5 s).

Run: `.\.venv\Scripts\python.exe -m sandbox.lesson01_garch.run_lesson` — Expected: the block in `LESSON.md` §5. If library versions differ, the digits may differ; GARCH QLIKE vs true variance must stay below EWMA's. If the output differs, update `LESSON.md` §5 with the fresh output in this commit.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: 39 passed.

- [ ] **Step 7: Commit**

```powershell
git add ml/sandbox/lesson01_garch/evaluation.py ml/sandbox/lesson01_garch/run_lesson.py ml/sandbox/lesson01_garch/LESSON.md ml/sandbox/tests/test_lesson01_evaluation.py
git diff --cached --check
git commit -m "feat(ml): add sandbox lesson 1 walk-forward QLIKE evaluation"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] Every name under **Produces** exists exactly.
- [ ] `ml/` full suite green (39 after Plan 2 alone; 64 with Plan 3); `run_lesson` output in the PR.
- [ ] Spec §8: "Sandbox lesson 1 recovers the simulated GARCH parameters and reports walk-forward QLIKE; the import-guard test passes."
- [ ] No file outside `ml/` changed.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff (Phase 2 gate)

- Inputs made available: lesson 1 completes the spec §5 Phase 2 gate "C6 lessons 2-3 … Lesson 1 complete"; the guard pattern for future sandbox lessons.
- Conditions later work may assume: sandbox code is unreachable from every runtime; recursions and QLIKE are hand-verified.
- Open risks carried forward: results are a best case (data generated by GARCH, Gaussian shocks). C2 still needs the spec §5 Phase 3 gates (OQ-4, adjusted-close storage, Diebold-Mariano, coverage tests, shadow period). Owner: C2 spec revision.

## Self-Review

**Spec coverage:** P1.5 scaffold, own dependency file, import guard — Task 1; simulate GARCH(1,1) with known parameters, fit EWMA and GARCH, rolling-origin walk-forward, QLIKE, parameter recovery — Tasks 2–3; §9 deterministic seeds and guard scan — fixed seeds, Task 1.

**Step scan:** Every code step holds the complete file verified in the planning workspace (13 sandbox and guard tests passed; `run_lesson` produced the output quoted in `LESSON.md`).

**Type and name consistency:** `GarchParams` field order `(omega, alpha, beta)` is used positionally in `fit_garch` and in tests; `path[t]` convention is shared by `garch_variance_path`, `ewma_variance_path`, and `walk_forward` indexing.

**Review focus:** All five items map to named tests.

**Proportion:** One lesson, three small modules, no product contact.
