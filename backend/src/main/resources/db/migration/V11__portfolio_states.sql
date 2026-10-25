-- Append-only Portfolio States (EPIC-002 Task 3, decision D-3). Additive: no existing table is altered.
-- Inverse: DROP TABLE portfolio_state_valuations; DROP TABLE portfolio_state_events; DROP TABLE portfolio_states;
CREATE TABLE portfolio_states (
    id              BIGSERIAL                PRIMARY KEY,
    portfolio_id    BIGINT                   NOT NULL,
    user_id         VARCHAR(64)              NOT NULL,
    version         VARCHAR(80)              NOT NULL,
    as_of           DATE                     NOT NULL,
    base_currency   VARCHAR(3)               NOT NULL,
    exposure_status VARCHAR(16)              NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_portfolio_states_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    CONSTRAINT uk_portfolio_states_version UNIQUE (portfolio_id, version)
);

-- The ledger events a state was derived from. No foreign key to portfolio_transactions: voided events stay
-- referenced (and rows are never physically removed), so a stored state keeps replaying.
CREATE TABLE portfolio_state_events (
    state_id       BIGINT NOT NULL,
    transaction_id BIGINT NOT NULL,
    CONSTRAINT pk_portfolio_state_events PRIMARY KEY (state_id, transaction_id),
    CONSTRAINT fk_portfolio_state_events_state FOREIGN KEY (state_id) REFERENCES portfolio_states(id) ON DELETE CASCADE
);

-- The price observations used per open position; close, date and currency are NULL when none was found.
CREATE TABLE portfolio_state_valuations (
    state_id       BIGINT       NOT NULL,
    symbol         VARCHAR(40)  NOT NULL,
    close          NUMERIC(24, 8),
    price_date     DATE,
    price_currency VARCHAR(10),
    CONSTRAINT pk_portfolio_state_valuations PRIMARY KEY (state_id, symbol),
    CONSTRAINT fk_portfolio_state_valuations_state FOREIGN KEY (state_id) REFERENCES portfolio_states(id) ON DELETE CASCADE
);
