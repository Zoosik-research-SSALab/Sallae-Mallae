package com.sallaemallae.backend.global.email;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

  @Mock
  private JavaMailSender mailSender;

  @InjectMocks
  private EmailServiceImpl emailService;

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(emailService, "senderEmail", "test@sallaemallae.com");
  }

  @Test
  @DisplayName("sendHtmlEmail은 MimeMessage로 HTML 본문을 전송한다")
  void sendHtmlEmail_sendsMimeMessage() {
    MimeMessage mimeMessage = new MimeMessage((jakarta.mail.Session) null);
    given(mailSender.createMimeMessage()).willReturn(mimeMessage);

    emailService.sendHtmlEmail("test@example.com", "[살래말래] 테스트", "<h1>테스트</h1>");

    verify(mailSender).send(any(MimeMessage.class));
  }
}
