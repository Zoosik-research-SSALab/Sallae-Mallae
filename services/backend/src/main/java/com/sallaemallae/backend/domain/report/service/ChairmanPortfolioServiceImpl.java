package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.dto.ChairmanHallOfFameResponse;
import com.sallaemallae.backend.domain.report.dto.ChairmanHallOfFameResponse.HitRateItem;
import com.sallaemallae.backend.domain.report.dto.ChairmanHallOfFameResponse.ReturnMetricItem;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.HoldingItem;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.MonthlyReturnItem;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.PageInfo;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.PopularSignalItem;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.SignalSummary;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.Summary;
import com.sallaemallae.backend.domain.report.dto.ChairmanPortfolioResponse.TodayTradeItem;
import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.HoldingRow;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.HallOfFameHitRateRow;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.HallOfFameReturnRow;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.PopularSignalRow;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.SignalSummaryRow;
import com.sallaemallae.backend.domain.report.repository.ChairmanPortfolioQueryRepository.TodayTradeRow;
import com.sallaemallae.backend.domain.signal.entity.AiDailyPerformance;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import com.sallaemallae.backend.domain.signal.repository.AiDailyPerformanceRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChairmanPortfolioServiceImpl implements ChairmanPortfolioService {

  private static final int POPULAR_SIGNAL_LIMIT = 5;
  private static final int HALL_OF_FAME_HIT_RATE_LIMIT = 5;
  private static final int HALL_OF_FAME_CUMULATIVE_RETURN_LIMIT = 5;
  private static final int HALL_OF_FAME_MAX_SINGLE_RETURN_LIMIT = 5;
  private static final int HALL_OF_FAME_AVERAGE_RETURN_LIMIT = 5;

  private final AiPortfolioRepository aiPortfolioRepository;
  private final AiDailyPerformanceRepository aiDailyPerformanceRepository;
  private final ChairmanPortfolioQueryRepository chairmanPortfolioQueryRepository;

  @Override
  public ChairmanPortfolioResponse getChairmanPortfolio(String tab, int offset, int limit) {
    ChairmanPortfolioSupport.PortfolioQuery query = ChairmanPortfolioSupport.PortfolioQuery.of(tab, offset, limit);
    AiPortfolio portfolio = aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()
        .orElseThrow(() -> new BusinessException(ReportErrorCode.REPORT_NOT_FOUND));

    int holdingCount = chairmanPortfolioQueryRepository.countHoldings(portfolio.getId());
    Summary summary = new Summary(
        portfolio.getCumulativeReturn(),
        calculateHitRate(portfolio),
        null,
        null,
        holdingCount
    );

    SignalSummaryRow summaryRow = chairmanPortfolioQueryRepository.findSignalSummary();
    SignalSummary signalSummary = new SignalSummary(
        summaryRow.buyCount(),
        summaryRow.sellCount(),
        summaryRow.holdCount(),
        summaryRow.watchCount()
    );

    List<PopularSignalItem> popularSignals = chairmanPortfolioQueryRepository.findPopularSignalRows(POPULAR_SIGNAL_LIMIT)
        .stream()
        .map(this::toPopularSignalItem)
        .toList();

    List<HoldingItem> holdings = null;
    List<TodayTradeItem> todayTrades = null;
    List<MonthlyReturnItem> monthlyReturns = null;
    int totalCount;

    switch (query.tab()) {
      case HOLDINGS -> {
        totalCount = holdingCount;
        holdings = chairmanPortfolioQueryRepository.findHoldingRows(portfolio.getId(), query.offset(), query.limit())
            .stream()
            .map(this::toHoldingItem)
            .toList();
      }
      case TODAY_TRADES -> {
        totalCount = chairmanPortfolioQueryRepository.countTodayTradeRows(portfolio.getId());
        todayTrades = chairmanPortfolioQueryRepository.findTodayTradeRows(portfolio.getId(), query.offset(), query.limit())
            .stream()
            .map(this::toTodayTradeItem)
            .toList();
      }
      case MONTHLY_RETURNS -> {
        List<MonthlyReturnItem> monthlyItems = buildMonthlyReturns(portfolio.getId());
        totalCount = monthlyItems.size();
        monthlyReturns = monthlyItems.stream()
            .skip(query.offset())
            .limit(query.limit())
            .toList();
      }
      default -> throw new BusinessException(ReportErrorCode.REPORT_INPUT_INVALID);
    }

    return new ChairmanPortfolioResponse(
        portfolio.getUpdatedAt(),
        summary,
        signalSummary,
        popularSignals,
        query.tab().name(),
        holdings,
        todayTrades,
        monthlyReturns,
        new PageInfo(query.offset(), query.limit(), totalCount)
    );
  }

  @Override
  public ChairmanHallOfFameResponse getChairmanHallOfFame() {
    AiPortfolio portfolio = aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()
        .orElseThrow(() -> new BusinessException(ReportErrorCode.REPORT_NOT_FOUND));

    return new ChairmanHallOfFameResponse(
        chairmanPortfolioQueryRepository.findHitRateTopRows(portfolio.getId(), HALL_OF_FAME_HIT_RATE_LIMIT)
            .stream()
            .map(this::toHitRateItem)
            .toList(),
        chairmanPortfolioQueryRepository.findCumulativeReturnTopRows(
                portfolio.getId(),
                HALL_OF_FAME_CUMULATIVE_RETURN_LIMIT
            ).stream()
            .map(this::toReturnMetricItem)
            .toList(),
        chairmanPortfolioQueryRepository.findMaxSingleReturnTopRows(
                portfolio.getId(),
                HALL_OF_FAME_MAX_SINGLE_RETURN_LIMIT
            ).stream()
            .map(this::toReturnMetricItem)
            .toList(),
        chairmanPortfolioQueryRepository.findAverageReturnTopRows(
                portfolio.getId(),
                HALL_OF_FAME_AVERAGE_RETURN_LIMIT
            ).stream()
            .map(this::toReturnMetricItem)
            .toList()
    );
  }

  private float calculateHitRate(AiPortfolio portfolio) {
    if (portfolio.getTotalTrades() == 0) {
      return 0f;
    }
    return (float) portfolio.getWinningTrades() * 100 / portfolio.getTotalTrades();
  }

  private PopularSignalItem toPopularSignalItem(PopularSignalRow row) {
    return new PopularSignalItem(
        row.rank(),
        row.stockId(),
        row.ticker(),
        row.name(),
        row.price(),
        row.signal()
    );
  }

  private HoldingItem toHoldingItem(HoldingRow row) {
    return new HoldingItem(
        row.stockId(),
        row.ticker(),
        row.name(),
        row.buyPrice(),
        row.currentPrice(),
        row.holdingDays(LocalDate.now()),
        row.returnRate()
    );
  }

  private TodayTradeItem toTodayTradeItem(TodayTradeRow row) {
    return new TodayTradeItem(
        row.stockId(),
        row.ticker(),
        row.name(),
        row.tradeType(),
        row.tradeTime(),
        row.tradePrice(),
        row.returnRate()
    );
  }

  private HitRateItem toHitRateItem(HallOfFameHitRateRow row) {
    return new HitRateItem(
        row.rank(),
        row.stockId(),
        row.ticker(),
        row.name(),
        row.hitRate(),
        row.winningTrades(),
        row.totalTrades()
    );
  }

  private ReturnMetricItem toReturnMetricItem(HallOfFameReturnRow row) {
    return new ReturnMetricItem(
        row.rank(),
        row.stockId(),
        row.ticker(),
        row.name(),
        row.value()
    );
  }

  private List<MonthlyReturnItem> buildMonthlyReturns(Long portfolioId) {
    List<AiDailyPerformance> performances = aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(portfolioId);
    Map<YearMonth, MonthlyAccumulator> accumulators = new LinkedHashMap<>();
    for (AiDailyPerformance performance : performances) {
      if (performance.getRecordDate() == null) {
        continue;
      }
      YearMonth yearMonth = YearMonth.from(performance.getRecordDate());
      MonthlyAccumulator accumulator = accumulators.computeIfAbsent(yearMonth, ignored -> new MonthlyAccumulator());
      accumulator.accumulate(performance.getDailyReturn());
    }

    List<MonthlyReturnItem> items = new ArrayList<>();
    accumulators.forEach((yearMonth, accumulator) ->
        items.add(new MonthlyReturnItem(
            yearMonth.toString(),
            accumulator.monthlyReturn(),
            null,
            null
        )));

    items.sort(Comparator.comparing(MonthlyReturnItem::month).reversed());
    return items;
  }

  private static final class MonthlyAccumulator {

    private float factor = 1f;

    void accumulate(Float dailyReturn) {
      if (dailyReturn == null) {
        return;
      }
      factor *= (1 + (dailyReturn / 100f));
    }

    float monthlyReturn() {
      return (factor - 1f) * 100f;
    }
  }
}
