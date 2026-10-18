# Adversarial Finance and Risk Review

**Artifact reviewed:** `docs/product/PRD.md`
**Approved foundation:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`
**Prior review checked:** `docs/product/reconcile-finance-risk.md`
**Review date:** 2026-09-30
**Scope:** Blocker/high findings only: finance, evidence, PEG, benchmark, Portfolio Fit, labels, personalization, legal/data rights, success metrics, and testing.

## Verdict

**NEEDS REVISION before finance/risk epics and stories are treated as implementation-ready.**

No unresolved **blocker** was found. The PRD is materially safer than the version covered by the prior reconciliation: critical-conflict handling, personalization label provenance, bounded transitions, and cross-cutting metric fixtures are now normative. Five **high** findings remain. Four are residual gaps in items previously reported as fixed or partially fixed; one is a newly isolated evidence-policy mismatch.

## High findings

### RFN-01 — The authoritative Decision Result and Portfolio Fit contract is incomplete

**PRD locations:** Sections 5.2, 7.4 OQ-4, `PRD-FR-025`–`031`
**Foundation locations:** Sections 11 and 11.1

The foundation requires Portfolio Fit to prevent `Add` when concentration, correlation, factor exposure, or drawdown risk is unacceptable, and requires the deterministic Decision Result to contain separate medium- and long-term outlooks, valuation zone, deterministically supported maximum weight, strongest quantitative support, quantitative risk flags, and deterministic invalidation thresholds. The PRD requires marginal Portfolio Fit, but its acceptance evidence names concentration, diversification, factor/sector overlap, liquidity, and generic limit effects; correlation and drawdown are not explicit. It also never normatively requires the full Decision Result field set above.

This permits a conforming implementation to emit a label with a replay key while omitting horizon-specific outlooks, a calculated weight, or the quantitative risk/invalidation context needed to interpret it. `OQ-4` acknowledges that the Portfolio Fit and weight-cap formulas are unresolved, but neither `PRD-FR-025` nor the release blockers explicitly suppress labels/weights until those policies are approved.

**Required fix**

- Add the complete deterministic Decision Result field contract from foundation Section 11.
- Name correlation and drawdown effects explicitly in Portfolio Fit.
- Make approval/versioning of Portfolio Fit and deterministic weight-cap policy an entry gate for label/weight stories and an external-release gate.
- Add independent boundary fixtures for concentration, correlation, factor overlap, liquidity, drawdown, and hard-cap interactions.

### RFN-02 — Legal and data-rights gates are stated but not fully executable or replayable

**PRD locations:** Sections 7.3, 7.4 OQ-1/OQ-2, 8.2, 8.3, `PRD-FR-026`, `PRD-FR-055`, `PRD-NFR-008`, `PRD-NFR-009`
**Foundation location:** Section 4.1

The prior legal-gate blocker is substantially corrected: the gate now covers deterministic and learned user-policy-conditioned labels and weights. However, the acceptance evidence only proves suppression when an approval record is absent. It does not require the output or replay record to bind the approval/disclosure version, jurisdiction, effective dates, expiry/revocation state, approved product/output version, or required profile schema. The data-rights gate similarly lists intended uses but does not define a testable entitlement record containing dataset/product, provider agreement locator, territory/audience, professional status where relevant, effective period, permitted transformations, reporting duties, or revocation behavior.

That reduces both release controls to a potentially stale Boolean. A result could remain enabled after approval expiry, a material policy change, or a rights change without leaving replay evidence.

The official sources support a stricter operational gate. SEC robo-adviser guidance emphasizes understandable disclosure of algorithm functions, assumptions, limitations, client-information use, and processes for inconsistent or changing client information. SEC staff material also says sufficient investor information is fact-specific and may need updating. Nasdaq policies show that derived data can remain fee-liable and delayed displays require prominent delay messages. FINRA Rule 2111 treats an explicit `Hold` as a recommendation, while also stating that Rule 2111 does not govern recommendations subject to Regulation Best Interest; applicability therefore cannot be inferred from the label alone.

**Required fix**

- Define versioned `LegalApprovalRecord`, `DisclosureVersion`, and `DataRightsApproval` contracts with scope, effective/expiry/revocation state, and evidence locators.
- Bind the applicable identifiers to every externally exposed gated result and retained replay/audit record.
- Add release tests for wrong jurisdiction, expired/revoked approval, changed profile schema, unapproved output type, missing delay label, and a use outside licensed display/derived/backtest/model/redistribution rights.
- Require the legal gate to define profile refresh, inconsistency handling, and any reasonably-available-alternatives obligation for the approved classification.

**Primary sources:** [SEC Robo-Advisers guidance](https://www.sec.gov/investment/im-guidance-2017-02.pdf), [SEC care-obligations staff bulletin](https://www.sec.gov/about/divisions-offices/division-trading-markets/broker-dealers/staff-bulletin-standards-conduct-broker-dealers-investment-advisers-care-obligations), [SEC investment-adviser overview](https://www.sec.gov/files/divisions/investment/iaregulation/memoia.htm), [FINRA Rule 2111](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2111), [Nasdaq data policies](https://www.nasdaqtrader.com/content/AdministrationSupport/Policy/USEquitiesandOptionsDataPolicies.pdf), [NYSE market-data documents](https://www.nyse.com/connectivity/documents). These sources inform controls; they do not determine product classification.

### RFN-03 — Benchmark selection is not explicitly frozen before outcomes are known

**PRD locations:** `PRD-FR-019`, `PRD-FR-027`, `PRD-NFR-003`, Sections 5.1 and 11.1
**Foundation location:** Section 9.3

The stock/ETF hierarchy, total-return basis, permitted ETF substitute, Evidence Strength penalty, and unresolved-mapping behavior are restored. The foundation additionally requires the mapping to be selected by a versioned rule at decision time, stored with the snapshot, never changed after the outcome is known, and retained with the decision and outcome record together with observation times. `PRD-FR-019` only says that a substitution is retained in replay metadata; `PRD-FR-027` requires a benchmark version identifier but not selection time, mapping-policy version, observation times, or outcome-record immutability.

Without the pre-outcome freeze, backtests and product metrics can unknowingly select or remap benchmarks after performance is observed, invalidating relative performance and personalization-uplift evidence.

**Required fix**

- Require benchmark identifier, mapping-policy version, selection timestamp, observation timestamps, substitution reason, and rights state in the snapshot/decision/outcome records.
- Prohibit any benchmark remapping after decision time for retained outcome evaluation.
- Test delistings, sector/category changes, benchmark discontinuation, rights loss, and a deliberately attempted post-outcome remap.

### RFN-04 — PEG still allows an unqualified trailing/provider ratio to coexist with the authoritative metric

**PRD locations:** Glossary, `PRD-FR-020`–`023`, Section 11.1
**Foundation location:** Section 10

The custom Target-Horizon PEG formula, target window, percentage-point denominator, dispersion denominator, retained inputs, analyst minimum, uncertainty rules, peer minimum, ETF exclusion, and quality gates are now present. PEG scoring is correctly blocked until normalized-EPS and peer policies are approved.

The remaining gap is that the foundation explicitly requires trailing PEG to be labeled separately and never mixed with forward PEG. The PRD tests “forward/trailing distinctions” but has no functional requirement prohibiting a provider PEG from appearing as `PEG` or participating in the Target-Horizon PEG section. This matters because the foundation records the brownfield implementation as using a raw provider PEG and universal thresholds.

**Required fix**

- Add a normative rule that any trailing or provider-supplied PEG is separately named, carries its own formula/source/period, and cannot substitute for or enter Target-Horizon PEG scoring.
- Add UI/API contract tests with both values present, absent, conflicting, and stale.
- Keep Target-Horizon PEG scoring and any PEG-dependent label influence disabled until OQ-4's normalized-EPS and peer/lifecycle policies are approved and versioned.

### RFN-05 — Evidence Strength dropped the approved weighted-coverage policy

**PRD locations:** `PRD-FR-006`–`009`, OQ-3
**Foundation location:** Section 7.1

The previous critical-conflict defect is fixed: unresolved instrument type, mandatory failure, and unresolved critical conflict now yield `Insufficient`. The foundation, however, requires every versioned stock/ETF policy to declare mandatory fields, **field weights**, and freshness windows, and defines High/Medium against weighted optional coverage. `PRD-FR-008` uses unqualified “optional coverage” and its tests cover thresholds without requiring field weights or a versioned asset-model coverage policy.

An implementation can therefore count trivial optional fields equally with decision-material fields and still satisfy the literal 75%/90% thresholds. Because Evidence Strength controls directional suppression, this is a decision-safety issue rather than a cosmetic scoring choice.

**Required fix**

- Restore weighted optional coverage and require versioned field applicability/weights separately for stock and ETF models.
- Treat OQ-3 approval as a hard entry gate for Evidence Strength, Decision Result, and release stories.
- Add mutation/property tests proving that adding low-value fields cannot raise a result while material fields remain absent or conflicted.

## Prior reconciliation status

| Prior finding | Status in current PRD | Evidence |
|---|---|---|
| `FIN-01` legal gate | **Partially resolved** | Cross-cutting deterministic/learned gate added; approval lifecycle and replay binding remain open (`RFN-02`). |
| `FIN-02` labels/transitions | **Partially resolved** | Ownership rules and transition allow-list added; complete Decision Result/Portfolio Fit safety contract remains incomplete (`RFN-01`). |
| `FIN-03` benchmark | **Partially resolved** | Hierarchy and substitution restored; pre-outcome freeze and complete provenance remain incomplete (`RFN-03`). |
| `FIN-04` PEG | **Partially resolved** | Core formula/gates restored; trailing/provider PEG separation remains non-normative (`RFN-04`). |
| `FIN-05` critical conflicts | **Resolved as reported** | Critical conflict and unresolved type now force `Insufficient`; weighted coverage is a separate residual (`RFN-05`). |
| `FIN-06` feedback loop | **Resolved** | Explicit labels, rejected alternatives, passive/self-generated-label bans, and cross-user prohibition are normative. |
| `FIN-07` metric fixtures | **Resolved** | `PRD-NFR-014` and Section 11 apply independent formula/unit/period/rounding fixtures cross-cuttingly and include point-in-time/outcome-bias cases. |

## Areas with no blocker/high finding

- Success-metric definitions and denominators now match the approved foundation. Sampling, survey, and cohort rules remain open under OQ-7/OQ-8; those should be resolved before measurement implementation, but they do not create an additional blocker/high discrepancy against the approved source.
- Personalization history thresholds, shadow mode, transition allow-list, hard-cap behavior, consent, deletion, fallback, and anti-feedback-loop controls are materially complete at PRD level.
- Provider/LLM degradation, no-fabrication rules, independent financial fixtures, point-in-time cases, walk-forward/out-of-sample evaluation, runtime contract fixtures, and privacy testing are appropriately represented. The high findings above identify the additional cases needed for the affected controls.

## Gate recommendation

Do not decompose the Decision Result, Portfolio Fit, Evidence Strength, benchmark-outcome, PEG display/scoring, or external-release controls into implementation stories until `RFN-01` through `RFN-05` are either incorporated into the PRD or converted into explicit phase-entry requirements with an owner, approval artifact, and acceptance evidence. No blocker prevents continued non-authoritative baseline/audit work.
