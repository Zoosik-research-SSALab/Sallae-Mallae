-- 최종 신호가 매수인 경우 SIGNAL_BUY
-- 기존 메시지: "매수으로 변경되었습니다", 신규 메시지: "매수로 변경되었습니다"
UPDATE stock_notifications SET noti_type = 'SIGNAL_BUY'
WHERE noti_type = 'TRADE_SIGNAL'
  AND (message LIKE '%매수으로 변경%' OR message LIKE '%매수로 변경%');

-- 나머지 TRADE_SIGNAL은 SIGNAL_SELL
UPDATE stock_notifications SET noti_type = 'SIGNAL_SELL'
WHERE noti_type = 'TRADE_SIGNAL';
