package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.notification.dto.SignalChangeInfo;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.global.email.EmailService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEmailService {

  private static final String SUBJECT_PREFIX = "[살래말래] ";
  private static final String SITE_URL = "https://j14d208.p.ssafy.io";
  private static final int BATCH_SIZE = 50;
  private static final long BATCH_DELAY_MS = 100;
  private static final int WARN_THRESHOLD = 500;

  private final EmailService emailService;

  @Async
  public void sendNotificationEmails(List<String> emails, NotifyType notiType,
      String title, String message, String relatedLink) {

    if (emails.isEmpty()) {
      return;
    }

    if (emails.size() > WARN_THRESHOLD) {
      log.warn("대량 이메일 발송 감지: recipients={}, type={}", emails.size(), notiType);
    }

    String subject = SUBJECT_PREFIX + title;
    String htmlContent = buildHtmlContent(notiType, title, message, relatedLink);

    sendInBatches(emails, subject, htmlContent, notiType.name());
  }

  @Async
  public void sendSignalDigestEmails(Map<String, List<SignalChangeInfo>> emailToChanges) {
    if (emailToChanges.isEmpty()) {
      return;
    }

    String subject = SUBJECT_PREFIX + "오늘의 AI 매매신호 변동 알림";
    int totalSent = 0;

    for (var entry : emailToChanges.entrySet()) {
      String email = entry.getKey();
      List<SignalChangeInfo> changes = entry.getValue();
      String htmlContent = buildSignalDigestHtml(changes);
      emailService.sendHtmlEmail(email, subject, htmlContent);
      totalSent++;
    }

    log.info("AI 매매신호 일괄 이메일 발송 완료: recipients={}", totalSent);
  }

  private void sendInBatches(List<String> emails, String subject, String htmlContent, String typeLabel) {
    int totalSent = 0;
    for (int i = 0; i < emails.size(); i += BATCH_SIZE) {
      List<String> batch = emails.subList(i, Math.min(i + BATCH_SIZE, emails.size()));

      for (String email : batch) {
        emailService.sendHtmlEmail(email, subject, htmlContent);
        totalSent++;
      }

      if (i + BATCH_SIZE < emails.size()) {
        try {
          Thread.sleep(BATCH_DELAY_MS);
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
          log.warn("이메일 배치 발송 중단: sent={}/{}", totalSent, emails.size());
          return;
        }
      }
    }

    log.info("알림 이메일 발송 완료: type={}, recipients={}", typeLabel, totalSent);
  }

  private String buildHtmlContent(NotifyType notiType, String title,
      String message, String relatedLink) {

    String accentColor = getAccentColor(notiType);
    String typeLabel = getTypeLabel(notiType);
    String safeTitle = HtmlUtils.htmlEscape(title);
    String safeMessage = HtmlUtils.htmlEscape(message);

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
        """.formatted(accentColor, typeLabel, safeTitle, safeMessage));

    if (relatedLink != null && !relatedLink.isBlank()) {
      String safeLink = HtmlUtils.htmlEscape(relatedLink);
      html.append("""
              <a href="%s" style="display:inline-block;padding:12px 24px;background:%s;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">공시 바로가기</a>
          """.formatted(safeLink, accentColor));
    }

    appendSiteLink(html);
    appendFooter(html);

    return html.toString();
  }

  private String buildSignalDigestHtml(List<SignalChangeInfo> changes) {
    StringBuilder html = new StringBuilder();
    html.append("""
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#7B1FA2;padding:24px 32px;">
            <span style="color:#fff;font-size:14px;font-weight:600;">AI 매매신호 알림</span>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 24px;color:#333;font-size:20px;">오늘의 AI 매매신호 변동 종목</h2>
            <table width="100%%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr style="border-bottom:2px solid #eee;">
                <td style="padding:12px 8px;font-weight:600;color:#333;font-size:14px;">종목명</td>
                <td style="padding:12px 8px;font-weight:600;color:#333;font-size:14px;text-align:right;">신호</td>
              </tr>
        """);

    for (SignalChangeInfo change : changes) {
      String safeName = HtmlUtils.htmlEscape(change.stockName());
      html.append("""
              <tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:12px 8px;color:#333;font-size:15px;">%s</td>
                <td style="padding:12px 8px;text-align:right;">
                  <span style="color:%s;font-weight:600;font-size:15px;">%s</span>
                </td>
              </tr>
          """.formatted(safeName, change.signalColor(), change.signalLabel()));
    }

    html.append("</table>");

    appendSiteLink(html);
    appendFooter(html);

    return html.toString();
  }

  private void appendSiteLink(StringBuilder html) {
    html.append("""
            <div style="margin-top:24px;text-align:center;">
              <a href="%s" style="display:inline-block;padding:12px 32px;background:#333;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">살래말래에서 자세히 보기</a>
            </div>
        """.formatted(SITE_URL));
  }

  private void appendFooter(StringBuilder html) {
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
