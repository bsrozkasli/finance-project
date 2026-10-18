# PriceRefreshService Test Inventory

## Module information
- Production class: `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java`
- Test class: `backend/src/test/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshServiceTest.java`
- Architectural layer: `backend domain/service`
- Branch: `test/backend-bug-hunt` (working tree was already dirty before this task)
- Baseline command: `cd backend; .\mvnw.cmd "-Dtest=PriceRefreshServiceTest" test`
- Expanded command: `cd backend; .\mvnw.cmd "-Dtest=PriceRefreshServiceTest" test`
- Baseline result: `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, exit code 0`
- Expanded result: `Tests run: 27, Failures: 1, Errors: 0, Skipped: 2, exit code 1`

## Existing-test assessment
- Existing scenarios before this phase:
  - latest price fetch/persist happy path
  - latest fallback to local when provider empty
  - one live-range merge/persist path
- Weak assertions before expansion:
  - no constructor validation coverage
  - no interaction-order checks for DB-first guarantee
  - no null-response/null-entry handling tests
  - no symbol normalization/blank validation coverage
  - no stale-vs-fresh refresh policy checks
  - no range-window boundary checks
  - no wrong-symbol provider integrity checks
  - no deterministic/idempotent repeated-call coverage
  - no input-list mutation checks
- Time-related instability before expansion:
  - test data used `Instant.now()` directly in setup without controlled UTC-day scenarios.

## Test inventory

| Test method | Scenario | Bug category | Expected result | Expectation source | Result |
| ----------- | -------- | ------------ | --------------- | ------------------ | ------ |
| `shouldRejectNullPriceRepositoryInConstructor` | null repo in ctor | validation | constructor fails fast | domain invariant | PASS |
| `shouldRejectNullFinancialDataPortInConstructor` | null provider port in ctor | validation | constructor fails fast | domain invariant | PASS |
| `shouldNormalizeSymbolForLatestAndHistoryCalls` | trim+uppercase symbol | validation | ports called with normalized symbol | AGENTS.md + domain invariant | PASS |
| `shouldRejectBlankOrNullSymbolBeforePortCalls` | blank/null symbol | validation | throw and no port call | domain invariant | PASS |
| `shouldFollowDbFirstOrderForGetFreshLatest` | latest interaction order | db-first | repo lookup before provider fetch; save after fetch | DB-first flow | PASS |
| `shouldReturnEmptyLatestWhenLocalAndProviderBothEmpty` | no data anywhere | provider-degradation | empty result, no save | provider-degradation contract | PASS |
| `shouldReturnExistingLatestWhenProviderIsNullOrEmpty` | provider null/empty latest | provider-degradation | local fallback returned, no save | provider-degradation contract | PASS |
| `shouldReturnNewestPriceFromLocalAndProviderCandidates` | newer provider row exists | refresh-policy | newest timestamp returned | timestamp ordering rule | PASS |
| `shouldSelectNewestWhenProviderRowsAreReverseOrdered` | provider rows reverse order | ordering | newest row selected regardless input order | timestamp ordering rule | PASS |
| `shouldNotReturnDifferentSymbolFromProviderForLatestRequest` | provider returns wrong symbol row | data-integrity | wrong-symbol row rejected/ignored | no-fake-data + symbol integrity | FAIL (confirmed bug) |
| `shouldUseDefaultIntervalAndRangeWhenMissingAndRefreshNeeded` | null/blank params | refresh-policy | defaults `1d`/`1mo` used | service contract | PASS |
| `shouldReadRepositoryBeforeProviderForHistoryRefresh` | history interaction order | db-first | repo query before fetch; save after non-empty fetch | DB-first flow | PASS |
| `shouldNotRefreshWhenDailyHistoryIsFreshToday` | fresh same-day daily history | refresh-policy | no provider call; no save | performance + refresh policy | PASS |
| `shouldRefreshAndMergeWhenDailyHistoryIsStale` | stale daily local + fetched rows | refresh-policy | refresh + merge + dedupe/sort | DB-first flow + timestamp ordering rule | PASS |
| `shouldAlwaysRefreshForLiveRange5dEvenIfLocalLooksFresh` | live range `5d` | refresh-policy | provider called | current refresh policy contract | PASS |
| `shouldAlwaysRefreshForIntradayIntervals` | standard intraday intervals | refresh-policy | provider called | performance + refresh policy | PASS |
| `shouldRefreshForMalformedIntervalsEndingWithMOrH` | malformed `*m/*h` intervals | validation | treated as intraday and refreshed | current service policy (not strict validation here) | PASS |
| `shouldMapRangesToReasonableRepositoryWindow` | range->from/to mapping | range-filtering | repository window approximately matches requested range | range filtering rule | PASS |
| `shouldReturnLocalHistoryWhenProviderReturnsNullOrEmptyDuringStaleRefresh` | stale local + null/empty provider | provider-degradation | return local fallback, no save | provider-degradation contract | PASS |
| `shouldPropagateProviderExceptionForHistoryAndAvoidSave` | provider throws in history | provider-degradation | exception propagated; no save | adapter/service ownership currently observed | PASS |
| `shouldKeepOnlyOneRowPerTimestampAfterMerge` | overlapping timestamp local+provider | duplication | one row per timestamp | duplicate handling rule | PASS |
| `shouldFilterOutOfRangeAndFutureRowsFromReturnedHistory` | before-range/in-range/future rows | range-filtering | return only in-range non-future rows | API price-history contract | PASS |
| `shouldNotMutateRepositoryOwnedListDuringMerge` | mutation safety | mutation | local input list unchanged | input immutability expectation | PASS |
| `shouldBeDeterministicForRepeatedFreshNonLiveRequests` | repeated fresh daily query | other | deterministic result, provider unused | performance + determinism | PASS |
| `shouldThrowWhenRepositoryReturnsNullForHistory` | repo returns null list | validation | fail fast null-related exception | domain/port contract uncertainty | PASS |
| `shouldClarifyEqualTimestampWinnerForLatestPrice` | equal timestamp tie latest | ordering | ambiguous tie ownership | timestamp ownership unclear | SKIPPED |
| `shouldClarifyLatestProviderExceptionFallbackOwnership` | latest provider exception handling | provider-degradation | ambiguous ownership for fallback/catch | degradation ownership unclear | SKIPPED |

## Summary
- Tests before: 3
- Tests after: 27
- Tests added: 24
- Passed: 24
- Failed: 1
- Ambiguous: 2
- Blocked: 0
