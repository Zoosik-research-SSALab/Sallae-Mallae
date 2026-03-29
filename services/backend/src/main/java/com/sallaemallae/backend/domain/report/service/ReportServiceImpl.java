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
import com.sallaemallae.backend.domain.report.dto.PerformanceResponse.Holding;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse.TradeCycleItem;
import com.sallaemallae.backend.domain.report.dto.PerformanceTradesResponse.TradeItem;
import com.sallaemallae.backend.domain.report.dto.ReportHistoryItemResponse;
import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.domain.report.repository.AiDebateReportRepository;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolio;
import com.sallaemallae.backend.domain.signal.entity.AiPortfolioHolding;
import com.sallaemallae.backend.domain.signal.entity.AiTradingHistory;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioHoldingRepository;
import com.sallaemallae.backend.domain.signal.repository.AiPortfolioRepository;
import com.sallaemallae.backend.domain.signal.repository.AiTradingHistoryRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
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
  private final AiTradingHistoryRepository aiTradingHistoryRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final StockRepository stockRepository;

  private static final LocalDate PERFORMANCE_CHART_START_DATE = LocalDate.of(2025, 1, 1);

  // REPORT-001: 종목별 의장 분석 + 토론 기록 이력 조회 (페이지네이션)
  @Override
  public List<ReportHistoryItemResponse> getReportHistory(Long stockId, int offset, int limit) {
    validateActiveStock(stockId);
    int normalizedOffset = Math.max(offset, 0);
    int normalizedLimit = normalizeLimit(limit, 30, 365);
    List<AiDebateReport> reports = aiDebateReportRepository.findByStockIdOrderByReportDateDescCreatedAtDesc(
        stockId,
        normalizedOffset,
        normalizedLimit
    );

    return reports.stream()
        .map(report -> new ReportHistoryItemResponse(
            report.getReportDate(),
            toChairmanReport(report),
            toDebateResponse(report)
        ))
        .toList();
  }

  // REPORT-003: 종목별 의장 모의투자 성과 및 보유 정보 조회
  @Override
  public PerformanceResponse getPerformance(Long stockId) {
    validateActiveStock(stockId);
    AiPortfolio portfolio = getLatestPortfolio();
    Optional<AiPortfolioHolding> holding = aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(
        portfolio.getId(),
        stockId
    );
    List<AiTradingHistory> trades = aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
        portfolio.getId(),
        stockId
    );
    List<StockPriceDaily> priceHistory = stockPriceDailyRepository.findByStockIdOrderByTradeDateAsc(stockId);

    Map<java.time.LocalDate, String> tradeMarkers = buildTradeMarkers(trades);
    List<ChartPoint> chart = priceHistory.stream()
        .filter(price -> price.getTradeDate() != null && !price.getTradeDate().isBefore(PERFORMANCE_CHART_START_DATE))
        .map(price -> new ChartPoint(
            price.getTradeDate(),
            price.getClosePrice(),
            tradeMarkers.get(price.getTradeDate())
        ))
        .toList();

    Float cumulativeReturn = calculateCumulativeStockReturn(holding.orElse(null), trades);
    Float averageReturn1y = calculateAverageReturn1y(trades);
    Float recentReturn = latestTradeReturn(trades);
    float winRate = calculateWinRatePercent(trades);
    Holding holdingInfo = holding.map(value -> toHolding(value, trades, latestPrice(priceHistory))).orElse(null);

    return new PerformanceResponse(cumulativeReturn, averageReturn1y, winRate, recentReturn, holdingInfo, chart);
  }

  // REPORT-004: 종목별 AI 매매 내역 조회 (페이지네이션)
  @Override
  public PerformanceTradesResponse getPerformanceTrades(Long stockId, int offset, int limit) {
    validateActiveStock(stockId);
    AiPortfolio portfolio = getLatestPortfolio();
    int normalizedOffset = Math.max(offset, 0);
    int normalizedLimit = normalizeLimit(limit, 30, 100);
    List<AiTradingHistory> pagedTrades = aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
        portfolio.getId(),
        stockId,
        normalizedOffset,
        normalizedLimit
    );
    List<AiTradingHistory> allTrades = aiTradingHistoryRepository.findByPortfolioIdAndStockIdOrderByTradeTimeDesc(
        portfolio.getId(),
        stockId
    );
    Optional<AiPortfolioHolding> holding = aiPortfolioHoldingRepository.findByPortfolioIdAndStockId(
        portfolio.getId(),
        stockId
    );

    List<TradeItem> items = pagedTrades.stream()
        .map(trade -> new TradeItem(
            trade.getTradeType().name(),
            trade.getTradeTime(),
            trade.getTradePriceRate(),
            trade.getReturnRate()
        ))
        .toList();
    List<TradeCycleItem> tradeCycles = paginate(
        buildTradeCycles(stockId, allTrades, holding.orElse(null)),
        normalizedOffset,
        normalizedLimit
    );

    return new PerformanceTradesResponse(items, tradeCycles);
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
    LinkedHashSet<Integer> roundNumbers = new LinkedHashSet<>(summaryByRoundAndAgent.keySet());
    roundNumbers.addAll(opinionByRoundAndAgent.keySet());

    roundNumbers.stream()
        .sorted()
        .forEach(roundNo -> {
          Map<String, String> summaries = summaryByRoundAndAgent.getOrDefault(roundNo, Map.of());
          Map<String, String> opinions = opinionByRoundAndAgent.getOrDefault(roundNo, Map.of());

          LinkedHashSet<String> agentNames = new LinkedHashSet<>(summaries.keySet());
          agentNames.addAll(opinions.keySet());

          List<Agent> agents = agentNames.stream()
              .map(agentName -> new Agent(
                  agentName,
                  opinions.get(agentName),
                  firstNonBlank(summaries.get(agentName), opinions.get(agentName))
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
    if (finalStances == null || finalStances.isNull()) {
      return List.of();
    }

    if (finalStances.isObject()) {
      List<FinalStance> result = new ArrayList<>();
      finalStances.fields().forEachRemaining(entry -> {
        JsonNode stance = entry.getValue();
        String agentId = entry.getKey();
        result.add(new FinalStance(
            agentId,
            stance.path("agent_name").asText(personaDisplayName(agentId)),
            firstNonBlank(
                stance.path("stance").asText(null),
                stance.path("signal").asText(null)
            )
        ));
      });
      return result;
    }

    if (!finalStances.isArray()) {
      return List.of();
    }

    List<FinalStance> result = new ArrayList<>();
    for (JsonNode stance : finalStances) {
      result.add(new FinalStance(
          firstNonBlank(
              stance.path("agent_id").asText(null),
              stance.path("persona").asText(null)
          ),
          firstNonBlank(
              stance.path("agent_name").asText(null),
              personaDisplayName(stance.path("persona").asText(null))
          ),
          firstNonBlank(
              stance.path("stance").asText(null),
              stance.path("signal").asText(null)
          )
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
    if (debateFullLog == null || debateFullLog.isNull()) {
      return Map.of();
    }

    if (debateFullLog.isObject()) {
      return parseDebateOpinionsFromObject(debateFullLog);
    }

    if (!debateFullLog.isArray()) {
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

  private Map<Integer, Map<String, String>> parseDebateOpinionsFromObject(JsonNode debateFullLog) {
    JsonNode roundsNode = debateFullLog.path("rounds");
    if (!roundsNode.isArray()) {
      return Map.of();
    }

    Map<Integer, Map<String, String>> result = new LinkedHashMap<>();
    for (JsonNode roundNode : roundsNode) {
      int round = roundNode.path("round").asInt();
      JsonNode opinionsNode = roundNode.path("opinions");
      if (!opinionsNode.isArray()) {
        continue;
      }

      Map<String, String> opinions = new LinkedHashMap<>();
      for (JsonNode opinionNode : opinionsNode) {
        String persona = opinionNode.path("persona").asText(null);
        if (persona == null || persona.isBlank()) {
          continue;
        }

        opinions.put(
            personaDisplayName(persona),
            buildOpinionText(opinionNode)
        );
      }

      result.put(round, opinions);
    }
    return result;
  }

  private String buildOpinionText(JsonNode opinionNode) {
    String thesis = opinionNode.path("thesis").asText(null);
    String evidence = joinJsonText(opinionNode.path("evidence"));
    String risks = joinJsonText(opinionNode.path("risks"));
    String actionPoints = joinJsonText(opinionNode.path("action_points"));

    List<String> sections = new ArrayList<>();
    addIfPresent(sections, thesis);
    addIfPresent(sections, prefixIfPresent("근거: ", evidence));
    addIfPresent(sections, prefixIfPresent("리스크: ", risks));
    addIfPresent(sections, prefixIfPresent("실행: ", actionPoints));
    return sections.isEmpty() ? null : String.join("\n", sections);
  }

  private void addIfPresent(List<String> sections, String text) {
    if (text != null && !text.isBlank()) {
      sections.add(text);
    }
  }

  private String prefixIfPresent(String prefix, String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return prefix + value;
  }

  private String joinJsonText(JsonNode node) {
    if (node == null || node.isNull()) {
      return null;
    }
    if (node.isTextual()) {
      return node.asText();
    }
    if (!node.isArray()) {
      return null;
    }

    List<String> values = new ArrayList<>();
    for (JsonNode item : node) {
      if (item != null && item.isTextual() && !item.asText().isBlank()) {
        values.add(item.asText());
      }
    }
    return values.isEmpty() ? null : String.join(" / ", values);
  }

  private String personaDisplayName(String persona) {
    if (persona == null) {
      return null;
    }
    return switch (persona) {
      case "fundamental" -> "펀더멘탈 위원";
      case "chart" -> "차트 위원";
      case "news" -> "뉴스 위원";
      default -> persona;
    };
  }

  private String firstNonBlank(String... candidates) {
    for (String candidate : candidates) {
      if (candidate != null && !candidate.isBlank()) {
        return candidate;
      }
    }
    return null;
  }

  private void validateActiveStock(Long stockId) {
    if (!stockRepository.existsByIdAndIsActiveTrue(stockId)) {
      throw new BusinessException(StockErrorCode.STOCK_NOT_FOUND);
    }
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
        .filter(Objects::nonNull)
        .findFirst()
        .orElse(null);
  }

  private Float calculateCumulativeStockReturn(AiPortfolioHolding holding, List<AiTradingHistory> trades) {
    long totalBuyAmount = trades.stream()
        .filter(trade -> trade.getTradeType() != null && "BUY".equals(trade.getTradeType().name()))
        .map(AiTradingHistory::getTradeAmount)
        .filter(Objects::nonNull)
        .mapToLong(Long::longValue)
        .sum();

    if (totalBuyAmount <= 0 && holding != null && holding.getInvestmentAmount() != null) {
      totalBuyAmount = holding.getInvestmentAmount();
    }

    long realizedProfit = trades.stream()
        .filter(trade -> trade.getTradeType() != null && "SELL".equals(trade.getTradeType().name()))
        .map(AiTradingHistory::getRealizedProfit)
        .filter(Objects::nonNull)
        .mapToLong(Long::longValue)
        .sum();
    long unrealizedProfit = holding != null && holding.getEvaluationProfit() != null
        ? holding.getEvaluationProfit()
        : 0L;

    if (totalBuyAmount <= 0) {
      return holding != null ? holding.getReturnRate() : latestTradeReturn(trades);
    }

    return ((float) (realizedProfit + unrealizedProfit) * 100.0f) / totalBuyAmount;
  }

  private Float calculateAverageReturn1y(List<AiTradingHistory> trades) {
    OffsetDateTime threshold = OffsetDateTime.now().minus(1, ChronoUnit.YEARS);
    List<Float> realizedReturns = trades.stream()
        .filter(trade -> trade.getTradeType() != null && "SELL".equals(trade.getTradeType().name()))
        .filter(trade -> trade.getTradeTime() != null && !trade.getTradeTime().isBefore(threshold))
        .map(AiTradingHistory::getReturnRate)
        .filter(Objects::nonNull)
        .toList();

    if (realizedReturns.isEmpty()) {
      return null;
    }

    float sum = 0f;
    for (Float realizedReturn : realizedReturns) {
      sum += realizedReturn;
    }
    return sum / realizedReturns.size();
  }

  private Integer latestPrice(List<StockPriceDaily> priceHistory) {
    if (priceHistory.isEmpty()) {
      return null;
    }
    return priceHistory.get(priceHistory.size() - 1).getClosePrice();
  }

  private List<TradeCycleItem> buildTradeCycles(Long stockId, List<AiTradingHistory> trades, AiPortfolioHolding holding) {
    if (trades.isEmpty()) {
      return List.of();
    }

    List<AiTradingHistory> ascendingTrades = trades.stream()
        .filter(trade -> trade.getTradeTime() != null)
        .sorted(Comparator.comparing(AiTradingHistory::getTradeTime))
        .toList();
    List<List<AiTradingHistory>> cycles = new ArrayList<>();
    List<AiTradingHistory> currentCycle = new ArrayList<>();

    for (AiTradingHistory trade : ascendingTrades) {
      currentCycle.add(trade);
      if (isCycleClosed(trade)) {
        cycles.add(List.copyOf(currentCycle));
        currentCycle = new ArrayList<>();
      }
    }

    if (!currentCycle.isEmpty()) {
      cycles.add(List.copyOf(currentCycle));
    }

    List<TradeCycleItem> mappedCycles = new ArrayList<>();
    for (int index = 0; index < cycles.size(); index++) {
      List<AiTradingHistory> cycleTrades = cycles.get(index);
      boolean latestCycle = index == cycles.size() - 1;
      mappedCycles.add(toTradeCycleItem(stockId, cycleTrades, holding, latestCycle));
    }

    return mappedCycles.stream()
        .sorted(Comparator.comparing(TradeCycleItem::buyDate, Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  private TradeCycleItem toTradeCycleItem(
      Long stockId,
      List<AiTradingHistory> cycleTrades,
      AiPortfolioHolding holding,
      boolean latestCycle
  ) {
    List<AiTradingHistory> buyTrades = cycleTrades.stream()
        .filter(trade -> trade.getTradeType() != null && trade.getTradeType().name().equals("BUY"))
        .toList();
    List<AiTradingHistory> sellTrades = cycleTrades.stream()
        .filter(trade -> trade.getTradeType() != null && trade.getTradeType().name().equals("SELL"))
        .toList();

    AiTradingHistory firstTrade = cycleTrades.getFirst();
    AiTradingHistory lastTrade = cycleTrades.getLast();
    Long remainingQuantity = resolveRemainingQuantity(lastTrade, holding, latestCycle);
    boolean openCycle = remainingQuantity != null && remainingQuantity > 0;
    OffsetDateTime buyDate = firstTrade.getTradeTime();
    OffsetDateTime sellDate = openCycle ? null : lastTrade.getTradeTime();
    Integer buyPrice = openCycle && latestCycle && holding != null && holding.getAvgBuyPrice() != null
        ? holding.getAvgBuyPrice()
        : calculateAveragePrice(buyTrades);
    Integer currentPrice = openCycle
        ? resolveCurrentPrice(stockId, holding)
        : null;
    Integer sellPrice = openCycle ? null : calculateAveragePrice(sellTrades);
    Integer holdingDays = calculateHoldingDays(buyDate, sellDate);
    Float cycleReturnRate = openCycle
        ? resolveOpenCycleReturnRate(holding, buyPrice, currentPrice)
        : calculateClosedCycleReturnRate(cycleTrades, sellTrades);

    return new TradeCycleItem(
        buildCycleId(stockId, buyDate, cycleTrades),
        openCycle ? "holding" : "sold",
        buyDate,
        sellDate,
        buyPrice,
        sellPrice,
        currentPrice,
        holdingDays,
        cycleReturnRate,
        buyTrades.size(),
        sellTrades.size(),
        remainingQuantity,
        hasPartialSell(sellTrades)
    );
  }

  private boolean isCycleClosed(AiTradingHistory trade) {
    return trade.getHoldingQuantityAfter() != null && trade.getHoldingQuantityAfter() == 0L;
  }

  private Long resolveRemainingQuantity(AiTradingHistory lastTrade, AiPortfolioHolding holding, boolean latestCycle) {
    if (latestCycle && holding != null && holding.getHoldingQuantity() != null) {
      return holding.getHoldingQuantity();
    }
    if (lastTrade.getHoldingQuantityAfter() != null) {
      return lastTrade.getHoldingQuantityAfter();
    }
    return lastTrade.getTradeType() != null && lastTrade.getTradeType().name().equals("SELL") ? 0L : null;
  }

  private Integer resolveCurrentPrice(Long stockId, AiPortfolioHolding holding) {
    if (holding != null && holding.getCurrentPrice() != null) {
      return holding.getCurrentPrice();
    }
    List<StockPriceDaily> priceHistory = stockPriceDailyRepository.findByStockIdOrderByTradeDateAsc(stockId);
    return latestPrice(priceHistory);
  }

  private Integer calculateAveragePrice(List<AiTradingHistory> trades) {
    long totalAmount = 0L;
    long totalQuantity = 0L;
    long sumOfPrices = 0L;
    int priceCount = 0;

    for (AiTradingHistory trade : trades) {
      if (trade.getTradeAmount() != null && trade.getTradeQuantity() != null && trade.getTradeQuantity() > 0) {
        totalAmount += trade.getTradeAmount();
        totalQuantity += trade.getTradeQuantity();
      }

      Integer price = resolveTradePrice(trade);
      if (price != null) {
        sumOfPrices += price;
        priceCount++;
      }
    }

    if (totalAmount > 0 && totalQuantity > 0) {
      return Math.toIntExact(Math.round((double) totalAmount / totalQuantity));
    }
    if (priceCount > 0) {
      return Math.toIntExact(Math.round((double) sumOfPrices / priceCount));
    }
    return null;
  }

  private Integer resolveTradePrice(AiTradingHistory trade) {
    if (trade.getTradePrice() != null) {
      return trade.getTradePrice();
    }
    if (trade.getTradePriceRate() != null) {
      return Math.toIntExact(Math.round(trade.getTradePriceRate()));
    }
    return null;
  }

  private Integer calculateHoldingDays(OffsetDateTime buyDate, OffsetDateTime sellDate) {
    if (buyDate == null) {
      return null;
    }
    LocalDate endDate = sellDate != null ? sellDate.toLocalDate() : LocalDate.now();
    return Math.toIntExact(ChronoUnit.DAYS.between(buyDate.toLocalDate(), endDate));
  }

  private Float resolveOpenCycleReturnRate(AiPortfolioHolding holding, Integer buyPrice, Integer currentPrice) {
    if (holding != null && holding.getReturnRate() != null) {
      return holding.getReturnRate();
    }
    if (buyPrice == null || currentPrice == null || buyPrice == 0) {
      return null;
    }
    return (currentPrice - buyPrice) * 100f / buyPrice;
  }

  private Float calculateClosedCycleReturnRate(List<AiTradingHistory> cycleTrades, List<AiTradingHistory> sellTrades) {
    long totalBuyAmount = cycleTrades.stream()
        .filter(trade -> trade.getTradeType() != null && trade.getTradeType().name().equals("BUY"))
        .map(AiTradingHistory::getTradeAmount)
        .filter(Objects::nonNull)
        .mapToLong(Long::longValue)
        .sum();
    long realizedProfit = sellTrades.stream()
        .map(AiTradingHistory::getRealizedProfit)
        .filter(Objects::nonNull)
        .mapToLong(Long::longValue)
        .sum();

    if (totalBuyAmount > 0) {
      return realizedProfit * 100f / totalBuyAmount;
    }
    return sellTrades.stream()
        .map(AiTradingHistory::getReturnRate)
        .filter(Objects::nonNull)
        .reduce((first, second) -> second)
        .orElse(null);
  }

  private boolean hasPartialSell(List<AiTradingHistory> sellTrades) {
    return sellTrades.stream()
        .anyMatch(trade -> trade.getHoldingQuantityAfter() != null && trade.getHoldingQuantityAfter() > 0);
  }

  private String buildCycleId(Long stockId, OffsetDateTime buyDate, List<AiTradingHistory> cycleTrades) {
    String datePart = buyDate != null ? buyDate.toLocalDate().toString() : "unknown";
    Long firstTradeId = cycleTrades.getFirst().getId();
    Long lastTradeId = cycleTrades.getLast().getId();
    if (firstTradeId != null && lastTradeId != null) {
      return stockId + "-" + datePart + "-" + firstTradeId + "-" + lastTradeId;
    }
    return stockId + "-" + datePart;
  }

  private <T> List<T> paginate(List<T> items, int offset, int limit) {
    if (items.isEmpty() || offset >= items.size()) {
      return List.of();
    }
    int endIndex = Math.min(offset + limit, items.size());
    return items.subList(offset, endIndex);
  }

  private Holding toHolding(AiPortfolioHolding holding, List<AiTradingHistory> trades, Integer latestPrice) {
    Integer buyPrice = holding.getAvgBuyPrice();
    OffsetDateTime buyDate = holding.getBuyDate();
    Integer currentPrice = holding.getCurrentPrice() != null ? holding.getCurrentPrice() : latestPrice;
    Integer holdingDays = null;
    if (buyDate != null) {
      holdingDays = Math.toIntExact(java.time.temporal.ChronoUnit.DAYS.between(buyDate.toLocalDate(), java.time.LocalDate.now()));
    }

    return new Holding(
        buyDate,
        buyPrice,
        currentPrice,
        holding.getHoldingQuantity(),
        holding.getInvestmentAmount(),
        holding.getEvaluationProfit(),
        holding.getReturnRate(),
        holdingDays
    );
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
