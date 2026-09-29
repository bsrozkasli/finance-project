# Stitch UI Guide

Google Stitch is the frontend source of truth.

## Mandatory Stitch Workflow

Before modifying UI:

1. Open the active Google Stitch project.
2. Read every relevant screen.
3. Read the design system.
4. Read design tokens.
5. Read component states and layout behavior.
6. Compare Stitch with the current frontend implementation.
7. Identify reusable components already present in `frontend/src`.
8. Write an implementation plan.
9. Edit code only after the comparison is complete.

## What Stitch Controls

Stitch controls:

- Layout
- Spacing
- Typography
- Color usage
- Component hierarchy
- Navigation structure
- Interaction states
- Density
- Responsive behavior
- Visual priority of data

Do not redesign these areas when Stitch already defines them.

## Product Direction

The UI should be an institutional investment analytics platform.

It should avoid:

- Consumer finance styling
- Oversized marketing sections
- Low-density decorative cards
- Unnecessary gradients or visual noise
- UI copy that explains obvious controls

It should favor:

- Dense but readable financial data
- Clear tables and filters
- Fast scanning
- Professional chart/workspace patterns
- Collapsible panels where Stitch defines them
- Accessible interactive states

## Implementation Rules

- Use `frontend/src/index.css` tokens unless Stitch requires a token update.
- Keep API calls out of visual components.
- Preserve endpoint shapes and DTO fields.
- Use typed props and typed hook return values.
- Build reusable components when the same Stitch pattern appears in multiple places.
- Check mobile and desktop layouts for overflow.

## Validation

From `frontend/`:

```powershell
npm run lint
npm run build
```

For UI tasks, also manually verify:

- Stitch screen parity.
- Responsive layout behavior.
- Keyboard access for interactive controls.
- No overlapping text or controls.
- Loading, empty, and error states.

## If Stitch Is Unavailable

If the active Stitch project cannot be accessed:

1. Do not claim full roadmap compliance.
2. Use existing frontend tokens and components.
3. Keep changes minimal and reversible.
4. Document that Stitch parity was not verified.
