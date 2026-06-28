# Frontend Rules

The frontend is a Vite + React + TypeScript application.

## Source of Truth

Google Stitch is the source of truth for UI decisions.

Before writing frontend UI code:

1. Read the active Google Stitch project.
2. Read every relevant screen.
3. Read the Stitch design system.
4. Read Stitch design tokens.
5. Read `FRONTEND_ROADMAP.md`.
6. Compare Stitch with the current frontend.
7. Create an implementation plan.
8. Only then edit code.

If Stitch defines the UI, do not redesign it from personal preference.

## Application Style

The product should feel like an institutional investment analytics platform, not a retail investing app.

Design goals:

- Premium
- Minimal
- Information dense
- Fast
- Professional
- Modern
- Consistent
- Highly readable

Use Bloomberg Terminal data density with TradingView-style usability as the reference direction, while following Stitch precisely.

## Code Organization

- `frontend/src/api/client.ts` owns backend API access to `http://localhost:8080/api/v1`.
- Update `frontend/vite.config.ts` together with `client.ts` if backend routing changes.
- Page-level state belongs in pages such as `Dashboard.tsx`.
- Data fetching belongs in hooks.
- Presentational components should receive data and callbacks through typed props.
- Reuse shared components when a pattern repeats.
- Avoid duplicated table, card, formatter, and loading-state logic.

## TypeScript Rules

- Avoid `any`.
- Define API response types close to the API client or hook.
- Keep component props explicit.
- Use discriminated unions for UI states when helpful.
- Keep chart data typed for the charting library.

## Styling Rules

- Use design tokens in `frontend/src/index.css`.
- Do not introduce conflicting palettes or one-off spacing systems.
- Keep layouts responsive by default.
- Validate text overflow on narrow and wide viewports.
- Maintain accessible contrast and keyboard-visible controls.
- Use semantic controls for buttons, forms, tabs, menus, and filters.

## API Compatibility

- Preserve backend endpoint shapes and DTO fields unless all consumers are updated.
- Do not call data-service directly from the frontend unless the architecture is intentionally changed.
- The normal frontend path is frontend to Spring backend to data-service/external APIs.

## Frontend Validation

From `frontend/`:

```powershell
npm run lint
npm run build
```

`npm run build` includes TypeScript validation through `tsc -b && vite build`.
