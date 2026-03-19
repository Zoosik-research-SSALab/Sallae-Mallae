ALTER TABLE ai_trading_history
    ADD COLUMN debate_report_id BIGINT;

ALTER TABLE ai_trading_history
    ADD CONSTRAINT fk_ai_trading_history_debate_report
        FOREIGN KEY (debate_report_id) REFERENCES ai_debate_reports(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_trading_history_debate_report_id
    ON ai_trading_history(debate_report_id);
