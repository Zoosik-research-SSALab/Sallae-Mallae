-- ============================================================
-- V4: device_sessions 테이블 생성
-- ============================================================
--
-- 목적: 사용자별 로그인된 기기(세션) 상태를 관리합니다.
--
-- login_history와의 관계:
--   login_history는 "이벤트 로그"(append-only)로, 모든 로그인 시도를
--   시간순으로 기록하며 감사/보안 추적에 사용됩니다.
--   device_sessions는 "활성 세션 상태"(upsert)로, 현재 로그인된 기기 목록을
--   관리하며 세션 조회/원격 로그아웃/기기 수 제한에 사용됩니다.
--
--   같은 기기로 10번 로그인하면:
--     login_history → 10행 (매 시도마다 새 행이 추가됩니다)
--     device_sessions → 1행 (ip_address, last_login_at만 갱신됩니다)
--
--   ip_address, device_info 컬럼이 양쪽 테이블에 모두 존재하는 이유:
--     login_history의 값은 "그 시점의 스냅샷"입니다 (과거 기록)
--     device_sessions의 값은 "가장 최근 로그인 시점의 값"입니다 (현재 상태)
--
-- trust_level:
--   기기 신뢰도를 나타내며, 로그인 횟수 기반으로 자동 승급됩니다.
--     NEW        → 첫 로그인 (1회)
--     RECOGNIZED → 2회 이상 로그인
--     TRUSTED    → 5회 이상 로그인
--   향후 Step-up 인증에서 "새 기기이면 추가 인증 요구" 같은
--   판단 기준으로 사용될 예정입니다.
-- ============================================================

CREATE TABLE device_sessions (
    id            BIGSERIAL       PRIMARY KEY,
    user_id       BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id     VARCHAR(255)    NOT NULL,
    device_name   VARCHAR(255)    NOT NULL DEFAULT 'Unknown',
    device_info   VARCHAR(512),
    ip_address    VARCHAR(45),
    trust_level   VARCHAR(20)     NOT NULL DEFAULT 'NEW',
    login_count   INT             NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_device_sessions_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id);
