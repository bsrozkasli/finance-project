CREATE TABLE IF NOT EXISTS agent_analysis_history (
    id              BIGSERIAL PRIMARY KEY,
    ticker          VARCHAR(32)  NOT NULL,
    decision        VARCHAR(16)  NOT NULL,
    confidence      INTEGER      NOT NULL,
    analysis_json   TEXT         NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_analysis_history_ticker_created
    ON agent_analysis_history (ticker, created_at DESC);
