-- 급락 키워드가 title에 있으면 PLUNGE
UPDATE stock_notifications SET noti_type = 'PLUNGE'
WHERE noti_type = 'SURGE_PLUNGE' AND title LIKE '%급락%';

-- 나머지 SURGE_PLUNGE는 SURGE
UPDATE stock_notifications SET noti_type = 'SURGE'
WHERE noti_type = 'SURGE_PLUNGE';

-- 매도 키워드가 message에 있으면 SIGNAL_SELL
UPDATE stock_notifications SET noti_type = 'SIGNAL_SELL'
WHERE noti_type = 'TRADE_SIGNAL' AND message LIKE '%매도%';

-- 나머지 TRADE_SIGNAL은 SIGNAL_BUY
UPDATE stock_notifications SET noti_type = 'SIGNAL_BUY'
WHERE noti_type = 'TRADE_SIGNAL';
