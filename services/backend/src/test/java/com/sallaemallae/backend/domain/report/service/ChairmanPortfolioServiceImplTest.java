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
    AiPortfolio portfolio = portfolio(1L, 42.5f, 20, 17);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
    given(chairmanPortfolioQueryRepository.countHoldings(1L)).willReturn(2);
    given(chairmanPortfolioQueryRepository.findSignalSummary())
        .willReturn(new ChairmanPortfolioQueryRepository.SignalSummaryRow(15, 8, 124, 53));
    given(chairmanPortfolioQueryRepository.findPopularSignalRows(5))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.PopularSignalRow(1, 1L, "005930", "삼성전자", 74300, "BUY")));
    given(chairmanPortfolioQueryRepository.findHoldingRows(1L, 0, 6))
        .willReturn(List.of(new ChairmanPortfolioQueryRepository.HoldingRow(
            1L,
            "005930",
            "삼성전자",
            65000f,
            74300,
            OffsetDateTime.now().minusDays(14),
            14.43f
        )));

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("HOLDINGS", 0, 6);

    assertThat(response.summary().cumulativeReturn()).isEqualTo(42.5f);
    assertThat(response.summary().hitRate()).isEqualTo(85f);
    assertThat(response.signalSummary().buyCount()).isEqualTo(15);
    assertThat(response.holdings()).hasSize(1);
    assertThat(response.todayTrades()).isNull();
    assertThat(response.monthlyReturns()).isNull();
  }

  @Test
  @DisplayName("월간 수익률 탭 조회 시 일별 성과를 월별로 묶어 반환한다")
  void getChairmanPortfolio_returnsMonthlyReturnsTab() {
    AiPortfolio portfolio = portfolio(1L, 42.5f, 10, 8);
    given(aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()).willReturn(Optional.of(portfolio));
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

    ChairmanPortfolioResponse response = chairmanPortfolioService.getChairmanPortfolio("MONTHLY_RETURNS", 0, 10);

    assertThat(response.monthlyReturns()).hasSize(2);
    assertThat(response.monthlyReturns().get(0).month()).isEqualTo("2026-03");
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

  private AiPortfolio portfolio(Long id, float cumulativeReturn, int totalTrades, int winningTrades) {
    AiPortfolio portfolio = mock(AiPortfolio.class);
    given(portfolio.getId()).willReturn(id);
    given(portfolio.getCumulativeReturn()).willReturn(cumulativeReturn);
    given(portfolio.getTotalTrades()).willReturn(totalTrades);
    given(portfolio.getWinningTrades()).willReturn(winningTrades);
    given(portfolio.getUpdatedAt()).willReturn(OffsetDateTime.of(2026, 3, 17, 9, 0, 0, 0, ZoneOffset.UTC));
    return portfolio;
  }

  private AiDailyPerformance dailyPerformance(LocalDate date, Float dailyReturn) {
    AiDailyPerformance performance = mock(AiDailyPerformance.class);
    given(performance.getRecordDate()).willReturn(date);
    given(performance.getDailyReturn()).willReturn(dailyReturn);
    return performance;
  }
}
