package com.sallaemallae.backend.domain.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import com.sallaemallae.backend.domain.report.enumtype.AiSignal;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolioHolding;
import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import com.sallaemallae.backend.domain.signal.enumtype.TradeType;
import com.sallaemallae.backend.domain.report.repository.AiDebateReportRepository;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioHoldingRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioRepository;
import com.sallaemallae.backend.domain.signal.repository.AiTradingHistoryRepository;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  @Mock
  private AiDebateReportRepository aiDebateReportRepository;

  @Mock
  private AiPortfolioRepository aiPortfolioRepository;

  @Mock
  private AiPortfolioHoldingRepository aiPortfolioHoldingRepository;

  @Mock
  private AiTradingHistoryRepository aiTradingHistoryRepository;

  @Mock
  private StockPriceDailyRepository stockPriceDailyRepository;

  @Mock
  private StockRepository stockRepository;

  @InjectMocks
  private ReportServiceImpl reportService;

  @Test
  @DisplayName("performance chart는 2025-01-01 이후 데이터만 반환한다")
  void getPerformance_filtersChartFrom2025() throws Exception {
    given(stockRepository.existsByIdAndIsActiveTrue(1L)).willReturn(true);

    AiPortfolio portfolio = org.mockito.Mockito.mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(10L);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(10L, 1L)).willReturn(Optional.empty());
    given(aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(10L, 1L)).willReturn(List.of());
    given(stockPriceDailyRepository.findByStockIdOrderByTradeDateAsc(1L)).willReturn(List.of(
        stockPriceDaily(LocalDate.of(2024, 12, 31), 10000),
        stockPriceDaily(LocalDate.of(2025, 1, 1), 11000),
        stockPriceDaily(LocalDate.of(2025, 1, 2), 12000)
    ));

    PerformanceResponse response = reportService.getPerformance(1L);

    assertThat(response.chart()).extracting(PerformanceResponse.ChartPoint::date)
        .containsExactly(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 2));
  }

  @Test
  @DisplayName("performance는 누적 수익률과 최근 1년 평균 수익률을 계산해 반환한다")
  void getPerformance_returnsCumulativeAndAverageReturn1y() {
    given(stockRepository.existsByIdAndIsActiveTrue(1L)).willReturn(true);

    AiPortfolio portfolio = org.mockito.Mockito.mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(10L);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));

    AiPortfolioHolding holding = org.mockito.Mockito.mock(AiPortfolioHolding.class);
    given(holding.getInvestmentAmount()).willReturn(1_000_000L);
    given(holding.getEvaluationProfit()).willReturn(80_000L);
    given(holding.getReturnRate()).willReturn(8.0f);
    given(holding.getBuyDate()).willReturn(OffsetDateTime.now().minusDays(20));
    given(holding.getAvgBuyPrice()).willReturn(50_000);
    given(holding.getCurrentPrice()).willReturn(54_000);
    given(holding.getHoldingQuantity()).willReturn(10L);
    given(aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(10L, 1L)).willReturn(Optional.of(holding));

    AiTradingHistory recentSell = org.mockito.Mockito.mock(AiTradingHistory.class);
    given(recentSell.getTradeType()).willReturn(TradeType.SELL);
    given(recentSell.getRealizedProfit()).willReturn(120_000L);
    given(recentSell.getReturnRate()).willReturn(12.0f);
    given(recentSell.getTradeTime()).willReturn(OffsetDateTime.now().minusMonths(2));

    AiTradingHistory recentBuy = org.mockito.Mockito.mock(AiTradingHistory.class);
    given(recentBuy.getTradeType()).willReturn(TradeType.BUY);
    given(recentBuy.getTradeAmount()).willReturn(1_000_000L);
    given(recentBuy.getTradeTime()).willReturn(OffsetDateTime.now().minusMonths(3));

    AiTradingHistory oldSell = org.mockito.Mockito.mock(AiTradingHistory.class);
    given(oldSell.getTradeType()).willReturn(TradeType.SELL);
    given(oldSell.getRealizedProfit()).willReturn(50_000L);
    given(oldSell.getReturnRate()).willReturn(20.0f);
    given(oldSell.getTradeTime()).willReturn(OffsetDateTime.now().minusYears(2));

    given(aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(10L, 1L))
        .willReturn(List.of(recentSell, recentBuy, oldSell));
    given(stockPriceDailyRepository.findByStockIdOrderByTradeDateAsc(1L)).willReturn(List.of());

    PerformanceResponse response = reportService.getPerformance(1L);

    assertThat(response.cumulativeReturn()).isEqualTo(25.0f);
    assertThat(response.averageReturn1y()).isEqualTo(12.0f);
  }

  @Test
  @DisplayName("report history는 object 형태의 final_stances와 debate_full_log도 파싱한다")
  void getReportHistory_parsesObjectStructuredDebateData() throws Exception {
    given(stockRepository.existsByIdAndIsActiveTrue(1L)).willReturn(true);
    given(aiDebateReportRepository.findByStockIdOrderByReportDateDescCreatedAtDesc(1L, 0, 30))
        .willReturn(List.of(aiDebateReport()));

    List<ReportHistoryItemResponse> response = reportService.getReportHistory(1L, 0, 30);

    assertThat(response).hasSize(1);
    ReportHistoryItemResponse item = response.getFirst();
    assertThat(item.chairman().finalStances())
        .extracting(finalStance -> finalStance.agentId() + ":" + finalStance.stance())
        .containsExactlyInAnyOrder("fundamental:BUY", "chart:HOLD");
    assertThat(item.debate().rounds()).hasSize(1);
    assertThat(item.debate().rounds().getFirst().agents())
        .extracting(agent -> agent.name() + ":" + agent.summary())
        .anySatisfy(value -> {
          assertThat(value).contains("펀더멘탈 위원");
          assertThat(value).contains("실적 개선이 확인됩니다.");
        });
  }

  @Test
  @DisplayName("존재하지 않는 stockId로 report history 조회 시 404를 반환한다")
  void getReportHistory_throwsWhenStockMissing() {
    given(stockRepository.existsByIdAndIsActiveTrue(999L)).willReturn(false);

    assertThatThrownBy(() -> reportService.getReportHistory(999L, 0, 30))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(StockErrorCode.STOCK_NOT_FOUND));
  }

  @Test
  @DisplayName("존재하지 않는 stockId로 performance 조회 시 404를 반환한다")
  void getPerformance_throwsWhenStockMissing() {
    given(stockRepository.existsByIdAndIsActiveTrue(999L)).willReturn(false);

    assertThatThrownBy(() -> reportService.getPerformance(999L))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(StockErrorCode.STOCK_NOT_FOUND));
  }

  @Test
  @DisplayName("존재하지 않는 stockId로 trades 조회 시 404를 반환한다")
  void getPerformanceTrades_throwsWhenStockMissing() {
    given(stockRepository.existsByIdAndIsActiveTrue(999L)).willReturn(false);

    assertThatThrownBy(() -> reportService.getPerformanceTrades(999L, 0, 30))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(StockErrorCode.STOCK_NOT_FOUND));
  }

  @Test
  @DisplayName("trades 조회는 raw 이벤트와 cycle 요약을 함께 반환한다")
  void getPerformanceTrades_returnsRawTradesAndTradeCycles() {
    given(stockRepository.existsByIdAndIsActiveTrue(1L)).willReturn(true);

    AiPortfolio portfolio = org.mockito.Mockito.mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(10L);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));

    AiPortfolioHolding holding = org.mockito.Mockito.mock(AiPortfolioHolding.class);
    given(holding.getAvgBuyPrice()).willReturn(3925);
    given(holding.getCurrentPrice()).willReturn(4185);
    given(holding.getHoldingQuantity()).willReturn(30L);
    given(holding.getReturnRate()).willReturn(6.62f);
    given(aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(10L, 1L)).willReturn(Optional.of(holding));

    AiTradingHistory openPartialSell = mockTrade(106L, TradeType.SELL,
        OffsetDateTime.of(2026, 2, 20, 6, 30, 0, 0, ZoneOffset.UTC),
        4100, 10L, 41_000L, 1_750L, 30L, null, 4.43f);
    AiTradingHistory openBuySecond = mockTrade(105L, TradeType.BUY,
        OffsetDateTime.of(2026, 2, 10, 6, 30, 0, 0, ZoneOffset.UTC),
        3950, 20L, 79_000L, 0L, 40L, 3925, null);
    AiTradingHistory openBuyFirst = mockTrade(104L, TradeType.BUY,
        OffsetDateTime.of(2026, 2, 5, 6, 30, 0, 0, ZoneOffset.UTC),
        3900, 20L, 78_000L, 0L, 20L, 3900, null);

    AiTradingHistory soldSecondSell = mockTrade(103L, TradeType.SELL,
        OffsetDateTime.of(2025, 9, 25, 6, 30, 0, 0, ZoneOffset.UTC),
        2900, 50L, 145_000L, -10_000L, 0L, null, -6.451613f);
    AiTradingHistory soldFirstSell = mockTrade(102L, TradeType.SELL,
        OffsetDateTime.of(2025, 9, 24, 6, 30, 0, 0, ZoneOffset.UTC),
        2858, 50L, 142_900L, -12_100L, 50L, null, -7.806452f);
    AiTradingHistory soldBuy = mockTrade(101L, TradeType.BUY,
        OffsetDateTime.of(2025, 9, 17, 6, 30, 0, 0, ZoneOffset.UTC),
        3100, 100L, 310_000L, 0L, 100L, 3100, null);

    List<AiTradingHistory> descendingTrades = List.of(
        openPartialSell,
        openBuySecond,
        openBuyFirst,
        soldSecondSell,
        soldFirstSell,
        soldBuy
    );

    given(aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(10L, 1L, 0, 10))
        .willReturn(descendingTrades);
    given(aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(10L, 1L))
        .willReturn(descendingTrades);

    PerformanceTradesResponse response = reportService.getPerformanceTrades(1L, 0, 10);

    assertThat(response.trades()).hasSize(6);
    assertThat(response.tradeCycles()).hasSize(2);

    PerformanceTradesResponse.TradeCycleItem openCycle = response.tradeCycles().get(0);
    assertThat(openCycle.status()).isEqualTo("holding");
    assertThat(openCycle.buyDate()).isEqualTo(OffsetDateTime.of(2026, 2, 5, 6, 30, 0, 0, ZoneOffset.UTC));
    assertThat(openCycle.sellDate()).isNull();
    assertThat(openCycle.buyPrice()).isEqualTo(3925);
    assertThat(openCycle.currentPrice()).isEqualTo(4185);
    assertThat(openCycle.returnRate()).isEqualTo(6.62f);
    assertThat(openCycle.buyCount()).isEqualTo(2);
    assertThat(openCycle.sellCount()).isEqualTo(1);
    assertThat(openCycle.remainingQuantity()).isEqualTo(30L);
    assertThat(openCycle.hasPartialSell()).isTrue();
    assertThat(openCycle.holdingDays()).isEqualTo(
        Math.toIntExact(ChronoUnit.DAYS.between(LocalDate.of(2026, 2, 5), LocalDate.now()))
    );

    PerformanceTradesResponse.TradeCycleItem soldCycle = response.tradeCycles().get(1);
    assertThat(soldCycle.status()).isEqualTo("sold");
    assertThat(soldCycle.buyDate()).isEqualTo(OffsetDateTime.of(2025, 9, 17, 6, 30, 0, 0, ZoneOffset.UTC));
    assertThat(soldCycle.sellDate()).isEqualTo(OffsetDateTime.of(2025, 9, 25, 6, 30, 0, 0, ZoneOffset.UTC));
    assertThat(soldCycle.buyPrice()).isEqualTo(3100);
    assertThat(soldCycle.sellPrice()).isEqualTo(2879);
    assertThat(soldCycle.currentPrice()).isNull();
    assertThat(soldCycle.holdingDays()).isEqualTo(8);
    assertThat(soldCycle.returnRate()).isCloseTo(-7.129f, org.assertj.core.data.Offset.offset(0.001f));
    assertThat(soldCycle.buyCount()).isEqualTo(1);
    assertThat(soldCycle.sellCount()).isEqualTo(2);
    assertThat(soldCycle.remainingQuantity()).isEqualTo(0L);
    assertThat(soldCycle.hasPartialSell()).isTrue();
  }

  private StockPriceDaily stockPriceDaily(LocalDate tradeDate, Integer closePrice) throws Exception {
    return StockPriceDaily.builder()
        .stockId(1L)
        .tradeDate(tradeDate)
        .closePrice(closePrice)
        .createdAt(OffsetDateTime.of(2026, 3, 24, 9, 0, 0, 0, ZoneOffset.UTC))
        .build();
  }

  private AiDebateReport aiDebateReport() throws Exception {
    var constructor = AiDebateReport.class.getDeclaredConstructor();
    constructor.setAccessible(true);
    AiDebateReport report = constructor.newInstance();
    setField(report, "stockId", 1L);
    setField(report, "reportDate", LocalDate.of(2026, 3, 24));
    setField(report, "chairmanSignal", AiSignal.BUY);
    setField(report, "debateConfidence", 0.82f);
    setField(report, "chairmanReport", "실적과 모멘텀이 모두 양호합니다.");
    setField(report, "createdAt", OffsetDateTime.of(2026, 3, 24, 9, 0, 0, 0, ZoneOffset.UTC));
    setField(report, "finalStances", OBJECT_MAPPER.readTree("""
        {
          "fundamental": {
            "signal": "BUY",
            "thesis": "실적 개선"
          },
          "chart": {
            "signal": "HOLD",
            "thesis": "단기 박스권"
          }
        }
        """));
    setField(report, "debateFullLog", OBJECT_MAPPER.readTree("""
        {
          "rounds": [
            {
              "round": 1,
              "opinions": [
                {
                  "persona": "fundamental",
                  "signal": "BUY",
                  "confidence": 0.87,
                  "thesis": "실적 개선이 확인됩니다.",
                  "evidence": ["영업이익 증가"],
                  "risks": ["단기 변동성"],
                  "action_points": ["분할 매수"]
                },
                {
                  "persona": "chart",
                  "signal": "HOLD",
                  "confidence": 0.61,
                  "thesis": "추세 전환은 아직 확인되지 않았습니다.",
                  "evidence": ["박스권 지속"]
                }
              ]
            }
          ]
        }
        """));
    return report;
  }

  private void setField(Object target, String fieldName, Object value) throws Exception {
    Field field = target.getClass().getDeclaredField(fieldName);
    field.setAccessible(true);
    field.set(target, value);
  }

  private AiTradingHistory mockTrade(
      Long id,
      TradeType tradeType,
      OffsetDateTime tradeTime,
      Integer tradePrice,
      Long tradeQuantity,
      Long tradeAmount,
      Long realizedProfit,
      Long holdingQuantityAfter,
      Integer avgBuyPriceAfter,
      Float returnRate
  ) {
    AiTradingHistory trade = org.mockito.Mockito.mock(AiTradingHistory.class);
    org.mockito.Mockito.lenient().when(trade.getId()).thenReturn(id);
    org.mockito.Mockito.lenient().when(trade.getTradeType()).thenReturn(tradeType);
    org.mockito.Mockito.lenient().when(trade.getTradeTime()).thenReturn(tradeTime);
    org.mockito.Mockito.lenient().when(trade.getTradePrice()).thenReturn(tradePrice);
    org.mockito.Mockito.lenient().when(trade.getTradePriceRate()).thenReturn(tradePrice != null ? tradePrice.floatValue() : null);
    org.mockito.Mockito.lenient().when(trade.getTradeQuantity()).thenReturn(tradeQuantity);
    org.mockito.Mockito.lenient().when(trade.getTradeAmount()).thenReturn(tradeAmount);
    org.mockito.Mockito.lenient().when(trade.getRealizedProfit()).thenReturn(realizedProfit);
    org.mockito.Mockito.lenient().when(trade.getHoldingQuantityAfter()).thenReturn(holdingQuantityAfter);
    org.mockito.Mockito.lenient().when(trade.getAvgBuyPriceAfter()).thenReturn(avgBuyPriceAfter);
    org.mockito.Mockito.lenient().when(trade.getReturnRate()).thenReturn(returnRate);
    return trade;
  }
}
