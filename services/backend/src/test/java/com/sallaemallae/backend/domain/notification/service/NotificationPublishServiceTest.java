package com.sallaemallae.backend.domain.notification.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.notification.dto.NotiTargetDto;
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
  @DisplayName("publish 시 이메일 수신 동의 유저에게만 이메일 발송 서비스가 호출된다")
  void publish_triggersEmailNotificationForOptedInUsers() {
    given(watchlistRepository.findNotiTargetsByStockId(1L))
        .willReturn(List.of(
            new NotiTargetDto(100L, "opted-in@test.com", true),
            new NotiTargetDto(200L, "opted-out@test.com", false)
        ));
    given(stockNotificationRepository.save(any(StockNotification.class)))
        .willAnswer(invocation -> invocation.getArgument(0));
    given(notificationQueryRepository.countUnreadNotifications(eq(100L), any()))
        .willReturn(5L);
    given(notificationQueryRepository.countUnreadNotifications(eq(200L), any()))
        .willReturn(3L);

    notificationPublishService.publish(
        1L, NotifyType.SURGE, "삼성전자 급등 알림",
        "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(notificationEmailService).sendNotificationEmails(
        List.of("opted-in@test.com"),
        NotifyType.SURGE, "삼성전자 급등 알림",
        "삼성전자이(가) +5.2% 변동했습니다.", null
    );
  }

  @Test
  @DisplayName("이메일 수신 동의 유저가 없으면 이메일 발송이 호출되지 않는다")
  void publish_skipsEmailWhenNoOptedInUsers() {
    given(watchlistRepository.findNotiTargetsByStockId(1L))
        .willReturn(List.of(
            new NotiTargetDto(100L, "user@test.com", false)
        ));
    given(stockNotificationRepository.save(any(StockNotification.class)))
        .willAnswer(invocation -> invocation.getArgument(0));
    given(notificationQueryRepository.countUnreadNotifications(eq(100L), any()))
        .willReturn(5L);

    notificationPublishService.publish(
        1L, NotifyType.SURGE, "삼성전자 급등 알림",
        "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(notificationEmailService, never()).sendNotificationEmails(
        any(), any(), any(), any(), any()
    );
  }

  @Test
  @DisplayName("AI 매매신호 유형은 이메일 발송을 스킵한다")
  void publish_skipsEmailForSignalTypes() {
    given(watchlistRepository.findNotiTargetsByStockId(1L))
        .willReturn(List.of(
            new NotiTargetDto(100L, "user@test.com", true)
        ));
    given(stockNotificationRepository.save(any(StockNotification.class)))
        .willAnswer(invocation -> invocation.getArgument(0));
    given(notificationQueryRepository.countUnreadNotifications(eq(100L), any()))
        .willReturn(5L);

    notificationPublishService.publish(
        1L, NotifyType.SIGNAL_BUY, "삼성전자 매수 신호",
        "삼성전자 AI 매매신호가 매수로 변경되었습니다.", null
    );

    verify(notificationEmailService, never()).sendNotificationEmails(
        any(), any(), any(), any(), any()
    );
  }
}
