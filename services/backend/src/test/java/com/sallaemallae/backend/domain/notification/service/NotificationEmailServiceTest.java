package com.sallaemallae.backend.domain.notification.service;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.email.EmailService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationEmailServiceTest {

  @Mock
  private WatchlistRepository watchlistRepository;

  @Mock
  private EmailService emailService;

  @InjectMocks
  private NotificationEmailService notificationEmailService;

  @Test
  @DisplayName("이메일 수신 대상이 있으면 각 대상에게 HTML 이메일을 발송한다")
  void sendNotificationEmails_sendsToOptedInUsers() {
    given(watchlistRepository.findEmailOptInUserEmailsByStockId(1L))
        .willReturn(List.of("user1@test.com", "user2@test.com"));

    notificationEmailService.sendNotificationEmails(
        1L, NotifyType.SURGE, "삼성전자 급등 알림", "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(emailService).sendHtmlEmail(eq("user1@test.com"), anyString(), anyString());
    verify(emailService).sendHtmlEmail(eq("user2@test.com"), anyString(), anyString());
  }

  @Test
  @DisplayName("이메일 수신 대상이 없으면 이메일을 발송하지 않는다")
  void sendNotificationEmails_skipsWhenNoRecipients() {
    given(watchlistRepository.findEmailOptInUserEmailsByStockId(1L))
        .willReturn(List.of());

    notificationEmailService.sendNotificationEmails(
        1L, NotifyType.SURGE, "삼성전자 급등 알림", "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("공시 알림이면 이메일 본문에 relatedLink가 포함된다")
  void sendNotificationEmails_includesLinkForAnnouncement() {
    given(watchlistRepository.findEmailOptInUserEmailsByStockId(1L))
        .willReturn(List.of("user@test.com"));

    notificationEmailService.sendNotificationEmails(
        1L, NotifyType.ANNOUNCEMENT, "삼성전자 새 공시",
        "[삼성전자] 분기보고서", "https://dart.fss.or.kr/example"
    );

    verify(emailService).sendHtmlEmail(
        eq("user@test.com"),
        anyString(),
        contains("https://dart.fss.or.kr/example")
    );
  }
}
