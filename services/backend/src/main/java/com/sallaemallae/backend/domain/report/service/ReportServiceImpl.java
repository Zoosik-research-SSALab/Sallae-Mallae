package com.sallaemallae.backend.domain.report.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sallaemallae.backend.domain.report.dto.ChairmanReportResponse;
import com.sallaemallae.backend.domain.report.dto.ChairmanReportResponse.Chairman;
import com.sallaemallae.backend.domain.report.dto.ChairmanReportResponse.FinalStance;
import com.sallaemallae.backend.domain.report.dto.DebateResponse;
import com.sallaemallae.backend.domain.report.dto.DebateResponse.Agent;
import com.sallaemallae.backend.domain.report.dto.DebateResponse.Round;
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse.ChartPoint;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse.TradeItem;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.domain.report.repository.AiDebateReportRepository;
import com.sallaemallae.backend.domain.signal.entity.AiDailyPerformance;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolioHolding;
import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import com.sallaemallae.backend.domain.signal.repository.AiDailyPerformanceRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioHoldingRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioRepository;
import com.sallaemallae.backend.domain.signal.repository.AiTradingHistoryRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

  private final AiDebateReportRepository aiDebateReportRepository;
  private final AiPortfolioRepository aiPortfolioRepository;
  private final AiPortfolioHoldingRepository aiPortfolioHoldingRepository;
  private final AiDailyPerformanceRepository aiDailyPerformanceRepository;
  private final AiTradingHistoryRepository aiTradingHistoryRepository;

  // REPORT-001: 종목별 의장 분석 + 토론 기록 이력 조회 (페이지네이션)
  @Override
  public List<ReportHistoryItemResponse> getReportHistory(Long stockId, int offset, int limit) {
    int normalizedOffset = Math.max(offset, 0);
    int normalizedLimit = normalizeLimit(limit, 30, 365);
    List<AiDebateReport> reports = aiDebateReportRepository.findByStockIdOrderByReportDateDescCreatedAtDesc(
        stockId,
        normalizedOffset,
        normalizedLimit
    );
    if (reports.isEmpty()) {
      throw new BusinessException(ReportErrorCode.REPORT_NOT_FOUND);
    }

    return reports.stream()
        .map(report -> new ReportHistoryItemResponse(
            report.getReportDate(),
            toChairmanReport(report),
            toDebateResponse(report)
        ))
        .toList();
  }

  // REPORT-003: 전역 AI 포트폴리오 기준 성과 요약 및 차트 조회
  @Override
  public PerformanceResponse getPerformance(Long stockId) {
    AiPortfolio portfolio = getLatestPortfolio();
    Optional<AiPortfolioHolding> holding = aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(
        portfolio.getId(),
        stockId
    );
    List<AiTradingHistory> trades = aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
        portfolio.getId(),
        stockId
    );
    List<AiDailyPerformance> dailyPerformances = aiDailyPerformanceRepository.findByPortfolioIdOrderByRecordDateAsc(
        portfolio.getId()
    );

    Map<java.time.LocalDate, String> tradeMarkers = buildTradeMarkers(trades);
    List<ChartPoint> chart = dailyPerformances.stream()
        .map(performance -> new ChartPoint(
            performance.getRecordDate(),
            performance.getCumulativeReturn(),
            tradeMarkers.get(performance.getRecordDate())
        ))
        .toList();

    Float cumulativeReturn = holding.map(AiPortfolioHolding::getReturnRate)
        .orElseGet(() -> latestTradeReturn(trades));
    Float recentReturn = latestTradeReturn(trades);
    float winRate = calculateWinRatePercent(trades);

    return new PerformanceResponse(cumulativeReturn, winRate, recentReturn, chart);
  }

  // REPORT-004: 종목별 AI 매매 내역 조회 (페이지네이션)
  @Override
  public PerformanceTradesResponse getPerformanceTrades(Long stockId, int offset, int limit) {
    AiPortfolio portfolio = getLatestPortfolio();
    int normalizedOffset = Math.max(offset, 0);
    int normalizedLimit = normalizeLimit(limit, 30, 100);
    List<AiTradingHistory> trades = aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
        portfolio.getId(),
        stockId,
        normalizedOffset,
        normalizedLimit
    );

    List<TradeItem> items = trades.stream()
        .map(trade -> new TradeItem(
            trade.getTradeType().name(),
            trade.getTradeTime(),
            trade.getTradePriceRate(),
            trade.getReturnRate()
        ))
        .toList();

    return new PerformanceTradesResponse(items);
  }

  private AiDebateReport getLatestDebateReport(Long stockId) {
    return aiDebateReportRepository.findTopByStockIdOrderByReportDateDescCreatedAtDesc(stockId)
        .orElseThrow(() -> new BusinessException(ReportErrorCode.REPORT_NOT_FOUND));
  }

  private ChairmanReportResponse toChairmanReport(AiDebateReport report) {
    return new ChairmanReportResponse(
        new Chairman(
            signalValue(report.getChairmanSignal()),
            report.getDebateConfidence(),
            report.getChairmanReport()
        ),
        parseFinalStances(report.getFinalStances()),
        report.getCreatedAt()
    );
  }

  private DebateResponse toDebateResponse(AiDebateReport report) {
    Map<Integer, Map<String, String>> summaryByRoundAndAgent = parseDebateSummaries(report.getDebateSummary());
    Map<Integer, Map<String, String>> opinionByRoundAndAgent = parseDebateOpinions(report.getDebateFullLog());

    List<Round> rounds = new ArrayList<>();
    summaryByRoundAndAgent.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .forEach(entry -> {
          Integer roundNo = entry.getKey();
          Map<String, String> summaries = entry.getValue();
          Map<String, String> opinions = opinionByRoundAndAgent.getOrDefault(roundNo, Map.of());

          List<Agent> agents = summaries.entrySet().stream()
              .map(summaryEntry -> new Agent(
                  summaryEntry.getKey(),
                  opinions.get(summaryEntry.getKey()),
                  summaryEntry.getValue()
              ))
              .toList();
          rounds.add(new Round(roundNo, agents));
        });

    return new DebateResponse(rounds);
  }

  private AiPortfolio getLatestPortfolio() {
    return aiPortfolioRepository.findTopByOrderByUpdatedAtDescIdDesc()
        .orElseThrow(() -> new BusinessException(ReportErrorCode.REPORT_NOT_FOUND));
  }

  private List<FinalStance> parseFinalStances(JsonNode finalStances) {
    if (finalStances == null || !finalStances.isArray()) {
      return List.of();
    }

    List<FinalStance> result = new ArrayList<>();
    for (JsonNode stance : finalStances) {
      result.add(new FinalStance(
          stance.path("agent_id").asText(null),
          stance.path("agent_name").asText(null),
          stance.path("stance").asText(null)
      ));
    }
    return result;
  }

  private Map<Integer, Map<String, String>> parseDebateSummaries(JsonNode debateSummary) {
    if (debateSummary == null || !debateSummary.isArray()) {
      return Map.of();
    }

    Map<Integer, Map<String, String>> result = new LinkedHashMap<>();
    for (JsonNode roundNode : debateSummary) {
      int round = roundNode.path("round").asInt();
      Map<String, String> summaries = result.computeIfAbsent(round, ignored -> new LinkedHashMap<>());
      JsonNode summaryNodes = roundNode.path("summaries");
      if (!summaryNodes.isArray()) {
        continue;
      }

      for (JsonNode summary : summaryNodes) {
        String agentName = summary.path("agent_name").asText(null);
        if (agentName == null) {
          continue;
        }
        summaries.put(agentName, summary.path("content").asText(null));
      }
    }
    return result;
  }

  private Map<Integer, Map<String, String>> parseDebateOpinions(JsonNode debateFullLog) {
    if (debateFullLog == null || !debateFullLog.isArray()) {
      return Map.of();
    }

    Map<Integer, Map<String, List<String>>> messages = new LinkedHashMap<>();
    for (JsonNode roundNode : debateFullLog) {
      int round = roundNode.path("round").asInt();
      Map<String, List<String>> roundMessages = messages.computeIfAbsent(round, ignored -> new LinkedHashMap<>());
      JsonNode contentNodes = roundNode.path("content");
      if (!contentNodes.isArray()) {
        continue;
      }

      for (JsonNode content : contentNodes) {
        String agentName = content.path("agent_name").asText(null);
        String message = content.path("message").asText(null);
        if (agentName == null || message == null || message.isBlank()) {
          continue;
        }
        roundMessages.computeIfAbsent(agentName, ignored -> new ArrayList<>()).add(message);
      }
    }

    Map<Integer, Map<String, String>> result = new LinkedHashMap<>();
    messages.forEach((round, roundMessages) -> {
      Map<String, String> merged = new LinkedHashMap<>();
      roundMessages.forEach((agentName, agentMessages) ->
          merged.put(agentName, String.join("\n", agentMessages)));
      result.put(round, merged);
    });
    return result;
  }

  private Map<java.time.LocalDate, String> buildTradeMarkers(List<AiTradingHistory> trades) {
    Map<java.time.LocalDate, String> markers = new HashMap<>();
    trades.stream()
        .sorted(Comparator.comparing(AiTradingHistory::getTradeTime))
        .forEach(trade -> markers.putIfAbsent(trade.getTradeTime().toLocalDate(), trade.getTradeType().name()));
    return markers;
  }

  private Float latestTradeReturn(List<AiTradingHistory> trades) {
    return trades.stream()
        .map(AiTradingHistory::getReturnRate)
        .filter(java.util.Objects::nonNull)
        .findFirst()
        .orElse(null);
  }

  private float calculateWinRatePercent(List<AiTradingHistory> trades) {
    long sellCount = trades.stream()
        .filter(trade -> trade.getTradeType() != null && "SELL".equals(trade.getTradeType().name()))
        .count();
    if (sellCount == 0) {
      return 0f;
    }

    long winningCount = trades.stream()
        .filter(trade -> trade.getTradeType() != null && "SELL".equals(trade.getTradeType().name()))
        .filter(trade -> trade.getReturnRate() != null && trade.getReturnRate() > 0)
        .count();
    return (float) winningCount * 100 / sellCount;
  }

  // limit 기본값/최댓값 방어 처리
  private int normalizeLimit(int limit, int defaultLimit, int maxLimit) {
    return limit <= 0 ? defaultLimit : Math.min(limit, maxLimit);
  }

  private String signalValue(Enum<?> signal) {
    return signal == null ? null : signal.name();
  }
}
