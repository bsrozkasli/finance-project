# Stage 1 Summary

- Stage: `1-unit`
- Timestamp (UTC): 2026-07-04T22:42:58Z

## Backend (Spring Boot)

- Command: `backend/.\\mvnw.cmd test "-Djacoco.skip=false"`
- Result: Maven log reports `BUILD SUCCESS`.
- Test result: `Tests run: 69, Failures: 0, Errors: 0, Skipped: 0`.
- ArchUnit check added: `ArchitectureTest.domain_package_must_not_depend_on_spring` (executed, no violation).
- DI errors: none detected (`BeanCreationException` / `NoSuchBeanDefinitionException` not present in backend log).

### JaCoCo Domain Coverage

- Domain line coverage: **74.3%**.
- Status: below 80% threshold.
- Classes below 80% in `com.ozkaslibasar.financeproject.domain*`:
  - `com.ozkaslibasar.financeproject.domain.model.FundamentalSnapshot` -> 0%
  - `com.ozkaslibasar.financeproject.domain.model.MarketCalendar` -> 0%
  - `com.ozkaslibasar.financeproject.domain.model.Watchlist` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.FullAnalysisResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.InsightData` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.InsightResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.SentimentData` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.SentimentResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort.TechnicalData` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PatternDetectionPort.DetectedPattern` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PatternDetectionPort.PatternDetectionResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort.OptimizationRequest` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort.OptimizationResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort.PortfolioMetrics` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort.RebalanceAction` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioOptimizationPort.RebalanceRequest` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort.EarningsQuarter` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort.FundamentalMetrics` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort.FundamentalResearch` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort.InstitutionalScores` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort.CompanyMetrics` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.CompositeScore` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ScoreBreakdown` -> 0%
  - `com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort.TechnicalAnalysisResult` -> 0%
  - `com.ozkaslibasar.financeproject.domain.service.PriceIngestionService` -> 31.25%
  - `com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase` -> 42.31%
  - `com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService` -> 45.45%
  - `com.ozkaslibasar.financeproject.domain.model.JournalTrade` -> 64.86%
  - `com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction` -> 66%
  - `com.ozkaslibasar.financeproject.domain.model.Portfolio` -> 66.67%
  - `com.ozkaslibasar.financeproject.domain.model.PortfolioPosition` -> 71.43%
  - `com.ozkaslibasar.financeproject.domain.service.PriceRefreshService` -> 74.58%
  - `com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot` -> 75%
  - `com.ozkaslibasar.financeproject.domain.model.FinancialStatement` -> 76.19%

## Data-Service (FastAPI)

- `ruff check .`: failed (`ruff_not_found`).
- `mypy .`: failed (duplicate module `main`; additional SyntaxWarning in external TradingAgents file).
- `python -m pytest --cov=. --cov-report=term-missing`: failed (`--cov` args unrecognized; pytest-cov missing).

### Pandas Test Assertion Note

- Tests importing pandas were found in:
  - `data-service/tests/test_analysis_endpoints.py`
  - `data-service/tests/test_portfolio_service.py`
  - `data-service/tests/test_technical_analysis_service.py`
- `assert_frame_equal` usage was not found in `data-service/tests`.
- Improvement suggestion: for DataFrame-producing logic, prefer `pandas.testing.assert_frame_equal(...)` to avoid fragile element-wise assertions and to validate index/dtype/column semantics.

## Frontend (React/TypeScript)

- `npm run lint`: passed.
- `tsc --noEmit`: passed.
- `npm run build`: passed (after unsandboxed rerun due initial sandbox EPERM).
- `npm test -- --coverage`: failed (missing `test` script in `frontend/package.json`).

## Error Log Updates

- Appended stage entries to `test-results/errors.jsonl`: 5
- Raw logs:
  - `test-results/logs/backend-stage1-unit.log`
  - `test-results/logs/data-service-ruff-stage1.log`
  - `test-results/logs/data-service-mypy-stage1.log`
  - `test-results/logs/data-service-pytest-cov-stage1.log`
  - `test-results/logs/frontend-lint-stage1.log`
  - `test-results/logs/frontend-tsc-stage1.log`
  - `test-results/logs/frontend-build-stage1.log`
  - `test-results/logs/frontend-test-coverage-stage1.log`
