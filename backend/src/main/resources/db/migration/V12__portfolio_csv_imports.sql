-- CSV import staging (EPIC-002 Task 4, decision D-4). Additive: no existing table is altered.
-- Inverse: DROP TABLE portfolio_csv_import_rows; DROP TABLE portfolio_csv_imports;
CREATE TABLE portfolio_csv_imports (
    id           BIGSERIAL                PRIMARY KEY,
    portfolio_id BIGINT                   NOT NULL,
    user_id      VARCHAR(64)              NOT NULL,
    file_sha256  VARCHAR(64)              NOT NULL,
    status       VARCHAR(16)              NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at  TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_portfolio_csv_imports_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    CONSTRAINT ck_portfolio_csv_imports_status CHECK (status IN ('STAGED', 'ACCEPTED'))
);

CREATE INDEX idx_portfolio_csv_imports_portfolio ON portfolio_csv_imports(portfolio_id, user_id);

-- One row per CSV data row. The parsed values are columns (NULL for an INVALID row); origin_locator is NULL for an
-- INVALID row. transaction_id is the ledger event created on acceptance (it is only cleared if the whole
-- portfolio is deleted, since ledger events are otherwise voided, never deleted).
CREATE TABLE portfolio_csv_import_rows (
    id              BIGSERIAL      PRIMARY KEY,
    batch_id        BIGINT         NOT NULL,
    row_number      INTEGER        NOT NULL,
    raw_line        TEXT           NOT NULL,
    origin_locator  VARCHAR(128),
    status          VARCHAR(16)    NOT NULL,
    message         TEXT,
    trade_date      DATE,
    action          VARCHAR(32),
    symbol          VARCHAR(32),
    asset_type      VARCHAR(32),
    quantity        NUMERIC(24, 8),
    price           NUMERIC(24, 8),
    currency        VARCHAR(3),
    fee             NUMERIC(24, 8),
    fx_rate_to_base NUMERIC(24, 10),
    notes           VARCHAR(1000),
    transaction_id  BIGINT,
    CONSTRAINT fk_portfolio_csv_import_rows_batch FOREIGN KEY (batch_id) REFERENCES portfolio_csv_imports(id) ON DELETE CASCADE,
    CONSTRAINT fk_portfolio_csv_import_rows_transaction FOREIGN KEY (transaction_id) REFERENCES portfolio_transactions(id) ON DELETE SET NULL,
    CONSTRAINT uk_portfolio_csv_import_rows_batch_row UNIQUE (batch_id, row_number),
    CONSTRAINT ck_portfolio_csv_import_rows_status CHECK (status IN ('VALID', 'INVALID', 'DUPLICATE', 'ACCEPTED', 'REJECTED'))
);
