package com.sallaemallae.backend.domain.stock.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sallaemallae.backend.domain.stock.dto.StockListFilterCountsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPriceCandleResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;
import com.sallaemallae.backend.infra.kis.KisApiException;
import java.time.LocalDate;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class StockApiControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @MockitoBean
  private com.sallaemallae.backend.domain.stock.service.StockTopListService stockTopListService;

  @MockitoBean
  private com.sallaemallae.backend.domain.stock.service.StockMarketQueryService stockMarketQueryService;

  @MockitoBean
  private com.sallaemallae.backend.domain.stock.service.StockRealtimeMinuteService stockRealtimeMinuteService;

  @MockitoBean
  private JavaMailSender javaMailSender;

  @MockitoBean
  private RateLimitService rateLimitService;

  @BeforeEach
  void setUp() {
    given(rateLimitService.checkIpLimit(anyString(), any()))
        .willReturn(RateLimitResult.allowed(100, 99, 60));
    given(stockTopListService.getTopStocks(any(), any(), any(), any(), any(), any(), any(), any()))
        .willReturn(new StockListResponse(
            new StockListFilterCountsResponse(2, 1, 1),
            java.util.List.of(
                new StockListItemResponse(1, 1L, "005930", "Samsung Electronics", "Information Technology", 70300, 2.15f, "BUY", 87, true),
                new StockListItemResponse(2, 2L, "000660", "SK hynix", "Information Technology", 182000, -1.75f, "SELL", 80, false)
            )
        ));
    given(stockMarketQueryService.getQuote(anyString(), anyString()))
        .willReturn(new StockQuoteResponse(
            "005930",
            "Samsung Electronics",
            "J",
            70300,
            68900,
            1400,
            2.03f,
            70000,
            70500,
            69800,
            1_000_000L,
            OffsetDateTime.parse("2026-03-17T14:14:35+09:00"),
            true,
            "KIS:QUOTE:J:005930:V1",
            "KIS"
        ));
    given(stockMarketQueryService.getPeriodPrices(anyString(), anyString(), anyString(), anyString(), anyString(), any(Boolean.class)))
        .willReturn(new StockPeriodPriceResponse(
            "005930",
            "Samsung Electronics",
            "J",
            "D",
            "20260310",
            "20260317",
            true,
            70300,
            68900,
            1400,
            2.03f,
            70000,
            70500,
            69800,
            1_000_000L,
            OffsetDateTime.parse("2026-03-17T14:14:35+09:00"),
            List.of(new StockPriceCandleResponse(LocalDate.parse("2026-03-17"), 70000, 70500, 69800, 70300, 1_000_000L, 1400, 2.03f, false)),
            true,
            "KIS:PERIOD:J:005930:D:20260310:20260317:true:V1",
            "KIS"
        ));
    createTablesIfNeeded();
    clearTables();
    seedData();
  }

  @Test
  void getTopStocks_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks").param("limit", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.filter_counts.buy").value(2))
        .andExpect(jsonPath("$.data.filter_counts.sell").value(1))
        .andExpect(jsonPath("$.data.filter_counts.hold").value(1))
        .andExpect(jsonPath("$.data.stocks[0].rank").value(1))
        .andExpect(jsonPath("$.data.stocks[0].id").value(1))
        .andExpect(jsonPath("$.data.stocks[0].ticker").value("005930"))
        .andExpect(jsonPath("$.data.stocks[0].gics_sector").value("Information Technology"))
        .andExpect(jsonPath("$.data.stocks[0].fluctuation_rate").value(2.15))
        .andExpect(jsonPath("$.data.stocks[0].is_watchlisted").value(true));
  }

  @Test
  void getStockBasicInfo_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.id").value(1))
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.name").value("Samsung Electronics"))
        .andExpect(jsonPath("$.data.market_type").value("KOSPI"))
        .andExpect(jsonPath("$.data.gics_sector").value("Information Technology"))
        .andExpect(jsonPath("$.data.category").value("Semiconductor"))
        .andExpect(jsonPath("$.data.base_time").exists());
  }

  @Test
  void getStockBasicInfo_returnsErrorWhenStockMissing() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}", 999L))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("STOCK_001"))
        .andExpect(jsonPath("$.error.message").value("종목을 찾을 수 없습니다."));
  }

  @Test
  void getTopStocks_returnsKisErrorResponseWhenExternalApiFails() throws Exception {
    willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "한국투자증권 시세 요청에 실패했습니다."))
        .given(stockTopListService)
        .getTopStocks(any(), any(), any(), any(), any(), any(), any(), any());

    mockMvc.perform(get("/api/stocks"))
        .andExpect(status().isBadGateway())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("KIS_HTTP_ERROR"))
        .andExpect(jsonPath("$.error.message").value("한국투자증권 시세 요청에 실패했습니다."));
  }

  @Test
  void getQuote_isPublic() throws Exception {
    mockMvc.perform(get("/api/stocks/{ticker}/quote", "005930"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.market").value("J"))
        .andExpect(jsonPath("$.data.currentPrice").value(70300));
  }

  @Test
  void getPeriodPrices_isPublic() throws Exception {
    mockMvc.perform(get("/api/stocks/{ticker}/period-prices", "005930")
            .param("market", "J")
            .param("period", "D")
            .param("startDate", "20260310")
            .param("endDate", "20260317")
            .param("adjusted", "true"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.period").value("D"))
        .andExpect(jsonPath("$.data.candles[0].tradeDate").value("2026-03-17"));
  }

  @Test
  void getStockBasicInfo_isPublic() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.id").value(1))
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.name").value("Samsung Electronics"))
        .andExpect(jsonPath("$.data.market_type").value("KOSPI"))
        .andExpect(jsonPath("$.data.gics_sector").value("Information Technology"))
        .andExpect(jsonPath("$.data.category").value("Semiconductor"))
        .andExpect(jsonPath("$.data.base_time").exists());
  }

  @Test
  void legacyV1QuoteRoute_isNotMapped() throws Exception {
    mockMvc.perform(get("/api/v1/stocks/{ticker}/quote", "005930"))
        .andExpect(status().isNotFound());
  }

  @Test
  void streamStockPrices_opensSseChannel() throws Exception {
    mockMvc.perform(get("/api/stream/stocks/{stockId}/prices", 1L).param("period", "1MIN"))
        .andExpect(request().asyncStarted())
        .andExpect(status().isOk())
        .andExpect(result -> assertThat(result.getResponse().getContentType())
            .contains(MediaType.TEXT_EVENT_STREAM_VALUE));
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
  }
}
