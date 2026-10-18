# Market Data Test Inventory

- AssetResolutionServiceTest.manualOverrideMappingSuppliesEtfMetadataWhenProviderMetadataIsMissing
  - Tests DRAM/manual override mapping when provider metadata is empty.
  - Expected source: symbol mapping business rule from plan.
  - Bug category: symbol resolution / ETF metadata fallback.

- AssetResolutionServiceTest.providerMetadataWinsButCanonicalSymbolStaysStable
  - Tests provider metadata enrichment while preserving canonical symbol.
  - Expected source: canonical symbol contract and non-breaking API behavior.
  - Bug category: symbol normalization / provider-specific symbol mapping.

- AssetResolutionServiceTest.missingProviderAndMissingMappingReturnsExplicitUnavailableMetadata
  - Tests no fake metadata when provider and mapping are unavailable.
  - Expected source: AGENTS.md no-fake-market-data rule.
  - Bug category: provider degradation / data integrity.

- ProviderRequestGuardTest.returnsDegradedResultWhenMinuteQuotaIsExceeded
  - Tests minute quota blocks extra provider calls.
  - Expected source: rate-limit/backoff plan.
  - Bug category: quota exhaustion / request fan-out.

- ProviderRequestGuardTest.rateLimitResponseStartsBackoffAndBlocksNextRequest
  - Tests 429 starts cooldown and subsequent request degrades without calling provider.
  - Expected source: rate-limit/backoff plan.
  - Bug category: provider 429 handling / backoff.

- AssetControllerTest.shouldBatchAddResolvedEtfWithMetadataStatus
  - Tests batch add returns resolved ETF metadata and metadataStatus.
  - Expected source: API contract extension in plan.
  - Bug category: API integration / ETF metadata.

- ChartWorkspace.test.tsx renders real OHLCV summary and creates chart series from history
  - Tests chart UI consumes real OHLCV history and initializes chart series.
  - Expected source: chart plan and OHLCV API contract.
  - Bug category: mock-like chart rendering.

- ChartWorkspace.test.tsx switches to Heikin Ashi mode without requiring mock candle data
  - Tests Heikin Ashi mode derives from real candles.
  - Expected source: chart plan.
  - Bug category: chart mode switching / derived candle rendering.

- ChartWorkspace.test.tsx shows provider unavailable state instead of fake candles
  - Tests error state does not render fake chart data.
  - Expected source: AGENTS.md no-fake-market-data rule.
  - Bug category: provider degradation / UI honesty.

- PortfolioManagerView.test.tsx renders a modern donut allocation chart from real holding values
  - Tests allocation chart slices and legend are derived from live holding quantities and prices.
  - Expected source: chart modernization plan.
  - Bug category: placeholder pie chart rendering.

- PortfolioManagerView.test.tsx does not render placeholder allocation slices for an empty portfolio
  - Tests empty portfolios show an honest empty state instead of fake allocation slices.
  - Expected source: AGENTS.md no-fake-market-data rule.
  - Bug category: provider degradation / UI honesty.
