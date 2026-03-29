-- 재무 데이터 적재 스크립트 재실행 시 동일 종목/분기 데이터 중복 삽입 방지
-- UNIQUE 제약이 있어야 upsert(ON CONFLICT ... DO UPDATE)가 정상 동작함
ALTER TABLE stock_financials
    ADD CONSTRAINT stock_financials_unique UNIQUE (stock_id, report_year, report_quarter);
