package com.sallaemallae.backend.domain.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import com.sallaemallae.backend.domain.report.enumtype.AiSignal;
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
}
