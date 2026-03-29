package com.sallaemallae.backend.domain.notification.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private JavaMailSender javaMailSender;

  @MockitoBean
  private RateLimitService rateLimitService;

  @BeforeEach
  void setUp() {
    given(rateLimitService.checkIpLimit(anyString(), any()))
        .willReturn(RateLimitResult.allowed(100, 99, 60));
    createTablesIfNeeded();
    clearTables();
    seedData();
  }

  @Test
  void getUnreadCountReturnsUnreadNotificationsWithinRetention() throws Exception {
    mockMvc.perform(get("/api/notifications/unread-count")
            .with(authenticatedUser(1L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.total_count").value("2"));
  }

  @Test
  void getNotificationsSupportsOffsetPagination() throws Exception {
    mockMvc.perform(get("/api/notifications/list")
            .with(authenticatedUser(1L))
            .param("tab", "ALL")
            .param("offset", "1")
            .param("limit", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.notifications.length()").value(1))
        .andExpect(jsonPath("$.data.notifications[0].id").value(12))
        .andExpect(jsonPath("$.data.notifications[0].noti_type").value("SURGE"))
        .andExpect(jsonPath("$.data.notifications[0].stock_name").value("카카오"))
        .andExpect(jsonPath("$.data.notifications[0].stock_id").value(2));
  }

  @Test
  void getNotificationsAcceptsLimitGreaterThanDefaultPageSize() throws Exception {
    mockMvc.perform(get("/api/notifications/list")
            .with(authenticatedUser(1L))
            .param("tab", "ALL")
            .param("offset", "0")
            .param("limit", "10"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.notifications.length()").value(3));
  }

  @Test
  void markAsReadUpdatesReadStatus() throws Exception {
    mockMvc.perform(patch("/api/notifications/{notificationId}", 11L)
            .with(authenticatedUser(1L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.message").value("읽음 처리 완료"));

    Boolean isRead = jdbcTemplate.queryForObject(
        "SELECT is_read FROM user_notifications WHERE id = ?",
        Boolean.class,
        11L
    );

    assertThat(isRead).isTrue();
  }

  @Test
  void markAllAsReadUpdatesOnlyUnreadNotificationsInTab() throws Exception {
    mockMvc.perform(patch("/api/notifications/read-all")
            .with(authenticatedUser(1L))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"tab":"ALL"}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.message").value("전체 읽음 처리 완료"))
        .andExpect(jsonPath("$.data.count").value(2));

    assertThat(readStatus(11L)).isTrue();
    assertThat(readStatus(12L)).isTrue();
    assertThat(readStatus(13L)).isTrue();
    assertThat(readStatus(14L)).isFalse();
  }

  @Test
  void deleteNotificationRemovesOnlyTargetNotification() throws Exception {
    mockMvc.perform(delete("/api/notifications/{notificationId}", 12L)
            .with(authenticatedUser(1L)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.message").value("삭제 완료"));

    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM user_notifications WHERE id = ?",
        Integer.class,
        12L
    );

    assertThat(count).isZero();
  }

  @Test
  void deleteNotificationsDeletesNotificationsInRequestedTab() throws Exception {
    mockMvc.perform(delete("/api/notifications")
            .with(authenticatedUser(1L))
            .param("tab", "SURGE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.message").value("일괄 삭제 완료"))
        .andExpect(jsonPath("$.data.count").value(1));

    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM user_notifications WHERE id = ?",
        Integer.class,
        12L
    );

    assertThat(count).isZero();
    assertThat(readStatus(11L)).isFalse();
  }

  private RequestPostProcessor authenticatedUser(Long userId) {
    return authentication(
        new UsernamePasswordAuthenticationToken(
            userId,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_USER"))
        )
    );
  }

  private Boolean readStatus(Long notificationId) {
    return jdbcTemplate.queryForObject(
        "SELECT is_read FROM user_notifications WHERE id = ?",
        Boolean.class,
        notificationId
    );
  }

  private void createTablesIfNeeded() {
    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stocks (
            id BIGINT PRIMARY KEY,
            ticker VARCHAR(6) NOT NULL,
            name VARCHAR(100) NOT NULL,
            gics_sector VARCHAR(50),
            category VARCHAR(50),
            outstanding_shares BIGINT,
            market_type VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stock_notifications (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            noti_type VARCHAR(30) NOT NULL,
            title VARCHAR(100) NOT NULL,
            message VARCHAR(512),
            related_link VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS user_notifications (
            id BIGINT PRIMARY KEY,
            user_id BIGINT NOT NULL,
            notification_id BIGINT NOT NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);
  }

  private void clearTables() {
    jdbcTemplate.execute("DELETE FROM user_notifications");
    jdbcTemplate.execute("DELETE FROM stock_notifications");
    jdbcTemplate.execute("DELETE FROM stocks");
  }

  private void seedData() {
    OffsetDateTime now = OffsetDateTime.now();

    jdbcTemplate.update(
        """
            INSERT INTO stocks (id, ticker, name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
        1L, "005930", "삼성전자", true, now, now
    );
    jdbcTemplate.update(
        """
            INSERT INTO stocks (id, ticker, name, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
        2L, "035720", "카카오", true, now, now
    );

    jdbcTemplate.update(
        """
            INSERT INTO stock_notifications (id, stock_id, noti_type, title, message, related_link, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        1L, 1L, "SIGNAL_BUY", "삼성전자 매수 신호", "삼성전자 AI 매매신호가 매수으로 변경되었습니다.", "/stocks/005930", now.minusDays(1)
    );
    jdbcTemplate.update(
        """
            INSERT INTO stock_notifications (id, stock_id, noti_type, title, message, related_link, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        2L, 2L, "SURGE", "급등 알림", "카카오가 5% 이상 상승했습니다.", "/stocks/035720", now.minusDays(2)
    );
    jdbcTemplate.update(
        """
            INSERT INTO stock_notifications (id, stock_id, noti_type, title, message, related_link, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        3L, 1L, "ANNOUNCEMENT", "공시 알림", "삼성전자 신규 공시가 등록되었습니다.", "/stocks/005930", now.minusDays(3)
    );
    jdbcTemplate.update(
        """
            INSERT INTO stock_notifications (id, stock_id, noti_type, title, message, related_link, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        4L, 1L, "SIGNAL_SELL", "오래된 알림", "보관 기간이 지난 알림입니다.", "/stocks/005930", now.minusDays(100)
    );

    jdbcTemplate.update(
        """
            INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
        11L, 1L, 1L, false, now.minusDays(1)
    );
    jdbcTemplate.update(
        """
            INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
        12L, 1L, 2L, false, now.minusDays(2)
    );
    jdbcTemplate.update(
        """
            INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
        13L, 1L, 3L, true, now.minusDays(3)
    );
    jdbcTemplate.update(
        """
            INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
        14L, 1L, 4L, false, now.minusDays(100)
    );
    jdbcTemplate.update(
        """
            INSERT INTO user_notifications (id, user_id, notification_id, is_read, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
        15L, 2L, 1L, false, now.minusDays(1)
    );
  }
}
