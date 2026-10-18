# Finance Project Agent Instructions

<!-- bmad:context -->
<!-- Verified 2026-10-01 against 3e1b63b. Managed by bmad-project-context. -->

## Finance Project

Brownfield investment research and portfolio decision-support monorepo with
Spring Boot, FastAPI, and React runtimes. `SPEC.md` defines verified current
behavior; `docs/product/PRD.md` defines target product behavior. Architecture
decisions live in `docs/adr/`.

## Policy

- For repository guidance use: `AGENTS.md` > `SPEC.md` and its listed companions
  > other documents > code comments.
- When sources conflict, prefer the stricter rule for architecture, contract
  compatibility, data integrity, financial correctness, and provider degradation.
  Stop and ask if the conflict cannot be resolved safely.
- Work on a task branch; never commit or push directly to `main` or `release/*`.
  Protected branches are reached through a reviewed PR.
- Preserve unrelated working-tree changes and exclude them from scoped commits.
- Never fabricate market data, metadata, news, analysis, research, or AI output.
- Never commit or expose secrets, provider credentials, `.env`, build output,
  dependency directories, or generated junk.
- Preserve endpoint paths and DTO fields unless every consumer changes together.
- Applied Flyway migrations are immutable; create a new migration for schema changes.

## Where Things Are

- Current-system kernel: `SPEC.md`
- Architecture or runtime boundaries:
  `docs/spec/current-system/architecture.md`
- Frontend UI, routing, design tokens, component ownership, or accessibility:
  `docs/spec/current-system/architecture.md`
- Endpoint, DTO, browser-route, response, or error contracts:
  `docs/spec/current-system/contracts.md`
- Domain models, financial calculations, persistence, or migrations:
  `docs/spec/current-system/domain-and-data.md`
- Providers, caches, configuration, security, degradation, or observability:
  `docs/spec/current-system/operations.md`
- Tests, smoke scenarios, bug reporting, CI, or release readiness:
  `docs/agent/verification.md`
- Product scope and target behavior: `docs/product/PRD.md`
- Architecture decisions: `docs/adr/`

## Running and Verifying

- Read the task-triggered reference above before editing the affected behavior.
- Run every touched runtime's required checks and the applicable smoke scenarios
  from `docs/agent/verification.md`.
- Make no completion or release-readiness claim without fresh command evidence.
- In test-only tasks, do not change production source; record genuine failures
  using the bug-reporting contract in `docs/agent/verification.md`.
- Never call live financial providers from automated tests; use boundary stubs.
- Keep commits atomic and use Conventional Commits with the documented scopes.

## Conventions That Differ From Defaults

- Keep backend domain code framework-free; reach infrastructure through ports and
  register pure domain services in `DomainConfig.java`.
- Keep controllers and scheduled adapters thin; business logic belongs in domain
  services or use cases.
- Normal frontend application flows go through the Spring backend, not directly
  to the data-service.
- Keep data-service analytics read-only unless a persistence architecture is
  explicitly approved.
- Agent reasoning receives prepared metrics only and preserves the documented
  sequential analyst order.
- Represent provider failure explicitly as unavailable, insufficient, empty,
  partial, or stale data; never replace missing evidence with synthetic values.

<!-- /bmad:context -->
