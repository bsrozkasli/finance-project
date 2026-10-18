# PortfolioLedgerService Test Inventory

## Module information
- Production class: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerService.java`
- Test class: `backend/src/test/java/com/ozkaslibasar/financeproject/domain/service/PortfolioLedgerServiceTest.java`
- Architectural layer: `backend domain/service`
- Baseline command: `cd backend; .\mvnw.cmd "-Dtest=PortfolioLedgerServiceTest" test`
- Expanded command: `cd backend; .\mvnw.cmd "-Dtest=PortfolioLedgerServiceTest" test`
- Baseline result: `Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, exit code 0`
- Expanded result: `Tests run: 27, Failures: 1, Errors: 0, Skipped: 2, exit code 1`
- Working tree condition: dirty before task; branch switch skipped per instruction.

## Existing test assessment
- Existing tests before expansion covered constructor null-check, simple BUY/SELL, zero-quantity filtering, dividend/fee application, manual valuation ignore, and a basic oversell validation.
- Existing strengths: basic happy paths and one key validation path existed.
- Weak assertions before expansion: mostly single-path cases with limited precision, no high-scale math, no multi-symbol isolation depth, limited port interaction verification, no determinism/mutation checks, and no chronology contract check.
- Missing scenarios before this task: FX-heavy weighted average with fees, fractional precision, exact liquidation residue checks, cumulative sell boundaries, symbol normalization behavior, optional-symbol action handling, null entry behavior, and ordering risk.

## Test inventory

| Test method | Scenario | Bug category | Expected result | Expectation source | Result |
| ----------- | -------- | ------------ | --------------- | ------------------ | ------ |
| `shouldThrowNullPointerExceptionWhenConstructedWithNullPort` | null outbound port | validation | constructor rejects null dependency | Domain invariant | PASS |
| `shouldReturnEmptyHoldingsForEmptyTransactionList` | empty list | boundary | empty holdings | Domain invariant | PASS |
| `shouldQueryPortWithPortfolioAndUserDuringCalculateHoldings` | portfolio/user isolation in port query | data-integrity | exact `(portfolioId,userId)` forwarded | SPEC.md + Domain invariant | PASS |
| `shouldSaveTransactionAfterSuccessfulValidation` | valid sell in `addTransaction` | validation | `save()` called exactly once | SPEC.md + Domain invariant | PASS |
| `shouldNotPersistTransactionWhenSellExceedsHolding` | oversell validation | validation | throws and `save()` never called | Business rule (SELL validates available quantity) | PASS |
| `shouldIncludeBuyFeeAndFxInCostBasisAndAverageCost` | one BUY with fee+FX | financial-correctness | qty/cost basis/avg cost exact from hand calc | Weighted-average accounting rule + FX derivation | PASS |
| `shouldCalculateWeightedAverageCostAcrossBuysWithFeesAndFx` | multi-BUY weighted average | precision | weighted average = `154.66666667` with 8 scale | Weighted-average accounting rule | PASS |
| `shouldCalculatePartialSellProfitWithFeeAndFx` | partial SELL profit with weighted basis | financial-correctness | exact removed cost/proceeds/realized pnl | Realized PnL derivation + FX derivation | PASS |
| `shouldCalculatePartialSellLossAndZeroPnlCases` | loss and break-even sells | financial-correctness | exact negative/zero realized pnl | Realized PnL derivation | PASS |
| `shouldOmitHoldingAfterExactLiquidationWithoutResidue` | exact liquidation with fractional qty | precision | holding removed, no residual quantity/cost basis row | Domain invariant | PASS |
| `shouldRejectSellBeforeBuyInDirectCalculation` | sell-before-buy in list processing | validation | reject impossible holdings | Business rule | PASS |
| `shouldRejectSellWhenQuantityExceedsBySmallestUnit` | minimal oversell boundary | boundary | reject oversell by `0.00000001` | Business rule | PASS |
| `shouldRejectSellAfterExactLiquidation` | second sell after full liquidation | validation | reject oversell and no partial state | Business rule | PASS |
| `shouldKeepSymbolsFinanciallyIsolated` | mixed NVDA/MSFT/AAPL ledger | data-integrity | quantities/cost/pnl isolated per symbol | SPEC.md section 10 + Domain invariant | PASS |
| `shouldIgnoreCashTransferAndManualValuationForShareHoldings` | non-holding actions in holdings view | financial-correctness | no phantom share holdings created | SPEC.md section 10 | PASS |
| `shouldApplyDividendAndFeeToRealizedPnlWithoutChangingQuantity` | dividend + fee on existing symbol | financial-correctness | quantity unchanged; realized pnl updated by base-currency values | Realized PnL derivation + FX derivation | PASS |
| `shouldNormalizeSymbolsThroughTransactionDomainModel` | casing/whitespace normalization | data-integrity | single normalized symbol holding | Domain invariant | PASS |
| `shouldSkipNullOrBlankSymbolTransactionsWhenSymbolOptional` | optional-symbol FEE with null/blank | validation | no phantom holding or pnl corruption | Domain invariant | PASS |
| `shouldRejectInvalidTransactionValuesAtDomainBoundary` | invalid quantity/fee/fx | validation | constructor throws | Domain invariant | PASS |
| `shouldNotMutateCallerOwnedTransactionList` | input mutation | mutation | list order/size/references unchanged | Input immutability expectation | PASS |
| `shouldProduceDeterministicOutputAcrossListImplementations` | determinism with `ArrayList` and immutable list | data-integrity | identical holdings output | Determinism expectation | PASS |
| `shouldMaintainEightDecimalAverageCostForRepeatingDecimalCase` | repeating-decimal average | precision | exact 8-decimal average cost | Weighted-average accounting rule | PASS |
| `shouldThrowForNullTransactionEntryInList` | null element inside list | validation | fail-fast exception | Domain invariant | PASS |
| `shouldDefaultBlankUserToDefaultAtTransactionConstruction` | user/currency normalization | validation | blank user -> `default`, lowercase currency -> uppercase | Domain invariant | PASS |
| `shouldTreatChronologicalOrderAsContractForEquivalentTransactionSet` | same logical ledger, reversed input order | ordering | chronological and reversed input should yield equivalent holdings | SPEC.md section 10 (ledger semantics) | FAIL (confirmed bug) |
| `shouldClarifyDividendPriceSemanticsBeforeAssertingPerShareCalculation` | dividend meaning ambiguity | other | pending product decision | SPEC.md gaps + Domain model ambiguity | SKIPPED |
| `shouldClarifyDuplicateDetectionOwnership` | duplicate transaction ownership ambiguity | other | pending product decision | SPEC.md gaps + persistence responsibility ambiguity | SKIPPED |

## Summary
- Tests before: 9
- Tests after: 27
- Tests added: 18
- Passing: 24
- Failing: 1
- Ambiguous: 2
- Blocked: 0
