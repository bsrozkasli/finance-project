# Documentation Index

This directory contains architecture, API, provider, workflow, and operating
guides for the finance-project monorepo.

## Core Documentation

| Document | Purpose |
|---|---|
| `ERROR_CATALOG.md` | Endpoint-level HTTP status, error schema, provider failure mapping, and frontend error handling guide |
| `PROVIDER_GUIDE.md` | External provider priority, fallback behavior, health endpoints, and provider onboarding |
| `openapi.yaml` | Generated OpenAPI specification for the backend API |
| `architecture.md` | System architecture and data-flow diagrams |
| `AGENT_ANALYSIS_ARCHITECTURE.md` | Multi-agent analysis architecture |
| `AGENT_WORKFLOW.md` | Agent execution workflow |

## Engineering Rules

| Document | Purpose |
|---|---|
| `BACKEND_RULES.md` | Backend implementation rules |
| `DATA_SERVICE_RULES.md` | FastAPI/data-service implementation rules |
| `FRONTEND_RULES.md` | Frontend implementation rules |
| `CODING_STANDARDS.md` | Shared coding standards |
| `TESTING_PROTOCOL.md` | Testing expectations and commands |
| `ERROR_FIX_PROTOCOL.md` | Error triage and fix workflow |

## Planning And Operations

| Document | Purpose |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Implementation roadmap and sequencing |
| `KNOWN_ISSUES.md` | Known issues and follow-up items |
| `STITCH_UI_GUIDE.md` | UI guide for Stitch-generated views |

## Architecture Decision Records

ADR files live in `docs/adr/`. Start with `docs/adr/README.md`, then add new
decisions as numbered files using the existing ADR format.
