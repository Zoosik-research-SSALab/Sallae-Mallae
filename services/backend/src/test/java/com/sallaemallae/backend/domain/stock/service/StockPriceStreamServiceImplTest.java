package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class StockPriceStreamServiceImplTest {

  @Autowired
  private StockPriceStreamService stockPriceStreamService;

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
  void getLatestPrices_returnsDailyCandlesForDailyType() {
    StockPricesResponse response = stockPriceStreamService.getLatestPrices(1L, "DAILY", null);

    assertThat(response.prices()).hasSize(8);
    assertThat(response.candleType()).isEqualTo("DAILY");
  }

  @Test
  void getLatestPrices_returnsMinuteCandlesForMinuteType() {
    StockPricesResponse response = stockPriceStreamService.getLatestPrices(1L, "MINUTE", null);

    assertThat(response.prices()).hasSize(3);
    assertThat(response.candleType()).isEqualTo("MINUTE");
    assertThat(response.prices().getFirst().timestamp())
        .isEqualTo(OffsetDateTime.parse("2026-03-12T09:00:00+09:00"));
    assertThat(response.prices().getLast().close()).isEqualTo(70300);
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
        CREATE TABLE IF NOT EXISTS stock_prices_minute (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            trade_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            open_price INT,
            high_price INT,
            low_price INT,
            close_price INT NOT NULL,
            volume BIGINT,
            fluctuation_rate REAL,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stock_prices_daily (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            trade_date DATE NOT NULL,
            open_price INT,
            high_price INT,
            low_price INT,
            close_price INT NOT NULL,
            volume BIGINT,
            fluctuation_rate REAL,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stock_prices_weekly (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            trade_week DATE NOT NULL,
            open_price INT,
            high_price INT,
            low_price INT,
            close_price INT NOT NULL,
            volume BIGINT,
            fluctuation_rate REAL,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stock_prices_monthly (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            trade_month DATE NOT NULL,
            open_price INT,
            high_price INT,
            low_price INT,
            close_price INT NOT NULL,
            volume BIGINT,
            fluctuation_rate REAL,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);

    jdbcTemplate.execute("""
        CREATE TABLE IF NOT EXISTS stock_prices_yearly (
            id BIGINT PRIMARY KEY,
            stock_id BIGINT NOT NULL,
            trade_year INT NOT NULL,
            open_price INT,
            high_price INT,
            low_price INT,
            close_price INT NOT NULL,
            volume BIGINT,
            fluctuation_rate REAL,
            created_at TIMESTAMP WITH TIME ZONE
        )
        """);
  }

  private void clearTables() {
    jdbcTemplate.execute("DELETE FROM stock_prices_yearly");
    jdbcTemplate.execute("DELETE FROM stock_prices_monthly");
    jdbcTemplate.execute("DELETE FROM stock_prices_weekly");
    jdbcTemplate.execute("DELETE FROM stock_prices_daily");
    jdbcTemplate.execute("DELETE FROM stock_prices_minute");
    jdbcTemplate.execute("DELETE FROM stocks");
  }

  private void seedData() {
    OffsetDateTime now = OffsetDateTime.parse("2026-03-12T10:30:00+09:00");

    jdbcTemplate.update(
        """
            INSERT INTO stocks (id, ticker, name, gics_sector, category, market_type, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", "KOSPI", true, now.minusDays(1), now
    );

    jdbcTemplate.update(
        """
            INSERT INTO stock_prices_minute (id, stock_id, trade_timestamp, open_price, high_price, low_price, close_price, volume, fluctuation_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        1L, 1L, OffsetDateTime.parse("2026-03-12T09:00:00+09:00"), 70000, 70100, 69900, 70050, 1000L, 0.10f, now
    );
    jdbcTemplate.update(
        """
            INSERT INTO stock_prices_minute (id, stock_id, trade_timestamp, open_price, high_price, low_price, close_price, volume, fluctuation_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        2L, 1L, OffsetDateTime.parse("2026-03-12T09:01:00+09:00"), 70050, 70200, 70000, 70150, 1200L, 0.15f, now
    );
    jdbcTemplate.update(
        """
            INSERT INTO stock_prices_minute (id, stock_id, trade_timestamp, open_price, high_price, low_price, close_price, volume, fluctuation_rate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        3L, 1L, OffsetDateTime.parse("2026-03-12T09:02:00+09:00"), 70150, 70350, 70100, 70300, 1500L, 0.20f, now
    );

    for (int i = 0; i < 8; i++) {
      LocalDate tradeDate = LocalDate.of(2026, 3, 1).plusDays(i);
      jdbcTemplate.update(
          """
              INSERT INTO stock_prices_daily (id, stock_id, trade_date, open_price, high_price, low_price, close_price, volume, fluctuation_rate, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              """,
          100L + i,
          1L,
          tradeDate,
          70000 + i,
          70500 + i,
          69800 + i,
          70200 + i,
          100000L + i,
          0.10f + i,
          now
      );
    }
  }
}
