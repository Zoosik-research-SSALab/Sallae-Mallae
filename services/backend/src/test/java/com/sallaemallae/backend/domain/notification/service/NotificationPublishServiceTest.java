package com.sallaemallae.backend.domain.notification.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.notification.entity.StockNotification;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.repository.NotificationQueryRepository;
import com.sallaemallae.backend.domain.notification.repository.StockNotificationRepository;
import com.sallaemallae.backend.domain.notification.repository.UserNotificationRepository;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationPublishServiceTest {

  @Mock
  private StockNotificationRepository stockNotificationRepository;
  @Mock
  private UserNotificationRepository userNotificationRepository;
  @Mock
  private WatchlistRepository watchlistRepository;
  @Mock
  private NotificationQueryRepository notificationQueryRepository;
  @Mock
  private NotificationSseService notificationSseService;
  @Mock
  private NotificationEmailService notificationEmailService;

  @InjectMocks
  private NotificationPublishService notificationPublishService;

  @Test
  @DisplayName("publish 시 이메일 발송 서비스가 호출된다")
  void publish_triggersEmailNotification() {
    given(watchlistRepository.findNotiEnabledUserIdsByStockId(1L))
        .willReturn(List.of(100L));
    given(stockNotificationRepository.save(any(StockNotification.class)))
        .willAnswer(invocation -> invocation.getArgument(0));
    given(notificationQueryRepository.countUnreadNotifications(eq(100L), any()))
        .willReturn(5L);

    notificationPublishService.publish(
        1L, NotifyType.SURGE, "삼성전자 급등 알림",
        "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(notificationEmailService).sendNotificationEmails(
        1L, NotifyType.SURGE, "삼성전자 급등 알림",
        "삼성전자이(가) +5.2% 변동했습니다.", null
    );
  }
}
