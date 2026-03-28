package com.sallaemallae.backend.global.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

  private final JavaMailSender mailSender;

  @Value("${spring.mail.username}")
  private String senderEmail;
  private static final String VERIFICATION_SUBJECT = "[살래말래] 이메일 인증코드";
  private static final String PASSWORD_RESET_SUBJECT = "[살래말래] 비밀번호 재설정 인증코드";

  @Override
  @Async
  public void sendVerificationCode(String to, String code) {
    String content = buildVerificationCodeContent(code);
    sendEmail(to, VERIFICATION_SUBJECT, content);
    log.info("Verification code email sent to: {}", maskEmail(to));
  }

  @Override
  @Async
  public void sendPasswordResetCode(String to, String code) {
    String content = buildPasswordResetContent(code);
    sendEmail(to, PASSWORD_RESET_SUBJECT, content);
    log.info("Password reset code email sent to: {}", maskEmail(to));
  }

  private void sendEmail(String to, String subject, String content) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setFrom(senderEmail);
      message.setTo(to);
      message.setSubject(subject);
      message.setText(content);
      mailSender.send(message);
    } catch (Exception e) {
      log.error("Failed to send email to {}: {}", maskEmail(to), e.getMessage());
      // @Async 메서드에서 예외를 던져도 호출자가 받을 수 없으므로 로깅만 처리
    }
  }

  @Override
  public void sendHtmlEmail(String to, String subject, String htmlContent) {
    try {
      MimeMessage mimeMessage = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
      helper.setFrom(senderEmail);
      helper.setTo(to);
      helper.setSubject(subject);
      helper.setText(htmlContent, true); // true = HTML
      mailSender.send(mimeMessage);
      log.info("HTML email sent to: {}", maskEmail(to));
    } catch (Exception e) {
      log.error("Failed to send HTML email to {}: {}", maskEmail(to), e.getMessage());
    }
  }

  private String buildVerificationCodeContent(String code) {
    return String.format("""
        안녕하세요, 살래말래입니다.

        회원가입을 위한 인증코드입니다.

        인증코드: %s

        인증코드는 5분간 유효합니다.
        본인이 요청하지 않으셨다면 이 메일을 무시해주세요.

        감사합니다.
        살래말래 드림
        """, code);
  }

  private String buildPasswordResetContent(String code) {
    return String.format("""
        안녕하세요, 살래말래입니다.

        비밀번호 재설정을 위한 인증코드입니다.

        인증코드: %s

        인증코드는 5분간 유효합니다.
        본인이 요청하지 않으셨다면 이 메일을 무시해주세요.

        감사합니다.
        살래말래 드림
        """, code);
  }

  private String maskEmail(String email) {
    if (email == null || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String localPart = parts[0];
    String domain = parts[1];
    if (localPart.length() <= 2) {
      return "**@" + domain;
    }
    return localPart.substring(0, 2) + "***@" + domain;
  }
}
