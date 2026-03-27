-- V22: V21 오분류 보정
-- V21에서 최종 신호가 매수인데 SIGNAL_SELL로 잘못 분류된 데이터 수정
UPDATE stock_notifications SET noti_type = 'SIGNAL_BUY'
WHERE noti_type = 'SIGNAL_SELL'
  AND (message LIKE '%매수으로 변경%' OR message LIKE '%매수로 변경%');

-- HOLD/STAY 전환 알림은 더 이상 알림 대상이 아니므로 삭제
-- (과거 TRADE_SIGNAL 시절에 보유/관망 변경도 알림으로 저장됨)
DELETE FROM user_notifications
WHERE notification_id IN (
  SELECT id FROM stock_notifications
  WHERE noti_type IN ('SIGNAL_BUY', 'SIGNAL_SELL')
    AND (message LIKE '%보유으로 변경%' OR message LIKE '%보유로 변경%'
      OR message LIKE '%관망으로 변경%' OR message LIKE '%관망로 변경%')
);

DELETE FROM stock_notifications
WHERE noti_type IN ('SIGNAL_BUY', 'SIGNAL_SELL')
  AND (message LIKE '%보유으로 변경%' OR message LIKE '%보유로 변경%'
    OR message LIKE '%관망으로 변경%' OR message LIKE '%관망로 변경%');
