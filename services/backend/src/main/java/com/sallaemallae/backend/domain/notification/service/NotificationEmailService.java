package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.global.email.EmailService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEmailService {

  private static final String SUBJECT_PREFIX = "[살래말래] ";

  private final WatchlistRepository watchlistRepository;
  private final EmailService emailService;

  /**
   * 이메일 수신 동의 유저에게 알림 이메일을 비동기 발송한다.
   *
   * <p>NotificationPublishService.publish()에서 호출된다.
   * 이메일 발송 실패는 알림 생성에 영향을 주지 않는다.</p>
   */
  @Async
  public void sendNotificationEmails(Long stockId, NotifyType notiType,
      String title, String message, String relatedLink) {

    List<String> emails = watchlistRepository.findEmailOptInUserEmailsByStockId(stockId);
    if (emails.isEmpty()) {
      return;
    }

    String subject = SUBJECT_PREFIX + title;
    String htmlContent = buildHtmlContent(notiType, title, message, relatedLink);

    for (String email : emails) {
      emailService.sendHtmlEmail(email, subject, htmlContent);
    }

    log.info("알림 이메일 발송: type={}, stockId={}, recipients={}", notiType, stockId, emails.size());
  }

  /**
   * 알림 유형에 따라 HTML 이메일 본문을 생성한다.
   *
   * <p>급등/급락: 빨강/파랑 강조색으로 시각적 구분
   * <br>매매신호: 매수(빨강)/매도(파랑) 구분
   * <br>공시: 공시 바로가기 링크 버튼 포함</p>
   */
  private String buildHtmlContent(NotifyType notiType, String title,
      String message, String relatedLink) {

    String accentColor = getAccentColor(notiType);
    String typeLabel = getTypeLabel(notiType);

    StringBuilder html = new StringBuilder();
    html.append("""
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:%s;padding:24px 32px;">
            <span style="color:#fff;font-size:14px;font-weight:600;">%s</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#333;font-size:20px;">%s</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">%s</p>
        """.formatted(accentColor, typeLabel, title, message));

    if (relatedLink != null && !relatedLink.isBlank()) {
      html.append("""
              <a href="%s" style="display:inline-block;padding:12px 24px;background:%s;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">공시 바로가기</a>
          """.formatted(relatedLink, accentColor));
    }

    html.append("""
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f9f9f9;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              본 메일은 살래말래 알림 수신 동의에 따라 발송되었습니다.<br>
              설정에서 이메일 알림을 끌 수 있습니다.
            </p>
          </td></tr>
        </table>
        </td></tr></table>
        </body></html>
        """);

    return html.toString();
  }

  private String getAccentColor(NotifyType notiType) {
    return switch (notiType) {
      case SURGE, SIGNAL_BUY -> "#E53935";
      case PLUNGE, SIGNAL_SELL -> "#1E88E5";
      case ANNOUNCEMENT -> "#43A047";
    };
  }

  private String getTypeLabel(NotifyType notiType) {
    return switch (notiType) {
      case SURGE -> "급등 알림";
      case PLUNGE -> "급락 알림";
      case SIGNAL_BUY -> "AI 매수 신호";
      case SIGNAL_SELL -> "AI 매도 신호";
      case ANNOUNCEMENT -> "공시 알림";
    };
  }
}
