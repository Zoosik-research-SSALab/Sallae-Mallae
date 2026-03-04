package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.dto.NotificationItemResponse;
import com.sallaemallae.backend.global.dto.CursorPageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NotificationServiceImpl implements NotificationService {

  @Override
  public CursorPageResponse<NotificationItemResponse> getNotifications(Long userId, Long cursor, int size) {
    NotificationItemResponse item = new NotificationItemResponse(
        1001L,
        "TRADE_SIGNAL",
        "매매 신호 알림",
        "알림 도메인 보일러플레이트",
        "/reports/005930",
        false,
        OffsetDateTime.now()
    );
    return new CursorPageResponse<>(List.of(item), new CursorPageResponse.Meta(item.id(), false));
  }
}
