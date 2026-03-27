-- 급락 키워드가 title에 있으면 PLUNGE
UPDATE stock_notifications SET noti_type = 'PLUNGE'
WHERE noti_type = 'SURGE_PLUNGE' AND title LIKE '%급락%';

-- 나머지 SURGE_PLUNGE는 SURGE
UPDATE stock_notifications SET noti_type = 'SURGE'
WHERE noti_type = 'SURGE_PLUNGE';
