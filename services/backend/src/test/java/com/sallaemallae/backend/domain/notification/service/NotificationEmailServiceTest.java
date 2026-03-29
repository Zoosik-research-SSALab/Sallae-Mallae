package com.sallaemallae.backend.domain.notification.service;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.notification.dto.SignalChangeInfo;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.global.email.EmailService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationEmailServiceTest {

  @Mock
  private EmailService emailService;

  @InjectMocks
  private NotificationEmailService notificationEmailService;

  @Test
  @DisplayName("이메일 수신 대상이 있으면 각 대상에게 HTML 이메일을 발송한다")
  void sendNotificationEmails_sendsToOptedInUsers() {
    notificationEmailService.sendNotificationEmails(
        List.of("user1@test.com", "user2@test.com"),
        NotifyType.SURGE, "삼성전자 급등 알림", "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(emailService).sendHtmlEmail(eq("user1@test.com"), anyString(), anyString());
    verify(emailService).sendHtmlEmail(eq("user2@test.com"), anyString(), anyString());
  }

  @Test
  @DisplayName("이메일 수신 대상이 없으면 이메일을 발송하지 않는다")
  void sendNotificationEmails_skipsWhenNoRecipients() {
    notificationEmailService.sendNotificationEmails(
        List.of(),
        NotifyType.SURGE, "삼성전자 급등 알림", "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("공시 알림이면 이메일 본문에 relatedLink가 포함된다")
  void sendNotificationEmails_includesLinkForAnnouncement() {
    notificationEmailService.sendNotificationEmails(
        List.of("user@test.com"),
        NotifyType.ANNOUNCEMENT, "삼성전자 새 공시",
        "[삼성전자] 분기보고서", "https://dart.fss.or.kr/example"
    );

    verify(emailService).sendHtmlEmail(
        eq("user@test.com"), anyString(), contains("https://dart.fss.or.kr/example")
    );
  }

  @Test
  @DisplayName("개별 이메일 본문에 사이트 URL이 포함된다")
  void sendNotificationEmails_includesSiteUrl() {
    notificationEmailService.sendNotificationEmails(
        List.of("user@test.com"),
        NotifyType.SURGE, "삼성전자 급등 알림", "삼성전자이(가) +5.2% 변동했습니다.", null
    );

    verify(emailService).sendHtmlEmail(
        eq("user@test.com"), anyString(), contains("https://j14d208.p.ssafy.io")
    );
  }

  @Test
  @DisplayName("AI 매매신호 일괄 이메일: 유저별로 1통 발송")
  void sendSignalDigestEmails_sendsOneEmailPerUser() {
    List<SignalChangeInfo> changes = List.of(
        new SignalChangeInfo(1L, "삼성전자", NotifyType.SIGNAL_BUY),
        new SignalChangeInfo(2L, "SK하이닉스", NotifyType.SIGNAL_SELL)
    );
    Map<String, List<SignalChangeInfo>> emailToChanges = Map.of(
        "user1@test.com", changes,
        "user2@test.com", List.of(changes.get(0))
    );

    notificationEmailService.sendSignalDigestEmails(emailToChanges);

    verify(emailService, times(2)).sendHtmlEmail(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("AI 매매신호 일괄 이메일 본문에 종목명과 신호가 포함된다")
  void sendSignalDigestEmails_containsStockAndSignal() {
    List<SignalChangeInfo> changes = List.of(
        new SignalChangeInfo(1L, "삼성전자", NotifyType.SIGNAL_BUY),
        new SignalChangeInfo(2L, "SK하이닉스", NotifyType.SIGNAL_SELL)
    );
    Map<String, List<SignalChangeInfo>> emailToChanges = Map.of(
        "user@test.com", changes
    );

    notificationEmailService.sendSignalDigestEmails(emailToChanges);

    ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService).sendHtmlEmail(eq("user@test.com"), anyString(), htmlCaptor.capture());

    String html = htmlCaptor.getValue();
    assert html.contains("삼성전자");
    assert html.contains("SK하이닉스");
    assert html.contains("매수");
    assert html.contains("매도");
    assert html.contains("https://j14d208.p.ssafy.io");
  }

  @Test
  @DisplayName("AI 매매신호 일괄 이메일 대상이 비어있으면 발송하지 않는다")
  void sendSignalDigestEmails_skipsWhenEmpty() {
    notificationEmailService.sendSignalDigestEmails(Map.of());

    verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
  }
}
