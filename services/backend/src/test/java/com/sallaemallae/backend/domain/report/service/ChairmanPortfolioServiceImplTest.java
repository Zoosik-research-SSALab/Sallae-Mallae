package com.sallaemallae.backend.domain.report.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse;
import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository;
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

  @InjectMocks
  private ChairmanPortfolioServiceImpl chairmanPortfolioService;

  @Test
  @DisplayName("보유 종목 탭 조회 시 요약과 리스트를 함께 반환한다")
  void getChairmanPortfolio_returnsHoldingsTab() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance latestPerformance = latestDailyPerformance(1.34f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDateLessThanOrderByRecordDateDesc(1L, LocalDate.now()))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(2);
    given(chairmanPortfolioQueryRepository.findSignalSummary())
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.PopularSignalRow(1, 1L, "005930", "삼성전자", 74300, "BUY")));
    AiDailyPerformance februaryFirst = dailyPerformance(LocalDate.of(2026, 2, 27), 1.0f);
    AiDailyPerformance februarySecond = dailyPerformance(LocalDate.of(2026, 2, 28), -0.5f);
    AiDailyPerformance marchFirst = dailyPerformance(LocalDate.of(2026, 3, 4), 2.0f);
    given(aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(1L))
        .willReturn(List.of(februaryFirst, februarySecond, marchFirst));
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L))
        .willReturn(List.of(
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-03", 120000L, 2, 1),
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-02", -30000L, 1, 1)
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
            14.43f
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("HOLDINGS", 0, 6);

    assertThat(response.summary().cumulativeReturn()).isEqualTo(42.5f);
    assertThat(response.summary().hitRate()).isCloseTo(1.25f, org.assertj.core.data.Offset.offset(0.01f));
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
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDateLessThanOrderByRecordDateDesc(1L, LocalDate.now()))
        .willReturn(Optional.of(latestPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findSignalSummary())
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    AiDailyPerformance februaryFirst = dailyPerformance(LocalDate.of(2026, 2, 27), 1.0f);
    AiDailyPerformance februarySecond = dailyPerformance(LocalDate.of(2026, 2, 28), -0.5f);
    AiDailyPerformance marchFirst = dailyPerformance(LocalDate.of(2026, 3, 4), 2.0f);
    given(aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(1L))
        .willReturn(List.of(
            februaryFirst,
            februarySecond,
            marchFirst
        ));
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L))
        .willReturn(List.of(
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-03", 1823400L, 6, 4),
            new ChairmanPortfolioQueryRepository.MonthlyTradeMetricRow("2026-02", -120000L, 3, 2)
        ));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("MONTHLY_RETURNS", 0, 10);

    assertThat(response.monthlyReturns()).hasSize(2);
    assertThat(response.monthlyReturns().get(0).month()).isEqualTo("2026-03");
    assertThat(response.monthlyReturns().get(0).realizedProfitAmount()).isEqualTo(1823400L);
    assertThat(response.monthlyReturns().get(0).buyCount()).isEqualTo(6);
    assertThat(response.monthlyReturns().get(0).sellCount()).isEqualTo(4);
    assertThat(response.summary().yesterdayReturn()).isEqualTo(2.0f);
    assertThat(response.summary().hitRate()).isCloseTo(1.25f, org.assertj.core.data.Offset.offset(0.01f));
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
  @DisplayName("오늘 성과 row가 있어도 yesterdayReturn은 오늘 이전 최신 일별 수익률을 사용한다")
  void getChairmanPortfolio_usesPreviousDayReturnForYesterdayReturn() {
    AiPortfolio portfolio = portfolio(1L, 42.5f);
    AiDailyPerformance yesterdayPerformance = latestDailyPerformance(-0.75f);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDateLessThanOrderByRecordDateDesc(1L, LocalDate.now()))
        .willReturn(Optional.of(yesterdayPerformance));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(0);
    given(chairmanPortfolioQueryRepository.findSignalSummary())
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5)).willReturn(List.of());
    given(aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(1L)).willReturn(List.of());
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
    given(aiDailyPerformanceRepository.findTopByPortfolioIdAndRecordDateLessThanOrderByRecordDateDesc(1L, LocalDate.now()))
        .willReturn(Optional.of(latestPerformance));
    given(aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.findMonthlyTradeMetricRows(1L)).willReturn(List.of());
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(1);
    given(chairmanPortfolioQueryRepository.findSignalSummary())
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
            65000f,
            74300,
            9L,
            3.21f
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("TODAY_TRADES", 0, 6);

    assertThat(response.todayTrades()).hasSize(1);
    assertThat(response.todayTrades().get(0).currentPrice()).isEqualTo(74300);
    assertThat(response.todayTrades().get(0).holdingQuantity()).isEqualTo(9L);
  }

  private AiPortfolio portfolio(Long id, float cumulativeReturn) {
    AiPortfolio portfolio = mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(id);
    given(portfolio.getCumulativeReturn()).willReturn(cumulativeReturn);
    given(portfolio.getUpdatedAt()).willReturn(OffsetDateTime.of(2026, 3, 17, 9, 0, 0, 0, ZoneOffset.UTC));
    return portfolio;
  }

  private AiDailyPerformance dailyPerformance(LocalDate date, Float dailyReturn) {
    AiDailyPerformance performance = mock(AiDailyPerformance.class);
    given(performance.getRecordDate()).willReturn(date);
    given(performance.getDailyReturn()).willReturn(dailyReturn);
    return performance;
  }

  private AiDailyPerformance latestDailyPerformance(Float dailyReturn) {
    AiDailyPerformance performance = mock(AiDailyPerformance.class);
    given(performance.getDailyReturn()).willReturn(dailyReturn);
    return performance;
  }
}
