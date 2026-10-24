-- Append-only evidence snapshots (EPIC-001 Task 2). Additive: no existing table is altered.
-- Inverse: DROP TABLE research_evidence_fields; DROP TABLE research_evidence_snapshots;
CREATE TABLE research_evidence_snapshots (
    id            VARCHAR(64)              PRIMARY KEY,
    symbol        VARCHAR(40)              NOT NULL,
    revision      INTEGER                  NOT NULL,
    supersedes_id VARCHAR(64)              REFERENCES research_evidence_snapshots(id),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_research_evidence_symbol_revision UNIQUE (symbol, revision),
    CONSTRAINT uk_research_evidence_supersedes UNIQUE (supersedes_id),
    CONSTRAINT ck_research_evidence_revision CHECK (revision >= 1),
    -- Only the first revision has no predecessor; every later one names the snapshot it supersedes.
    CONSTRAINT ck_research_evidence_lineage CHECK ((revision = 1) = (supersedes_id IS NULL))
);

CREATE TABLE research_evidence_fields (
    id            BIGSERIAL                PRIMARY KEY,
    snapshot_id   VARCHAR(64)              NOT NULL REFERENCES research_evidence_snapshots(id),
    position      INTEGER                  NOT NULL,
    name          VARCHAR(80)              NOT NULL,
    value         TEXT,
    missingness   VARCHAR(20)              NOT NULL,
    source        VARCHAR(80)              NOT NULL,
    observed_at   TIMESTAMP WITH TIME ZONE,
    retrieved_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    period        VARCHAR(40),
    currency      VARCHAR(10),
    normalization VARCHAR(80),
    freshness     VARCHAR(20)              NOT NULL,
    conflicted    BOOLEAN                  NOT NULL,
    CONSTRAINT uk_research_evidence_fields_name UNIQUE (snapshot_id, name),
    CONSTRAINT uk_research_evidence_fields_position UNIQUE (snapshot_id, position),
    -- Mirrors the domain invariant: a value exists exactly when the field is not missing.
    CONSTRAINT ck_research_evidence_fields_value CHECK ((missingness = 'NONE') = (value IS NOT NULL))
);
