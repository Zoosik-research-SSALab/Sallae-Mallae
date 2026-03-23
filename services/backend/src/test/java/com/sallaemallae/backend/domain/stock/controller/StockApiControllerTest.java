package com.sallaemallae.backend.domain.stock.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sallaemallae.backend.domain.stock.dto.StockListFilterCountsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse.AnnouncementItem;
import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse.FinancialItem;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Dividend;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Earnings;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse.Valuation;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse.KeywordItem;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse.NewsItem;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.LatestPrice;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.PriceRange52w;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPriceCandleResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
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


@SpringBootTest(properties = {
    "minio.endpoint=http://localhost:9000",
    "minio.presigned-endpoint=http://localhost:9000",
    "minio.access-key=test-access",
    "minio.secret-key=test-secret",
    "minio.bucket=test-bucket",
    "minio.public-url=http://localhost:9000"
})
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
  private com.sallaemallae.backend.domain.stock.service.StockService stockService;

  @MockitoBean
  private com.sallaemallae.backend.domain.stock.service.StockPriceStreamService stockPriceStreamService;

  @MockitoBean
  private com.sallaemallae.backend.domain.stock.service.StockQuoteSseService stockQuoteSseService;

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
            2,
            new StockListFilterCountsResponse(2, 1, 1),
            java.util.List.of(
                new StockListItemResponse(1, 1L, "005930", "Samsung Electronics", "Information Technology", 70300, 2.15f, 7_030_000_000L, 100_000L, null, "BUY", 87, true),
                new StockListItemResponse(2, 2L, "000660", "SK hynix", "Information Technology", 182000, -1.75f, 12_740_000_000L, 70_000L, null, "SELL", 80, false)
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
    given(stockService.getStockBasicInfo(1L))
        .willReturn(new StockBasicInfoResponse(
            1L,
            "005930",
            "Samsung Electronics",
            "KOSPI",
            "Information Technology",
            "Semiconductor",
            OffsetDateTime.parse("2026-03-17T14:14:35+09:00")
        ));
    given(stockService.getStockBasicInfo(999L))
        .willThrow(new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    given(stockService.getStockOverview(1L))
        .willReturn(new StockOverviewResponse(
            1L,
            "005930",
            "Samsung Electronics",
            "KOSPI",
            "Information Technology",
            "Semiconductor",
            new LatestPrice(LocalDate.parse("2026-03-17"), 70300, 2.03f),
            new PriceRange52w(88800, LocalDate.parse("2025-07-11"), 61200, LocalDate.parse("2025-04-09"), -20.83f, 14.87f)
        ));
    given(stockService.getStockIndicators(1L))
        .willReturn(new StockIndicatorsResponse(
            new Valuation(26.1f, 3.5f, 2.7f),
            new Earnings(6563L, 63997L, 10.8f),
            new Dividend("최근 12개월", 4, "3월, 6월, 9월, 12월", 1668, 0.96f)
        ));
    given(stockService.getStockFinancials(1L, "YEARLY"))
        .willReturn(new StockFinancialsResponse(List.of(
            new FinancialItem(2025, null, 302100000000L, 32400000000L)
        )));
    given(stockService.getStockFinancials(1L, "INVALID"))
        .willThrow(new BusinessException(StockErrorCode.STOCK_FINANCIAL_TYPE_INVALID));
    given(stockService.getStockKeywords(1L))
        .willReturn(new StockKeywordsResponse(
            List.of(
                new KeywordItem(1L, "HBM 공급망"),
                new KeywordItem(2L, "반도체 사이클"),
                new KeywordItem(3L, "AI 서버")
            ),
            List.of(
                new NewsItem(101L, "삼성전자, 차세대 HBM 양산 본격화 전망", "한국경제",
                    OffsetDateTime.parse("2026-03-12T14:30:00+09:00"))
            )
        ));
    given(stockService.getStockAnnouncements(1L, 4, 0))
        .willReturn(new StockAnnouncementsResponse(
            12,
            List.of(new AnnouncementItem(1L, "현금ㆍ현물배당결정 (결산배당)", LocalDate.parse("2026-02-15")))
        ));
    given(stockService.getStockAnnouncement(1L, 10L))
        .willReturn(new StockAnnouncementDetailResponse(
            10L,
            "현금ㆍ현물배당결정 (결산배당)",
            LocalDate.parse("2026-02-15"),
            "공시 상세 본문",
            "https://example.com/announcement/10"
        ));
    given(stockService.getStockAnnouncement(1L, 999L))
        .willThrow(new BusinessException(StockErrorCode.STOCK_ANNOUNCEMENT_NOT_FOUND));
    given(stockService.getStockOverview(2L))
        .willReturn(new StockOverviewResponse(
            2L,
            "000660",
            "SK hynix",
            "KOSPI",
            "Information Technology",
            "Semiconductor",
            null,
            null
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
        .andExpect(jsonPath("$.data.stocks[0].trading_value").value(7030000000L))
        .andExpect(jsonPath("$.data.stocks[0].trading_volume").value(100000L))
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
  void getStockOverview_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/overview", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.stock_id").value(1))
        .andExpect(jsonPath("$.data.ticker").value("005930"))
        .andExpect(jsonPath("$.data.market_type").value("KOSPI"))
        .andExpect(jsonPath("$.data.latest_price.trade_date").value("2026-03-17"))
        .andExpect(jsonPath("$.data.latest_price.close_price").value(70300))
        .andExpect(jsonPath("$.data.price_range_52w.high_price").value(88800))
        .andExpect(jsonPath("$.data.price_range_52w.high_date").value("2025-07-11"))
        .andExpect(jsonPath("$.data.price_range_52w.distance_from_high_rate").value(-20.83));
  }

  @Test
  void getStockOverview_returnsNullFieldsWhenPriceDataMissing() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/overview", 2L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.stock_id").value(2))
        .andExpect(jsonPath("$.data.latest_price").isEmpty())
        .andExpect(jsonPath("$.data.price_range_52w").isEmpty());
  }

  @Test
  void getStockIndicators_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/indicators", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.valuation.per").value(26.1))
        .andExpect(jsonPath("$.data.earnings.eps").value(6563))
        .andExpect(jsonPath("$.data.dividend.period_label").value("최근 12개월"))
        .andExpect(jsonPath("$.data.dividend.payment_count").value(4));
  }

  @Test
  void getStockFinancials_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/financials", 1L).param("type", "YEARLY"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.financials[0].year").value(2025))
        .andExpect(jsonPath("$.data.financials[0].revenue").value(302100000000L))
        .andExpect(jsonPath("$.data.financials[0].operating_profit").value(32400000000L));
  }

  @Test
  void getStockFinancials_returnsBadRequestWhenTypeInvalid() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/financials", 1L).param("type", "INVALID"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("STOCK_005"))
        .andExpect(jsonPath("$.error.message").value("실적 조회 타입이 올바르지 않습니다."));
  }

  @Test
  void getStockKeywords_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/keywords", 1L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.keywords[0].id").value(1))
        .andExpect(jsonPath("$.data.keywords[0].name").value("HBM 공급망"))
        .andExpect(jsonPath("$.data.news[0].id").value(101))
        .andExpect(jsonPath("$.data.news[0].publisher").value("한국경제"));
  }

  @Test
  void getStockAnnouncements_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/announcements", 1L)
            .param("limit", "4")
            .param("offset", "0"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.total").value(12))
        .andExpect(jsonPath("$.data.announcements[0].id").value(1))
        .andExpect(jsonPath("$.data.announcements[0].announced_at").value("2026-02-15"));
  }

  @Test
  void getStockAnnouncement_returnsWrappedSnakeCasePayload() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/announcements/{announcementId}", 1L, 10L))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true))
        .andExpect(jsonPath("$.data.id").value(10))
        .andExpect(jsonPath("$.data.title").value("현금ㆍ현물배당결정 (결산배당)"))
        .andExpect(jsonPath("$.data.content").value("공시 상세 본문"));
  }

  @Test
  void getStockAnnouncement_returnsNotFoundWhenAnnouncementMissing() throws Exception {
    mockMvc.perform(get("/api/stocks/{stockId}/announcements/{announcementId}", 1L, 999L))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("STOCK_006"))
        .andExpect(jsonPath("$.error.message").value("공시를 찾을 수 없습니다."));
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
  void streamQuote_isPublicAndStartsAsync() throws Exception {
    given(stockQuoteSseService.streamQuote(anyString(), anyString()))
        .willReturn(new org.springframework.web.servlet.mvc.method.annotation.SseEmitter());
    mockMvc.perform(get("/api/stocks/{ticker}/quote", "005930"))
        .andExpect(status().isOk());
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
  void legacyV1QuoteRoute_requiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/v1/stocks/{ticker}/quote", "005930"))
        .andExpect(status().isUnauthorized());
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
