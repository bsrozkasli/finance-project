## Ambiguity 1: Null position collection from `PortfolioPositionPort`
- Scenario: `positionPort.findByUserId("default")` returns `null` on list endpoint.
- Repository evidence: `PortfolioPositionPort` interface does not explicitly document non-null list guarantee.
- Current behavior: not asserted as contract; test is disabled (`shouldClarifyNullPositionListContract`).
- Interpretation A: outbound adapters must always return `List.of()` when no rows.
- Interpretation B: controller should normalize `null` to `[]` defensively.
- Risk: null handling inconsistency can produce non-deterministic JSON/body behavior.
- Recommended ownership: `PortfolioPositionPort` contract should define non-null collection guarantee.
- Proposed future test: enforce non-null list contract and fail if adapter returns null.

## Ambiguity 2: Unknown JSON field policy on create/update
- Scenario: valid request contains extra unknown property.
- Repository evidence: SPEC/docs do not require strict unknown-field rejection for existing controllers.
- Current behavior: not asserted as bug; disabled (`shouldClarifyUnknownJsonFieldPolicyOnCreate`).
- Interpretation A: ignore unknown fields for backward-compatible clients.
- Interpretation B: reject unknown fields with `400` for strict API hygiene.
- Risk: silent payload mistakes can hide client integration bugs.
- Recommended ownership: API contract in `SPEC.md` section 7 + backend Jackson policy.
- Proposed future test: explicit expected status for unknown fields.

## Ambiguity 3: Symbol normalization ownership
- Scenario: `POST` with symbol containing case/whitespace differences.
- Repository evidence: domain `PortfolioPosition` validates blank/null but does not normalize; `PortfolioTransaction` normalizes symbol.
- Current behavior: position may keep raw symbol while ledger transaction is normalized.
- Interpretation A: normalization belongs in domain position model too.
- Interpretation B: normalization belongs at persistence/service boundary only.
- Risk: cross-table symbol inconsistency (`portfolio_positions` vs ledger transactions).
- Recommended ownership: domain model + controller/service contract alignment.
- Proposed future test: assert consistent normalized symbol across position and ledger write.

## Ambiguity 4: Portfolio selection fallback when no default exists
- Scenario: portfolios exist but none has `defaultPortfolio=true`.
- Repository evidence: controller currently uses first portfolio (`orElse(portfolios.get(0))`), docs do not mandate this fallback.
- Current behavior: disabled ambiguity test (`shouldClarifyPortfolioSelectionWhenNoDefaultExists`).
- Interpretation A: first-portfolio fallback is intended deterministic behavior.
- Interpretation B: should fail with explicit conflict/validation error until default is defined.
- Risk: ledger transaction may be attached to unintended portfolio.
- Recommended ownership: portfolio domain rules in `SPEC.md` + service policy.
- Proposed future test: assert exact fallback behavior once documented.

## Ambiguity 5: Null-return guarantees for `PortfolioPort`
- Scenario: `portfolioPort.findByUserId` or `portfolioPort.save` returns `null` during sync.
- Repository evidence: `PortfolioPort` interface does not state nullability contract.
- Current behavior: ambiguity kept disabled (`shouldClarifyNullPortfolioPortContracts`).
- Interpretation A: outbound ports must never return null; throw instead.
- Interpretation B: controller must guard and map null-return cases.
- Risk: hidden partial persistence when sync path proceeds/gets swallowed.
- Recommended ownership: outbound port contract definition.
- Proposed future test: explicit null-return mapping expectation (error vs normalization).

## Ambiguity 6: Update endpoint and ledger synchronization coupling
- Scenario: position update changes quantity/cost but no ledger mutation occurs.
- Repository evidence: controller update path only saves position; docs do not clearly define synchronization requirement after create.
- Current behavior: disabled ambiguity (`shouldClarifyLedgerBehaviorOnPositionUpdate`).
- Interpretation A: legacy position updates must synchronize ledger for consistency.
- Interpretation B: ledger is immutable transaction history; update endpoint intentionally independent.
- Risk: divergent holdings depending on read model source.
- Recommended ownership: portfolio architecture contract in SPEC/business rules.
- Proposed future test: assert ledger side-effects (or explicit no-side-effect) on update.

## Ambiguity 7: Delete endpoint and ledger history policy
- Scenario: deleting a position does not modify ledger transactions.
- Repository evidence: no explicit delete-to-ledger rule in SPEC/docs.
- Current behavior: disabled ambiguity (`shouldClarifyLedgerBehaviorOnPositionDelete`).
- Interpretation A: deleting position should not touch historical ledger entries.
- Interpretation B: delete should create compensating transaction or linked cleanup.
- Risk: position view and ledger history can diverge semantically.
- Recommended ownership: transaction-ledger lifecycle policy.
- Proposed future test: assert explicit ledger policy on delete.

## Ambiguity 8: Stable error schema rollout for existing controllers
- Scenario: whether all existing controllers must already return stable `{timestamp,status,error,message,path}` shape.
- Repository evidence: `docs/ERROR_CATALOG.md` states new handlers should use stable schema; existing handlers may still use Spring defaults.
- Current behavior: ambiguity kept disabled (`shouldClarifyStableErrorShapeExpectationForAllExistingPortfolioPositionErrors`).
- Interpretation A: immediately mandatory for all controllers.
- Interpretation B: phased migration; legacy outputs temporarily allowed.
- Risk: frontend error handling inconsistency across endpoints.
- Recommended ownership: global error-handling migration plan + controller advice timeline.
- Proposed future test: enabled shape assertions after migration commit.

## Ambiguity 9: Zero avgCost semantics
- Scenario: create/update with `avgCostPrice = 0`.
- Repository evidence: domain model allows zero (`< 0` invalid, `0` valid); business docs do not explicitly describe zero-cost use-cases.
- Current behavior: create with zero cost currently passes.
- Interpretation A: zero cost is valid (transfers/gifts/manual correction).
- Interpretation B: zero cost should be rejected for standard BUY entries.
- Risk: portfolio return metrics may be distorted by unintended zero-cost inputs.
- Recommended ownership: domain rule clarification in SPEC section 6/10.
- Proposed future test: explicit zero-cost acceptance/rejection for create and update.
