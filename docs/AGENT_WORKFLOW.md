# Agent Workflow

This document defines how AI agents should work in this repository.

## Required First Steps

1. Read the active instruction files:
   - `AGENTS.md`
   - `CONTRIBUTING.md`
   - `README.md`
   - Relevant files under `docs/`
2. Check repository state:

```powershell
git status --short
```

3. Identify touched runtime part:
   - Backend
   - Frontend
   - Data-service
   - Documentation only
4. Inspect existing patterns before adding new code.
5. Keep changes scoped to the user request.

## Worktree Safety

- Do not revert files you did not change.
- Do not run destructive git commands unless explicitly requested.
- Do not delete generated or untracked files unless the task requires it and the scope is clear.
- If unrelated changes exist, ignore them.
- If unrelated changes block the task, explain the conflict before proceeding.

## Architecture Checklist

Before editing backend code, answer:

- Is this domain logic, inbound adapter code, or outbound adapter code?
- Does the domain need a new or existing port?
- Are DTO names and endpoint shapes preserved?
- Are financial calculations using `BigDecimal`?
- Are external calls protected by the existing resilience patterns?

Before editing frontend code, answer:

- Has the active Google Stitch project been read?
- Which Stitch screen or token drives this UI?
- Does the change reuse `frontend/src/index.css` tokens?
- Are API calls kept in hooks or API client modules?

Before editing data-service code, answer:

- Is this a router concern or a service concern?
- Does the endpoint stay read-only?
- Does technical analysis still enforce the candle minimum?

## Communication Standard

When reporting work, include:

- Files created or changed.
- Validation commands run.
- Any command failures with exact error summary.
- Any remaining risk or known missing coverage.

## Exact Validation Commands

Backend:

```powershell
cd backend
.\mvnw.cmd test
```

Data-service:

```powershell
cd data-service
python -m pytest
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## Final Response Checklist

- State what changed.
- State what was validated.
- State what was not validated, if anything.
- Keep the summary concise and factual.
