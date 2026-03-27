-- 급락 키워드가 title에 있으면 PLUNGE
UPDATE stock_notifications SET noti_type = 'PLUNGE'
WHERE noti_type = 'SURGE_PLUNGE' AND title LIKE '%급락%';

-- 나머지 SURGE_PLUNGE는 SURGE
UPDATE stock_notifications SET noti_type = 'SURGE'
WHERE noti_type = 'SURGE_PLUNGE';

-- 변경 결과가 매도인 경우 SIGNAL_SELL (기존 메시지 형식: "매도으로 변경되었습니다")
UPDATE stock_notifications SET noti_type = 'SIGNAL_SELL'
WHERE noti_type = 'TRADE_SIGNAL' AND message LIKE '%매도으로%';

-- 나머지 TRADE_SIGNAL은 SIGNAL_BUY
UPDATE stock_notifications SET noti_type = 'SIGNAL_BUY'
WHERE noti_type = 'TRADE_SIGNAL';
