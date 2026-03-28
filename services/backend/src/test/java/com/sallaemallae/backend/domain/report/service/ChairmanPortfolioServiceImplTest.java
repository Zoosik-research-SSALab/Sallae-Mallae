package com.sallaemallae.backend.domain.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse;
import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import com.sallaemallae.backend.domain.signal.entity.AiDailyPerformance;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import com.sallaemallae.backend.domain.signal.repository.AiDailyPerformanceRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
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
class ChairmanPortfolioServiceImplTest {

  @Mock
  private AiPortfolioRepository aiPortfolioRepository;

  @Mock
  private AiDailyPerformanceRepository aiDailyPerformanceRepository;

  @Mock
  private ChairmanPortfolioQueryRepository chairmanPortfolioQueryRepository;

  @Mock
  private StockIconUrlResolver stockIconUrlResolver;

  @InjectMocks
  private ChairmanPortfolioServiceImpl chairmanPortfolioService;

  @Test
  @DisplayName("보유 종목 탭 조회 시 요약과 리스트를 함께 반환한다")
  void getChairmanPortfolio_returnsHoldingsTab() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(1.34f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(LocalDate.of(2026, 3, 17));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDate(1L, LocalDate.of(2026, 3, 17)))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(2);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.PopularSignalRow(1, 1L, "005930", "삼성전자", 74300, "BUY", null)));
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L))
        .willReturn(List.of(
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-03", 120000L, 1_500_000L, 2, 1),
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-02", -30000L, 750_000L, 1, 1)
        ));
    given(chairmanPortfolioQueryRepository.findHoldingRows(1L, 0, 6))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.HoldingRow(
            1L,
            "005930",
            "삼성전자",
            65000f,
            74300,
            OffsetDateTime.now().minusDays(14),
            12L,
            14.43f,
            null
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("HOLDINGS", 0, 6);

    assertThat(response.summary().cumulativeReturn()).isEqualTo(42.5f);
    assertThat(response.summary().hitRate()).isCloseTo(2.0f, org.assertj.core.data.Offset.offset(0.01f));
    assertThat(response.summary().yesterdayReturn()).isEqualTo(1.34f);
    assertThat(response.signalSummary().buyCount()).isEqualTo(15);
    assertThat(response.holdings()).hasSize(1);
    assertThat(response.holdings().get(0).holdingQuantity()).isEqualTo(12L);
    assertThat(response.todayTrades()).isNull();
    assertThat(response.monthlyReturns()).isNull();
  }

  @Test
  @DisplayName("월간 수익률 탭 조회 시 일별 성과를 월별로 묶어 반환한다")
  void getChairmanPortfolio_returnsMonthlyReturnsTab() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(2.0f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(LocalDate.of(2026, 3, 17));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDate(1L, LocalDate.of(2026, 3, 17)))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L))
        .willReturn(List.of(
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-03", 1823400L, 16_200_000L, 6, 4),
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-02", -120000L, 3_000_000L, 3, 2)
        ));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("MONTHLY_RETURNS", 0, 10);

    assertThat(response.monthlyReturns()).hasSize(2);
    assertThat(response.monthlyReturns().get(0).month()).isEqualTo("2026-03");
    assertThat(response.monthlyReturns().get(0).monthlyReturn()).isCloseTo(11.26f, org.assertj.core.data.Offset.offset(0.01f));
    assertThat(response.monthlyReturns().get(0).realizedProfitAmount()).isEqualTo(1823400L);
    assertThat(response.monthlyReturns().get(0).buyCount()).isEqualTo(6);
    assertThat(response.monthlyReturns().get(0).sellCount()).isEqualTo(4);
    assertThat(response.summary().yesterdayReturn()).isEqualTo(2.0f);
    assertThat(response.summary().hitRate()).isCloseTo(3.63f, org.assertj.core.data.Offset.offset(0.01f));
    assertThat(response.page().totalCount()).isEqualTo(2);
    assertThat(response.holdings()).isNull();
  }

  @Test
  @DisplayName("잘못된 탭 값이 오면 BusinessException을 던진다")
  void getChairmanPortfolio_throwsExceptionWhenTabIsInvalid() {
    assertThatThrownBy(() -> chairmanPortfolioService.getChairmanPortfolio("UNKNOWN", 0, 6))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(ReportErrorCode.REPORT_INPUT_INVALID)
        );
  }

  @Test
  @DisplayName("전날 대비 수익률은 마지막 매매일의 일별 수익률을 사용한다")
  void getChairmanPortfolio_usesLastTradeDayReturnForYesterdayReturn() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(-0.75f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(LocalDate.of(2026, 3, 27));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDate(1L, LocalDate.of(2026, 3, 27)))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(0);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findHoldingRows(1L, 0, 6)).willReturn(List.of());

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("HOLDINGS", 0, 6);

    assertThat(response.summary().yesterdayReturn()).isEqualTo(-0.75f);
  }

  @Test
  @DisplayName("오늘 매매 탭 조회 시 현재가와 보유 수량을 함께 반환한다")
  void getChairmanPortfolio_returnsTodayTradesWithCurrentPriceAndHoldingQuantity() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(1.25f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(LocalDate.of(2026, 3, 17));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDate(1L, LocalDate.of(2026, 3, 17)))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.countTodayTradeRows(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findTodayTradeRows(1L, 0, 6))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.TodayTradeRow(
            1L,
            "005930",
            "삼성전자",
            "BUY",
            OffsetDateTime.now().minusHours(2),
            null,
            65000f,
            74300,
            9L,
            9L,
            3.21f,
            null
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("TODAY_TRADES", 0, 6);

    assertThat(response.todayTrades()).hasSize(1);
    assertThat(response.todayTrades().get(0).currentPrice()).isEqualTo(74300);
    assertThat(response.todayTrades().get(0).tradeQuantity()).isEqualTo(9L);
    assertThat(response.todayTrades().get(0).holdingQuantity()).isEqualTo(9L);
  }

  @Test
  @DisplayName("오늘 매매 탭의 매도 내역은 매수 단가와 체결 수량을 함께 반환한다")
  void getChairmanPortfolio_returnsSellTradeWithBuyPriceAndTradeQuantity() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(1.25f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(LocalDate.of(2026, 3, 17));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDate(1L, LocalDate.of(2026, 3, 17)))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.countTodayTradeRows(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findTodayTradeRows(1L, 0, 6))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.TodayTradeRow(
            1L,
            "028670",
            "팬오션",
            "SELL",
            OffsetDateTime.now().minusHours(2),
            4114f,
            5070f,
            4980,
            100L,
            0L,
            23.25f
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("TODAY_TRADES", 0, 6);

    assertThat(response.todayTrades()).hasSize(1);
    assertThat(response.todayTrades().get(0).buyPrice()).isEqualTo(4114f);
    assertThat(response.todayTrades().get(0).tradePrice()).isEqualTo(5070f);
    assertThat(response.todayTrades().get(0).tradeQuantity()).isEqualTo(100L);
    assertThat(response.todayTrades().get(0).holdingQuantity()).isEqualTo(0L);
    assertThat(response.todayTrades().get(0).returnRate()).isEqualTo(23.25f);
  }

  @Test
  @DisplayName("매매 이력이 없으면 최신 일별 수익률로 전날 대비 수익률을 대체한다")
  void getChairmanPortfolio_fallsBackToLatestDailyReturnWhenNoTradeExists() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(0.84f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.findLatestTradeDate(1L)).willReturn(null);
    given(aiDailyPerformanceRepository.findTopByPortfolioIdOrderByRecordDateDesc(1L))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(0);
    given(chairmanPortfolioQueryRepository.findSignalSummary(1L))
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findHoldingRows(1L, 0, 6)).willReturn(List.of());

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("HOLDINGS", 0, 6);

    assertThat(response.summary().yesterdayReturn()).isEqualTo(0.84f);
  }

  private AiPortfolio portfolio(Long id, float cumulativeReturn) {
    AiPortfolio portfolio = mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(id);
    given(portfolio.getCumulativeReturn()).willReturn(cumulativeReturn);
    given(portfolio.getUpdatedAt()).willReturn(OffsetDateTime.of(2026, 3, 17, 9, 0, 0, 0, ZoneOffset.UTC));
    return portfolio;
  }

  private AiDailyPerformance latestDailyPerformance(Float dailyReturn) {
    AiDailyPerformance performance = mock(AiDailyPerformance.class);
    given(performance.getDailyReturn()).willReturn(dailyReturn);
    return performance;
  }
}
