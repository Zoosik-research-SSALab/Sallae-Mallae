-- 신규 환경이나 DB 재생성 시에도 애플리케이션 DB 세션 기본 timezone을 KST로 유지한다.
ALTER DATABASE "${flyway:database}" SET timezone TO 'Asia/Seoul';
