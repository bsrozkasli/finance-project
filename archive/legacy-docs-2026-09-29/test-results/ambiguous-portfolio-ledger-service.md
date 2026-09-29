# Ambiguous Scenarios - PortfolioLedgerService

## 1) Dividend `price` semantics
- Scenario: `DIVIDEND` transaction has `quantity = null` and a `price` value.
- Relevant repository rule: SPEC section 10 states dividend/cash actions exist in ledger but does not define whether dividend `price` is total cash or per-share amount.
- Current observed behavior: service adds `price * fxRateToBase` directly to realized PnL (no share multiplier).
- Interpretation A: `price` means total cash dividend amount; current behavior is correct.
- Interpretation B: `price` means dividend per share; service should multiply by held quantity.
- Risk of choosing incorrectly: realized PnL can be materially overstated or understated.
- Recommended product decision: explicitly document dividend amount semantics at API/domain level.
- Proposed future assertion: once documented, assert exact realized PnL using either total-cash or per-share formula.

## 2) Duplicate transaction handling ownership
- Scenario: same transaction appears twice (same object or identical values).
- Relevant repository rule: no explicit deduplication contract in service-level specs; persistence uniqueness constraints are documented elsewhere for selected tables, not portfolio ledger transaction semantics.
- Current observed behavior: service applies every entry in provided list.
- Interpretation A: service should remain stateless and apply all entries; deduplication belongs to persistence/import layer.
- Interpretation B: service should detect duplicates to prevent double-counting.
- Risk of choosing incorrectly: either silent double-counting or invalid rejection of legitimate repeated actions.
- Recommended product decision: define dedupe ownership explicitly (service vs adapter/import).
- Proposed future assertion: either assert duplicate rejection or assert pass-through counting based on final decision.
