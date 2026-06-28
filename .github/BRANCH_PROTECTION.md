# Branch Protection Configuration

Configure these settings manually in GitHub UI:

1. Open `Settings` -> `Branches`.
2. Add or edit the branch protection rule for `main`.
3. Enable `Require a pull request before merging`.
4. Enable `Require status checks to pass before merging`.
5. Select these required status checks:
   - `backend-ci`
   - `data-service-ci`
   - `frontend-ci`
   - `All checks passed`
6. Enable `Require branches to be up to date before merging`.
7. Enable `Dismiss stale pull request approvals when new commits are pushed`.
8. Keep direct pushes to `main` disabled for normal contributors.

These settings enforce the AGENTS.md release rule that changes targeting `main` must pass the required CI checks and be merged through a reviewed pull request.