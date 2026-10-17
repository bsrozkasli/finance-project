# Local patches for vendored submodules

`data-service/external/TradingAgents` is a git submodule pointing at the
upstream repository (`TauricResearch/TradingAgents`). Local commits inside it
cannot be pushed upstream, so local changes are kept here as patch files and
the submodule pointer stays on an upstream commit.

| Patch | Base commit | Purpose |
|---|---|---|
| `tradingagents-precomputed-metrics.patch` | `04f434e` | When `state["precomputed_metrics"]` is present, the fundamentals and market analysts bind no data-fetching tools and receive only those prepared metrics, and the portfolio manager prompt is restricted to them and the prior debate (AGENTS.md: agent reasoning receives prepared metrics only). |

Status: not used by the running data-service today — `data-service/app` does
not import `tradingagents`. Keep the patch until the agent pipeline adopts it
or the change is dropped.

Apply from the repository root:

```bash
git -C data-service/external/TradingAgents apply ../../patches/tradingagents-precomputed-metrics.patch
```
