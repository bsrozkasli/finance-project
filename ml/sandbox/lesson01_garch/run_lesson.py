r"""Run lesson 1 end to end and print what was learned.

Usage (from ``ml/``)::

    .\.venv\Scripts\python.exe -m sandbox.lesson01_garch.run_lesson
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
