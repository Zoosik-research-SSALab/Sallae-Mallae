ALTER TABLE pipeline_signals
    ADD COLUMN retry_count BIGINT NOT NULL DEFAULT 0;
