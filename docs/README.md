# Documentation Map

Use this page as a human navigation aid. Mandatory agent routing is defined
directly in `../AGENTS.md`; no task should require another index hop.

## Current-System Contract

| Document | Owns |
|---|---|
| `../SPEC.md` | Lean kernel for verified implemented behavior |
| `spec/current-system/architecture.md` | Runtime boundaries, component ownership, and cross-service flows |
| `spec/current-system/contracts.md` | Browser routes, HTTP endpoints, DTO/error compatibility |
| `spec/current-system/domain-and-data.md` | Domain invariants, financial rules, persistence, and migrations |
| `spec/current-system/operations.md` | Providers, degradation, caches, configuration, security, and observability |
| `agent/verification.md` | Tests, smoke scenarios, bug reporting, CI, PR, and release evidence |
| `openapi.yaml` | Generated/supporting backend OpenAPI artifact |

## Target Specs (proposed, not implemented)

| Document | Owns |
|---|---|
| `spec/proposed/ui-redesign-v2.md` | Screen-by-screen requirements, rules and open questions for UI redesign v2 |
| `spec/proposed/ui-redesign-v2.openapi.yaml` | Proposed additive backend endpoints (OpenAPI 3.0.3); not the generated `openapi.yaml` |
| `product/decisions/2026-10-29-ui-redesign-v2.md` | Decisions taken for the redesign, with cost-if-wrong |
| `prototypes/finance-ui-v2/` | Design reference (nine artboards); sample numbers are not evidence |

Target specs never override the current-system contract. A slice moves into
`spec/current-system/` only when it is implemented and verified.

## Product Definition and Delivery

| Document | Owns |
|---|---|
| [Product documentation index](product/README.md) | Reading order for current evidence, target requirements, gaps, epics, and verification stories |
| `product/PRD.md` | Target product scope, requirements, roadmap, and risks |
| `product/reconcile-foundation.md` | Foundation reconciliation record |
| `product/reconcile-finance-risk.md` | Finance/risk reconciliation record |
| `product/review-brownfield.md` | Brownfield PRD review |
| `product/review-finance.md` | Finance review |
| `product/review-rubric.md` | PRD rubric review |
| `superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md` | Approved evidence-driven product foundation |
| `superpowers/specs/2026-09-30-agent-context-and-current-spec-design.md` | Agent-context/current-system documentation design |
| `superpowers/plans/2026-09-29-product-documentation-reconstruction.md` | Product-documentation plan set |
| `superpowers/plans/2026-10-01-agent-context-current-spec-restructure.md` | Current documentation restructure plan |
| `superpowers/templates/implementation-plan-template.md` | Reusable implementation-plan structure |

## Architecture Decisions

Accepted decisions live in `adr/`. Start with `adr/README.md`; add decisions as
zero-padded numbered ADRs using the existing format.

## Archive

`LEGACY_ARCHIVE_MANIFEST.md` records physical archive contents and the
Git-recoverable retired guides that were superseded by the canonical documents
above. Historical documents are context only and never override current sources.
