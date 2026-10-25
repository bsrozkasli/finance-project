-- Append-only evidence snapshots (EPIC-001 Task 2). Additive: no existing table is altered.
-- Inverse: DROP TABLE research_evidence_fields; DROP TABLE research_evidence_snapshots;
CREATE TABLE research_evidence_snapshots (
    id                    UUID                     PRIMARY KEY,
    previous_id           UUID                     REFERENCES research_evidence_snapshots(id),
    revision              BIGINT                   NOT NULL,
    symbol                VARCHAR(40)              NOT NULL,
    asset_type            VARCHAR(20)              NOT NULL,
    listing_status        VARCHAR(20)              NOT NULL,
    classification_basis  VARCHAR(30)              NOT NULL,
    identity_source       VARCHAR(80)              NOT NULL,
    identity_retrieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    captured_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_research_evidence_symbol_revision UNIQUE (symbol, revision),
    CONSTRAINT uk_research_evidence_previous UNIQUE (previous_id),
    CONSTRAINT ck_research_evidence_revision CHECK (revision >= 1),
    -- Only the first revision has no predecessor; every later one names the snapshot it supersedes.
    CONSTRAINT ck_research_evidence_lineage CHECK ((revision = 1) = (previous_id IS NULL)),
    CONSTRAINT ck_research_evidence_identity_time CHECK (identity_retrieved_at <= captured_at)
);

-- One row per retained observation. A field name may repeat for different periods or sources.
CREATE TABLE research_evidence_fields (
    id             BIGSERIAL                PRIMARY KEY,
    snapshot_id    UUID                     NOT NULL REFERENCES research_evidence_snapshots(id),
    position       INTEGER                  NOT NULL,
    name           VARCHAR(80)              NOT NULL,
    raw_value      TEXT,
    missing_reason VARCHAR(20),
    source         VARCHAR(80)              NOT NULL,
    observed_at    TIMESTAMP WITH TIME ZONE,
    retrieved_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    period         VARCHAR(40),
    currency       VARCHAR(10),
    normalization  VARCHAR(80),
    freshness      VARCHAR(20)              NOT NULL,
    conflict_note  TEXT,
    CONSTRAINT uk_research_evidence_fields_position UNIQUE (snapshot_id, position),
    -- Mirrors the domain invariants: a field has a value or a missing reason, never both; a present value
    -- has an observation time, and nothing is observed after it was retrieved.
    CONSTRAINT ck_research_evidence_fields_value CHECK ((missing_reason IS NULL) = (raw_value IS NOT NULL)),
    CONSTRAINT ck_research_evidence_fields_observed CHECK (raw_value IS NULL OR observed_at IS NOT NULL),
    CONSTRAINT ck_research_evidence_fields_order CHECK (observed_at IS NULL OR observed_at <= retrieved_at)
);
