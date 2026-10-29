// Typed endpoints for the proposed UI redesign v2 contract
// (docs/spec/proposed/ui-redesign-v2.openapi.yaml). Import from '../api/redesign'; this barrel is
// deliberately not re-exported from api/client.ts to avoid name clashes with implemented DTOs.
// Zod schemas live in ./schemas and are imported by tests only (types here are type-only).
export * from './portfolioAnalytics';
export * from './riskAndStops';
export * from './comparison';
export * from './earnings';
export * from './transactions';
export * from './newsCalendar';
export * from './watchlists';
export * from './company';
export * from './reports';
export type * from './schemas';
