# Smart report test inventory

| Test | Behaviour | Expected result source | Bug category |
| --- | --- | --- | --- |
| `SmartReportUseCaseTest#preservesMissingCompositeScoreFieldsAsUnavailable` | A partially unavailable composite score must remain unavailable in the assembled report. | PRD-FR-010: provider failure preserves verified sections and never fabricates market data. | Provider degradation / fabricated default |
