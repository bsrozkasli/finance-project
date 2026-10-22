-- OQ-5 Phase 3. Rows saved as STOCK with UNAVAILABLE metadata never had a provider or trusted
-- mapping classification: the type was a default (and V4 gave pre-existing rows UNAVAILABLE).
-- Mark them UNRESOLVED instead of asserting STOCK. metadata_status stays UNAVAILABLE, so the
-- relabelled rows remain identifiable; re-adding a symbol re-resolves it from the provider.
-- Reverse if ever required: UPDATE assets SET type = 'STOCK'
--   WHERE type = 'UNRESOLVED' AND metadata_status = 'UNAVAILABLE';
UPDATE assets
SET type = 'UNRESOLVED'
WHERE type = 'STOCK'
  AND metadata_status = 'UNAVAILABLE';
