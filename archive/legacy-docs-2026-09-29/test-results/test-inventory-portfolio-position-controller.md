## Module information
- Production class: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioPositionController.java`
- Test class: `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/PortfolioPositionControllerTest.java`
- Architectural layer: Backend REST controller (`@WebMvcTest` slice)
- Active branch: `test/backend-bug-hunt`
- Branch state during phase: dirty working tree (branch switch intentionally skipped)
- Baseline state: target test file did not exist (`Test-Path` = `False`), baseline test count = `0`
- MVC infrastructure command: `cd backend && .\\mvnw.cmd "-Dtest=PortfolioManagementControllerTest" test` (PASSED)
- Target test command: `cd backend && .\\mvnw.cmd "-Dtest=PortfolioPositionControllerTest" test`
- Final result: `Tests run: 47, Failures: 3, Errors: 11, Skipped: 7`

## Existing coverage assessment
- Existing `PortfolioPositionControllerTest`: not present before this phase.
- Previously uncovered CRUD paths: list/create/update/delete slice scenarios for `/api/v1/portfolio/positions`.
- Validation gaps uncovered: symbol/quantity/avgCost domain exceptions are not mapped to documented 400 responses.
- Ledger synchronization risks uncovered: create flow can return `201` after ledger/portfolio sync failure.
- User-scoping risks checked: repository and ledger interactions were asserted against fixed user `"default"` in successful paths.
- Error-shape gaps: stable error schema ownership across existing controllers remains ambiguous.
- Controller orchestration concerns: controller performs orchestration (position creation + portfolio selection/creation + ledger write) and catches sync exceptions internally.

## Test inventory
| Test method | Endpoint/scenario | Bug category | Expected result | Expectation source | Result |
| ----------- | ----------------- | ------------ | --------------- | ------------------ | ------ |
| `shouldListPositionsForDefaultUserAndPreserveResponseContract` | `GET /api/v1/portfolio/positions` list with 2 records | api-contract, user-scoping | `200` JSON array, exact fields preserved, no ledger/portfolio side-effects | `SPEC.md`, DTO contract, user-scoping contract | PASS |
| `shouldReturnEmptyArrayWhenUserHasNoPositions` | `GET /positions` empty | provider-degradation | `200 []`, not `404` | `SPEC.md`, `docs/ERROR_CATALOG.md` | PASS |
| `shouldClarifyNullPositionListContract` | `positionPort.findByUserId` returns `null` | other | contract ownership to be clarified | persistence contract | SKIPPED (ambiguous) |
| `shouldCreatePositionForDefaultUserAndSyncLedgerWithExistingDefaultPortfolio` | `POST /positions` valid payload + existing default portfolio | ledger-sync, user-scoping | `201`, persisted payload preserved, ledger BUY created with default portfolio | `SPEC.md`, transaction-ledger contract | PASS |
| `shouldDelegateCreateSymbolVariantWithoutControllerNormalization` | `POST /positions` symbol variants `AAPL/aapl/AaPl` | validation | deterministic delegation without controller casing logic | domain invariant | PASS (3 parameter cases) |
| `shouldKeepSurroundingWhitespaceInPositionSymbolButNormalizeLedgerSymbol` | `POST /positions` symbol with surrounding whitespace | data-consistency | capture current cross-model normalization difference | domain invariant | PASS |
| `shouldReturn400WhenCreatingWithBlankSymbol` | `POST` blank symbol | validation, http-status | client error (`400`) and no false success | `docs/ERROR_CATALOG.md` Portfolio | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenCreatingWithWhitespaceOnlySymbol` | `POST` whitespace-only symbol | validation, http-status | client error (`400`) | `docs/ERROR_CATALOG.md` Portfolio | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenCreatingWithNullSymbol` | `POST` null symbol | validation, http-status | client error (`400`) | `docs/ERROR_CATALOG.md` Portfolio | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenCreatingWithZeroQuantity` | `POST` quantity `0` | validation, http-status | client error (`400`) | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenCreatingWithNegativeQuantity` | `POST` negative quantity | validation, http-status | client error (`400`) | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenCreatingWithNullQuantity` | `POST` null quantity | validation, http-status | client error (`400`) | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldRejectStringQuantityBeforePersistence` | `POST` quantity string | validation | `400`, no persistence interaction | HTTP semantics | PASS |
| `shouldReturn400WhenCreatingWithNegativeAvgCostPrice` | `POST` negative avg cost | validation, http-status | client error (`400`) | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldAllowZeroAvgCostPriceOnCreate` | `POST` zero avg cost | domain invariant | accepted (`201`) under current domain rule | domain invariant (`PortfolioPosition`) | PASS |
| `shouldReturn400ForMalformedCreateBody` | `POST` malformed JSON | validation | `400`, no side-effects | HTTP semantics | PASS |
| `shouldReturn400ForArrayInsteadOfObjectBody` | `POST` array body | validation | `400`, no side-effects | HTTP semantics | PASS |
| `shouldReturn400ForInvalidOpenedAtFormat` | `POST` invalid date | validation | `400`, no side-effects | HTTP semantics | PASS |
| `shouldClarifyUnknownJsonFieldPolicyOnCreate` | `POST` extra unknown field | api-contract | strict reject vs ignore ownership | `SPEC.md` + Jackson policy | SKIPPED (ambiguous) |
| `shouldAssignOpenedAtWithinRequestRangeAndUseSameDateForLedger` | `POST` without `openedAt` | ledger-sync | generated date non-null, between before/after, same date in ledger tx | data-integrity rule | PASS |
| `shouldNotRunPortfolioLookupOrLedgerWhenPositionSaveFails` | `POST` persistence failure | partial-persistence | sync dependencies must not run after save failure | controller orchestration boundary | PASS |
| `shouldCreateDefaultPortfolioWhenMissingAndThenCreateLedgerTransaction` | `POST` no portfolios | ledger-sync | create default portfolio then ledger tx (`InOrder`) | `SPEC.md`, transaction-ledger contract | PASS |
| `shouldClarifyPortfolioSelectionWhenNoDefaultExists` | `POST` portfolios exist but none default | ledger-sync | fallback ownership to be clarified | `SPEC.md` | SKIPPED (ambiguous) |
| `shouldExposeLedgerSyncFailureInsteadOfReturningFalseSuccess` | `POST` ledger write throws after save | data-integrity, partial-persistence | operation should not report success | data-integrity rule, transaction-ledger contract | FAIL (`201` returned) |
| `shouldExposePortfolioLookupFailureInsteadOfReturningFalseSuccess` | `POST` portfolio lookup throws after save | data-integrity, partial-persistence | operation should not report success | data-integrity rule, transaction-ledger contract | FAIL (`201` returned) |
| `shouldExposeDefaultPortfolioCreationFailureInsteadOfReturningFalseSuccess` | `POST` default portfolio creation throws | data-integrity, partial-persistence | operation should not report success | data-integrity rule, transaction-ledger contract | FAIL (`201` returned) |
| `shouldClarifyNullPortfolioPortContracts` | portfolio port null return cases | other | ownership undefined in contract | persistence contract | SKIPPED (ambiguous) |
| `shouldUpdateExistingPositionForDefaultUser` | `PUT /positions/{id}` success | api-contract, user-scoping | `200`, existence check then save with path id and `default` user | `SPEC.md`, user-scoping contract | PASS |
| `shouldReturn404WhenUpdatingMissingPosition` | `PUT` missing id | http-status | `404` with not-found reason | `docs/ERROR_CATALOG.md` Portfolio | PASS |
| `shouldReturn400WhenUpdatingWithBlankSymbol` | `PUT` blank symbol | validation, http-status | `400` | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenUpdatingWithZeroQuantity` | `PUT` quantity `0` | validation, http-status | `400` | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenUpdatingWithNegativeAvgCostPrice` | `PUT` negative avg cost | validation, http-status | `400` | domain invariant, `docs/ERROR_CATALOG.md` | ERROR (unhandled IllegalArgumentException) |
| `shouldReturn400WhenUpdatePathIdIsNotNumeric` | `PUT /positions/not-a-number` | routing, http-status | `400`, no save | HTTP semantics | PASS |
| `shouldReturn404WhenUpdateTargetIsNotFoundForNegativeAndZeroIds` | `PUT /positions/-1` and `/0` missing | http-status | `404` when ownership lookup empty | `docs/ERROR_CATALOG.md` | PASS |
| `shouldClarifyLedgerBehaviorOnPositionUpdate` | whether update should sync ledger | ledger-sync | explicit contract needed | transaction-ledger contract | SKIPPED (ambiguous) |
| `shouldDeletePositionOnlyAfterOwnershipCheck` | `DELETE /positions/{id}` success | user-scoping | `204`, lookup then delete (`InOrder`) | `SPEC.md`, user-scoping contract | PASS |
| `shouldReturn404WhenDeletingMissingPosition` | `DELETE` missing id | http-status | `404`, no delete call | `docs/ERROR_CATALOG.md` | PASS |
| `shouldNotReturnFalseNoContentWhenDeleteFails` | `DELETE` persistence failure | http-status | should not silently return `204` | HTTP semantics | PASS |
| `shouldClarifyLedgerBehaviorOnPositionDelete` | whether delete should mutate ledger | ledger-sync | explicit contract needed | transaction-ledger contract | SKIPPED (ambiguous) |
| `shouldRejectUnsupportedHttpMethodsAndOutOfScopeRoutes` | unsupported routes/methods | routing | non-successful 4xx responses | HTTP semantics | PASS |
| `shouldRejectUnsupportedContentTypeForCreate` | `POST` text/plain | validation | `415`, no side-effects | HTTP semantics | PASS |
| `shouldRejectMissingContentTypeForCreate` | `POST` no content type | validation | `415` | HTTP semantics | PASS |
| `shouldRejectUnsupportedContentTypeForUpdate` | `PUT` text/plain | validation | `415`, no side-effects | HTTP semantics | PASS |
| `shouldReturn400ForEmptyJsonBodyOnCreate` | `POST {}` | validation, http-status | `400` | `docs/ERROR_CATALOG.md` Portfolio | ERROR (unhandled IllegalArgumentException) |
| `shouldClarifyStableErrorShapeExpectationForAllExistingPortfolioPositionErrors` | stable error schema across existing controllers | error-shape | ownership/timeline clarification needed | `SPEC.md` + `docs/ERROR_CATALOG.md` | SKIPPED (ambiguous) |

## Summary
- Tests before: `0`
- Tests after: `47`
- Tests added: `47`
- Passed: `26`
- Failed: `3`
- Errors: `11`
- Ambiguous (`@Disabled`): `7`
- Blocked: `0`
