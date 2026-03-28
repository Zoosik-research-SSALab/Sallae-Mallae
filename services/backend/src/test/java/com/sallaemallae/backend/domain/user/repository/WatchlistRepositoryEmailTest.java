package com.sallaemallae.backend.domain.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.sallaemallae.backend.domain.notification.dto.NotiTargetDto;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;

@SpringBootTest
@Transactional
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "minio.endpoint=http://localhost:9000",
    "minio.presigned-endpoint=http://localhost:9000",
    "minio.access-key=test",
    "minio.secret-key=test",
    "minio.bucket=test",
    "minio.public-url=http://localhost:9000"
})
class WatchlistRepositoryEmailTest {

  @Autowired
  private WatchlistRepository watchlistRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private JavaMailSender javaMailSender;

  @MockitoBean
  private RateLimitService rateLimitService;

  @BeforeEach
  void setUp() {
    seedData();
  }

  @Test
  @DisplayName("findNotiTargetsByStockId는 알림 ON + ACTIVE 유저 전체를 반환하고 emailOptIn을 구분한다")
  void findNotiTargetsByStockId_returnsAllNotiEnabledWithEmailOptInFlag() {
    List<NotiTargetDto> targets = watchlistRepository.findNotiTargetsByStockId(801L);

    assertThat(targets).hasSize(2); // user1(notiOn+emailOptIn), user2(notiOn+emailOptOut) — user3 notiOff 제외
    assertThat(targets).extracting(NotiTargetDto::userId).containsExactlyInAnyOrder(901L, 902L);

    List<String> emailOptInEmails = targets.stream()
        .filter(NotiTargetDto::emailOptIn)
        .map(NotiTargetDto::email)
        .toList();
    assertThat(emailOptInEmails).containsExactly("opted-in@test.com");
  }

  private void seedData() {
    // 유저 3명: emailOptIn=true/notiEnabled=true, emailOptIn=false/notiEnabled=true, emailOptIn=true/notiEnabled=false
    jdbcTemplate.update("""
        INSERT INTO users (id, email, nickname, is_email_opt_in, is_noti_enabled, status, admin, token_version, created_at, updated_at)
        VALUES (901, 'opted-in@test.com', 'user1', true, true, 'ACTIVE', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """);
    jdbcTemplate.update("""
        INSERT INTO users (id, email, nickname, is_email_opt_in, is_noti_enabled, status, admin, token_version, created_at, updated_at)
        VALUES (902, 'opted-out@test.com', 'user2', false, true, 'ACTIVE', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """);
    jdbcTemplate.update("""
        INSERT INTO users (id, email, nickname, is_email_opt_in, is_noti_enabled, status, admin, token_version, created_at, updated_at)
        VALUES (903, 'noti-off@test.com', 'user3', true, false, 'ACTIVE', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """);

    // 종목
    jdbcTemplate.update("""
        INSERT INTO stocks (id, ticker, name, is_active, created_at, updated_at)
        VALUES (801, '005930', '삼성전자', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """);

    // 관심종목 (모두 알림 ON)
    jdbcTemplate.update("INSERT INTO user_watchlist (user_id, stock_id, is_noti_enabled, created_at) VALUES (901, 801, true, CURRENT_TIMESTAMP)");
    jdbcTemplate.update("INSERT INTO user_watchlist (user_id, stock_id, is_noti_enabled, created_at) VALUES (902, 801, true, CURRENT_TIMESTAMP)");
    jdbcTemplate.update("INSERT INTO user_watchlist (user_id, stock_id, is_noti_enabled, created_at) VALUES (903, 801, true, CURRENT_TIMESTAMP)");
  }
}
