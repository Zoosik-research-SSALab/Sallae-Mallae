package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.entity.StockNotification;
import com.sallaemallae.backend.domain.notification.entity.UserNotification;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.repository.NotificationQueryRepository;
import com.sallaemallae.backend.domain.notification.repository.StockNotificationRepository;
import com.sallaemallae.backend.domain.notification.repository.UserNotificationRepository;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPublishService {

  private static final int RETENTION_DAYS = 30;
  private static final int MAX_UNREAD_BADGE_COUNT = 99;

  private final StockNotificationRepository stockNotificationRepository;
  private final UserNotificationRepository userNotificationRepository;
  private final WatchlistRepository watchlistRepository;
  private final NotificationQueryRepository notificationQueryRepository;
  private final NotificationSseService notificationSseService;

  /**
   * 알림을 생성하고 해당 종목의 관심종목 유저에게 배포한다.
   *
   * @return 알림을 받은 유저 수
   */
  @Transactional
  public int publish(Long stockId, NotifyType notiType,
      String title, String message, String relatedLink) {

    List<Long> userIds = watchlistRepository.findNotiEnabledUserIdsByStockId(stockId);
    if (userIds.isEmpty()) {
      return 0;
    }

    StockNotification stockNoti = StockNotification.create(
        stockId, notiType, title, message, relatedLink
    );
    stockNotificationRepository.save(stockNoti);

    List<UserNotification> userNotis = userIds.stream()
        .map(userId -> UserNotification.create(userId, stockNoti.getId()))
        .toList();
    userNotificationRepository.saveAll(userNotis);

    // SSE 실시간 푸시 (유저별 읽지 않은 알림 수 포함)
    OffsetDateTime cutoff = OffsetDateTime.now().minusDays(RETENTION_DAYS);
    String createdAt = stockNoti.getCreatedAt().toString();
    for (Long userId : userIds) {
      long unread = notificationQueryRepository.countUnreadNotifications(userId, cutoff);
      String unreadCount = unread > MAX_UNREAD_BADGE_COUNT ? "99+" : String.valueOf(unread);
      notificationSseService.pushToUser(userId, notiType.getResponseValue(), title, message, unreadCount, createdAt);
    }

    log.info("알림 발행: type={}, stockId={}, users={}", notiType, stockId, userIds.size());
    return userIds.size();
  }
}
