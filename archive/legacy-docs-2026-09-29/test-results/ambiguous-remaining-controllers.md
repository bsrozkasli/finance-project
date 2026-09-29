# Ambiguous Behavior - Remaining Controllers

AMBIGUOUS_BEHAVIOR:
- Backtest symbol normalization ownership (`/api/v1/backtest/{symbol}`): SPEC states symbols are generally normalized, but does not explicitly assign normalization responsibility to controller vs downstream adapter.
- Notification read-all success status (`POST /api/v1/notifications/read-all`): SPEC status guide favors `204` for command-without-body, while endpoint docs do not explicitly lock `200` vs `204`.
- Chat stable error-shape enforcement for legacy controllers: SPEC/error catalog describes target stable shape, but rollout note indicates existing controllers may still use default Spring error outputs.
- Analyst price-target null response shape: not explicit whether null upstream target should be serialized as `null`, empty-body, or a structured object with nullable fields.

Cache-key risk notes (not blocked, but requires product decision):
- `AnalystController#getRecommendations` cache key: `'rec:' + #symbol.toUpperCase()`.
- `AnalystController#getPriceTarget` cache key: `'pt:' + #symbol.toUpperCase()`.
- Both keys uppercase but do not trim whitespace, so `"AAPL"` and `" AAPL "` map to different keys.

Disabled tests representing ambiguity:
- `ChatControllerTest#shouldClarifyStableErrorSchemaOwnershipForChatController`
- `BacktestControllerTest#shouldClarifyBacktestSymbolNormalizationOwnership`
- `AnalystControllerTest#shouldClarifyPriceTargetNullShapeContract`
- `NotificationControllerTest#shouldClarifyReadAllStatusCodeContract`
