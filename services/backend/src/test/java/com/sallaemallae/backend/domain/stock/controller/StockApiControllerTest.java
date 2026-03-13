package com.sallaemallae.backend.domain.stock.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListFilterCountsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.service.StockPriceStreamService;
import com.sallaemallae.backend.domain.stock.service.StockTopListService;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class StockApiControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private StockPriceStreamService stockPriceStreamService;

  @MockitoBean
  private StockTopListService stockTopListService;

  @MockitoBean
  private JavaMailSender javaMailSender;

  @MockitoBean
  private RateLimitService rateLimitService;

  @BeforeEach
  void setUp() {
    given(rateLimitService.checkIpLimit(anyString(), any()))
        .willReturn(RateLimitResult.allowed(100, 99, 60));
    given(stockTopListService.getTopStocks(any(), any(), any(), any(), any(), any(), any()))
        .willReturn(new StockListResponse(
            new StockListFilterCountsResponse(2, 1, 1),
            java.util.List.of(
                new StockListItemResponse(1, 1L, "005930", "Samsung Electronics", "Information Technology", 70300, 2.15f, "BUY", 87, true),
                new StockListItemResponse(2, 2L, "000660", "SK hynix", "Information Technology", 182000, -1.75f, "SELL", 80, false)
            )
        ));
    createTablesIfNeeded();
    clearTables();
    seedData();
  }

  @Test
  void getTopStocks_returnsSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks").param("limit", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.filter_counts.buy").value(2))
        .andExpect(jsonPath("$.filter_counts.sell").value(1))
        .andExpect(jsonPath("$.filter_counts.hold").value(1))
        .andExpect(jsonPath("$.stocks[0].rank").value(1))
        .andExpect(jsonPath("$.stocks[0].id").value(1))
        .andExpect(jsonPath("$.stocks[0].ticker").value("005930"))
        .andExpect(jsonPath("$.stocks[0].gics_sector").value("Information Technology"))
        .andExpect(jsonPath("$.stocks[0].fluctuation_rate").value(2.15))
        .andExpect(jsonPath("$.stocks[0].is_watchlisted").value(true));
  }

  @Test
  void getStockBasicInfo_returnsSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.ticker").value("005930"))
        .andExpect(jsonPath("$.name").value("Samsung Electronics"))
        .andExpect(jsonPath("$.market_type").value("KOSPI"))
        .andExpect(jsonPath("$.gics_sector").value("Information Technology"))
        .andExpect(jsonPath("$.category").value("Semiconductor"))
        .andExpect(jsonPath("$.base_time").exists());
  }

  @Test
  void getLegacyStockDetail_returnsRealStockData() throws Exception {
    mockMvc.perform(get("/api/v1/stocks/{ticker}", "005930"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(1))
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.name").value("Samsung Electronics"))
        .andExpect(jsonPath("$.data.marketType").value("KOSPI"))
        .andExpect(jsonPath("$.data.gicsSector").value("Information Technology"))
        .andExpect(jsonPath("$.data.category").value("Semiconductor"))
        .andExpect(jsonPath("$.data.baseTime").exists());
  }

  @Test
  void streamStockPrices_opensSseChannel() throws Exception {
    mockMvc.perform(get("/api/stream/stocks/{stockId}/prices", 1L).param("period", "1MIN"))
        .andExpect(request().asyncStarted())
        .andExpect(status().isOk())
        .andExpect(result -> assertThat(result.getResponse().getContentType())
            .contains(MediaType.TEXT_EVENT_STREAM_VALUE));
  }

  @Test
  void getLatestPrices_usesDailyWindowForOneWeek() {
    StockPricesResponse response = stockPriceStreamService.getLatestPrices(1L, "1W");

    assertThat(response.prices()).hasSize(7);
    assertThat(response.prices().getFirst().timestamp())
        .isEqualTo(LocalDate.of(2026, 3, 2).atStartOfDay(ZoneOffset.ofHours(9)).toOffsetDateTime());
    assertThat(response.prices().getLast().timestamp())
        .isEqualTo(LocalDate.of(2026, 3, 8).atStartOfDay(ZoneOffset.ofHours(9)).toOffsetDateTime());
  }

  @Test
  void getLatestPrices_usesMinuteWindowForOneDayPeriod() {
    StockPricesResponse response = stockPriceStreamService.getLatestPrices(1L, "1D");

    assertThat(response.prices()).hasSize(3);
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
  }

  private void clearTables() {
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
