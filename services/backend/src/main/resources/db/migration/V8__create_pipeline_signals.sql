CREATE TABLE IF NOT EXISTS pipeline_signals (
    id           BIGSERIAL    PRIMARY KEY,
    signal_type  VARCHAR(50)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
