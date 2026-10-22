# Learning Sandbox

## Purpose

The owner's quantitative-learning track (spec §1, goal 2). Lessons run on simulated data only. Output never enters the product.

## Isolation

Spec §4.10: nothing under `ml/sandbox/` is imported by `data-service`, `backend`, or `frontend`. `ml/tests/test_sandbox_isolation.py` scans those three runtimes and fails on any reference. Lessons do not import `lifecycle` or `dq` either, so each lesson stays self-contained.

## Lessons

| Lesson | Topic | Status |
|---|---|---|
| `lesson01_garch` | GARCH(1,1) parameter recovery and walk-forward QLIKE | Phase 1 |

Lessons 2–3 are gated on lesson 1 (spec §5 Phase 2).
