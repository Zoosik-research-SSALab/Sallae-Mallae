-- stocks 테이블에 종목 아이콘 URL 컬럼 추가
ALTER TABLE stocks ADD COLUMN icon_url VARCHAR(500);

COMMENT ON COLUMN stocks.icon_url IS '종목 아이콘 이미지 URL (MinIO)';
