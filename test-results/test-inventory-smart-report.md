# Smart report test inventory

| Test | Behaviour | Expected result source | Bug category |
| --- | --- | --- | --- |
| `SmartReportUseCaseTest#preservesMissingCompositeScoreFieldsAsUnavailable` | A partially unavailable composite score must remain unavailable in the assembled report. | PRD-FR-010: provider failure preserves verified sections and never fabricates market data. | Provider degradation / fabricated default |
| `StockDetailModal#renders a partial smart report without replacing unavailable scores` | The report UI keeps verified scores visible and renders missing scores as unavailable. | PRD-FR-010: verified sections survive provider failure; unavailable data is not fabricated. | Null handling / partial-result rendering |
