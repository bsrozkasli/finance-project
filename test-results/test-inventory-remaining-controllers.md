| Controller | Test method | Scenario | Expected | Source | Result |
|---|---|---|---|---|---|
| ChatController | shouldReturn200WithResponseFieldAndDelegateExactSymbolAndMessage | valid request and exact delegation | 200 with `response`; adapter gets exact symbol/message | SPEC.md §7 API map (`POST /chat/ask`) | PASS |
| ChatController | shouldRejectInvalidPayloadShapesByContractAndAvoidAdapterCalls | null/blank/empty symbol-message + missing fields | 400 for invalid payloads, no adapter call | docs/ERROR_CATALOG.md Chat rows (`400` on missing symbol/message) | FAIL |
| ChatController | shouldRejectMalformedJsonAndAvoidAdapterCalls | malformed JSON | 400, no adapter call | docs/ERROR_CATALOG.md Chat malformed JSON | PASS |
| ChatController | shouldRejectEmptyBodyAndAvoidAdapterCalls | empty body | 400, no adapter call | SPEC §8 malformed request semantics | PASS |
| ChatController | shouldRejectUnsupportedContentTypeAndAvoidAdapterCalls | unsupported content type | 415, no adapter call | Spring MVC contract + SPEC §8 invalid request | PASS |
| ChatController | shouldReturnNullResponseWhenAdapterReturnsNullWithoutFabrication | adapter returns null string | no fabricated fallback response | AGENTS.md provider degradation/no fake data | PASS |
| ChatController | shouldReturnBlankResponseWhenAdapterReturnsBlankWithoutFabrication | adapter returns blank | no fabricated fallback response | AGENTS.md provider degradation/no fake data | PASS |
| ChatController | shouldReturn503WhenDependencyThrowsByContract | dependency exception | 503 Service Unavailable | docs/ERROR_CATALOG.md Chat `503` | FAIL |
| ChatController | shouldRejectUnsupportedRoutesAndHttpMethods | wrong route/methods | rejected (4xx) | REST routing contract | PASS |
| ChatController | shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse | representative error body | no stacktrace/secrets | SPEC §8 + docs/ERROR_CATALOG.md error-schema notes | PASS |
| ChatController | shouldClarifyStableErrorSchemaOwnershipForChatController | stable error schema rollout | ambiguous ownership | SPEC §8 + docs/ERROR_CATALOG.md migration note | SKIPPED |
| BacktestController | shouldReturn200AndPreserveBacktestFieldsAndDelegateExactlyOnce | valid result | 200, all BacktestResult fields preserved, one call | SPEC §7 backtest endpoint | PASS |
| BacktestController | shouldDocumentLowercaseAndMixedCaseDelegationBehavior | case behavior observation | documented delegation behavior | user-required behavior capture | PASS |
| BacktestController | shouldRejectBlankAndMalformedSymbolsByContractWithoutDelegation | blank/malformed symbol | reject as client error (4xx), no delegation | SPEC §8 malformed request guidance + ERROR_CATALOG status guide | FAIL |
| BacktestController | shouldReturn503WhenAdapterReturnsNullByContract | null adapter result | 503 (no fabricated backtest) | docs/ERROR_CATALOG.md backtest `503`/no fallback | FAIL |
| BacktestController | shouldReturn503WhenAdapterThrowsDependencyExceptionByContract | dependency exception | 503 Service Unavailable | docs/ERROR_CATALOG.md backtest `503` | FAIL |
| BacktestController | shouldRejectUnsupportedRoutesAndHttpMethods | wrong route/methods | rejected (4xx) | REST routing contract | PASS |
| BacktestController | shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse | representative error body | no stacktrace/secrets | SPEC §8 error handling/security notes | PASS |
| BacktestController | shouldClarifyBacktestSymbolNormalizationOwnership | normalization ownership | ambiguous | SPEC symbol normalization is general, not endpoint-explicit | SKIPPED |
| AnalystController | shouldReturnRecommendations200AndPreserveOrderFieldsAndUppercaseSymbol | valid recommendations list | 200, order/fields preserved, uppercase delegation | SPEC §7 analyst endpoint + controller contract | PASS |
| AnalystController | shouldReturn200EmptyArrayWhenRecommendationsProviderReturnsEmptyList | empty list degradation | 200 `[]` | AGENTS.md degradation rule (empty lists allowed) | PASS |
| AnalystController | shouldTreatNullRecommendationListAsEmptyArrayByContract | null list behavior | 200 `[]` (not empty-body/null) | AGENTS.md + ERROR_CATALOG degradation guidance | FAIL |
| AnalystController | shouldDegradeGracefullyWhenRecommendationProviderThrows | provider exception | graceful degradation, no exception leak | AGENTS.md provider degradation/no fake data | FAIL |
| AnalystController | shouldReturnPriceTarget200AndPreserveNumericFieldsAndUppercaseSymbol | valid price target | 200, fields preserved, uppercase delegation | SPEC §7 analyst endpoint | PASS |
| AnalystController | shouldDocumentNullPriceTargetBehaviorWithoutFabrication | null target behavior | no fabricated target payload | AGENTS.md no fake data + user null-behavior check | PASS |
| AnalystController | shouldDegradeGracefullyWhenPriceTargetProviderThrows | provider exception | graceful degradation, no exception leak | AGENTS.md provider degradation/no fake data | FAIL |
| AnalystController | shouldExposeAnalystCacheAnnotationsAndKeyPrefixesWithWhitespaceRisk | cache annotation audit | cache `analystCache`; keys `rec:`/`pt:` | user-required cache inspection | PASS |
| AnalystController | shouldDelegateWhitespaceSymbolUppercasedWithoutTrimming | whitespace behavior observation | no trimming; uppercase transformation only | user-required whitespace/cache-risk check | PASS |
| AnalystController | shouldRejectUnsupportedRoutesAndHttpMethods | wrong route/methods | rejected (4xx) | REST routing contract | PASS |
| AnalystController | shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse | representative error body | no stacktrace/secrets | SPEC §8 + security notes | PASS |
| AnalystController | shouldClarifyPriceTargetNullShapeContract | null-shape strict contract | ambiguous | SPEC/docs do not fully specify null-object-vs-empty-body | SKIPPED |
| NotificationController | shouldReturn200AllNotificationsArrayAndPreserveRepositoryFields | all notifications | 200, array and stable fields | SPEC §7 notifications list | PASS |
| NotificationController | shouldReturn200EmptyArrayWhenAllNotificationsAreEmpty | empty all list | 200 `[]` | list endpoint degradation expectations | PASS |
| NotificationController | shouldReturn200UnreadNotificationsAndOnlyRepositoryOutput | unread list | 200, repository output preserved | SPEC §7 unread endpoint | PASS |
| NotificationController | shouldReturn200EmptyArrayWhenUnreadNotificationsAreEmpty | empty unread list | 200 `[]` | list endpoint degradation expectations | PASS |
| NotificationController | shouldTreatNullNotificationListsAsEmptyArraysByContract | null-list behavior | 200 `[]` instead of empty-body | AGENTS degradation guidance + list endpoint contract | FAIL |
| NotificationController | shouldReturn503WhenNotificationRepositoryThrowsForAllNotifications | repository exception on `/notifications` | 503 Service Unavailable | SPEC §8 status guide (dependency unavailable) | FAIL |
| NotificationController | shouldReturn503WhenNotificationRepositoryThrowsForUnreadNotifications | repository exception on `/notifications/unread` | 503 Service Unavailable | SPEC §8 status guide (dependency unavailable) | FAIL |
| NotificationController | shouldCallReadAllExactlyOnceAndReturnNoBody | read-all success behavior | markAllAsRead once, empty body | controller contract + command semantics | PASS |
| NotificationController | shouldNotReturnFalseSuccessWhenReadAllFails | read-all failure behavior | must not return false 200 success | user-required failure guard | PASS |
| NotificationController | shouldRejectUnsupportedRoutesAndHttpMethods | wrong route/methods | rejected (4xx) | REST routing contract | PASS |
| NotificationController | shouldNotExposeSensitiveInternalsOnRepresentativeErrorResponse | representative error body | no stacktrace/secrets | SPEC §8 + security notes | PASS |
| NotificationController | shouldClarifyReadAllStatusCodeContract | 200 vs 204 | ambiguous | SPEC status table vs endpoint-specific omission | SKIPPED |

Totals per controller:
- ChatController: total 11, pass 8, fail 2, skipped 1
- BacktestController: total 8, pass 4, fail 3, skipped 1
- AnalystController: total 12, pass 8, fail 3, skipped 1
- NotificationController: total 12, pass 8, fail 3, skipped 1

Overall:
- Total tests in campaign: 43
- Executed (non-skipped): 39
- Passed: 28
- Failed/Error: 11
- Skipped (ambiguity): 4
