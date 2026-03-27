-- 변경 결과가 매도인 경우 SIGNAL_SELL
-- 기존 메시지: "매도으로 변경", 신규 메시지: "매도로 변경" 둘 다 처리
UPDATE stock_notifications SET noti_type = 'SIGNAL_SELL'
WHERE noti_type = 'TRADE_SIGNAL'
  AND (message LIKE '%매도으로%' OR message LIKE '%매도로%');

-- 나머지 TRADE_SIGNAL은 SIGNAL_BUY
UPDATE stock_notifications SET noti_type = 'SIGNAL_BUY'
WHERE noti_type = 'TRADE_SIGNAL';
