package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricePointResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceYearly;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceYearlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleAggregator;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketClient;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@Transactional(readOnly = true)
public class StockPriceStreamServiceImpl implements StockPriceStreamService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final long STREAM_INTERVAL_MINUTES = 1L;
  private static final long SSE_TIMEOUT_MILLIS = Duration.ofMinutes(30).toMillis();

  private final StockRepository stockRepository;
  private final StockPriceMinuteRepository stockPriceMinuteRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final StockPriceWeeklyRepository stockPriceWeeklyRepository;
  private final StockPriceMonthlyRepository stockPriceMonthlyRepository;
  private final StockPriceYearlyRepository stockPriceYearlyRepository;
  private final KisProperties kisProperties;
  private final KisWebSocketClient kisWebSocketClient;
  private final KisRealtimeMinuteCandleAggregator candleAggregator;
  private final ScheduledExecutorService scheduler;
  private final long schedulerShutdownWaitSeconds;

  public StockPriceStreamServiceImpl(
      StockRepository stockRepository,
      StockPriceMinuteRepository stockPriceMinuteRepository,
      StockPriceDailyRepository stockPriceDailyRepository,
      StockPriceWeeklyRepository stockPriceWeeklyRepository,
      StockPriceMonthlyRepository stockPriceMonthlyRepository,
      StockPriceYearlyRepository stockPriceYearlyRepository,
      KisProperties kisProperties,
      KisWebSocketClient kisWebSocketClient,
      KisRealtimeMinuteCandleAggregator candleAggregator,
      @Value("${stock.stream.scheduler.pool-size:4}") int schedulerPoolSize,
      @Value("${stock.stream.scheduler.shutdown-wait-seconds:5}") long schedulerShutdownWaitSeconds
  ) {
    this.stockRepository = stockRepository;
    this.stockPriceMinuteRepository = stockPriceMinuteRepository;
    this.stockPriceDailyRepository = stockPriceDailyRepository;
    this.stockPriceWeeklyRepository = stockPriceWeeklyRepository;
    this.stockPriceMonthlyRepository = stockPriceMonthlyRepository;
    this.stockPriceYearlyRepository = stockPriceYearlyRepository;
    this.kisProperties = kisProperties;
    this.kisWebSocketClient = kisWebSocketClient;
    this.candleAggregator = candleAggregator;
    ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(
        Math.max(2, schedulerPoolSize)
    );
    executor.setRemoveOnCancelPolicy(true);
    this.scheduler = executor;
    this.schedulerShutdownWaitSeconds = Math.max(1L, schedulerShutdownWaitSeconds);
  }

  @Override
  public StockPricesResponse getLatestPrices(Long stockId, String candleTypeStr, String cursor) {
    ResolvedStock stock = resolveStock(stockId);
    CandleType candleType = CandleType.from(candleTypeStr);

    return switch (candleType) {
      case MINUTE -> loadMinutePricesResponse(stock);
      case DAILY -> loadDailyPricesWithCursor(stock, cursor);
      case WEEKLY -> loadWeeklyPricesWithCursor(stock, cursor);
      case MONTHLY -> loadMonthlyPricesWithCursor(stock, cursor);
      case YEARLY -> loadYearlyPricesWithCursor(stock, cursor);
    };
  }

  @Override
  public SseEmitter streamPrices(Long stockId, String candleType) {
    ResolvedStock resolvedStock = resolveStock(stockId);
    CandleType type = CandleType.from(candleType);

    SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
    AtomicReference<ScheduledFuture<?>> futureRef = new AtomicReference<>();

    emitter.onCompletion(() -> cancel(futureRef.get()));
    emitter.onTimeout(() -> cancel(futureRef.get()));
    emitter.onError(error -> cancel(futureRef.get()));

    if (!sendSnapshot(emitter, resolvedStock, type)) {
      return emitter;
    }

    if (type == CandleType.MINUTE) {
      ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(
          () -> {
            if (!sendSnapshot(emitter, resolvedStock, type)) {
              cancel(futureRef.get());
            }
          },
          STREAM_INTERVAL_MINUTES,
          STREAM_INTERVAL_MINUTES,
          TimeUnit.MINUTES
      );
      futureRef.set(future);
    } else {
      emitter.complete();
    }

    return emitter;
  }

  @PreDestroy
  public void shutdown() {
    scheduler.shutdown();
    try {
      if (!scheduler.awaitTermination(schedulerShutdownWaitSeconds, TimeUnit.SECONDS)) {
        scheduler.shutdownNow();
        scheduler.awaitTermination(schedulerShutdownWaitSeconds, TimeUnit.SECONDS);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      scheduler.shutdownNow();
    }
  }

  // ===== 분봉 =====

  private StockPricesResponse loadMinutePricesResponse(ResolvedStock stock) {
    ensureRealtimeSubscription(stock);

    // DB 분봉 + 실시간 분봉 merge
    List<StockPricePointResponse> dbPrices = mapMinutePrices(
        stockPriceMinuteRepository.findByStockIdOrderByTradeTimestampDesc(
            stock.stockId(), PageRequest.of(0, 390))
    );
    List<StockPricePointResponse> merged = mergeRealtimeMinutePrices(stock, dbPrices, 390);

    return new StockPricesResponse("MINUTE", false, null, merged);
  }

  // ===== 일봉 (커서 페이지네이션) =====

  private StockPricesResponse loadDailyPricesWithCursor(ResolvedStock stock, String cursor) {
    int pageSize = CandleType.DAILY.pageSize;
    List<StockPriceDaily> prices;

    if (cursor != null) {
      LocalDate cursorDate = LocalDate.parse(cursor);
      prices = stockPriceDailyRepository.findByStockIdAndTradeDateBeforeOrderByTradeDateDesc(
          stock.stockId(), cursorDate, PageRequest.of(0, pageSize + 1));
    } else {
      prices = stockPriceDailyRepository.findByStockIdOrderByTradeDateDesc(
          stock.stockId(), PageRequest.of(0, pageSize + 1));
    }

    boolean hasMore = prices.size() > pageSize;
    List<StockPriceDaily> page = hasMore ? prices.subList(0, pageSize) : prices;
    String nextCursor = hasMore ? page.getLast().getTradeDate().toString() : null;

    return new StockPricesResponse("DAILY", hasMore, nextCursor, mapDailyPrices(page));
  }

  // ===== 주봉 (커서 페이지네이션) =====

  private StockPricesResponse loadWeeklyPricesWithCursor(ResolvedStock stock, String cursor) {
    int pageSize = CandleType.WEEKLY.pageSize;
    List<StockPriceWeekly> prices;

    if (cursor != null) {
      LocalDate cursorDate = LocalDate.parse(cursor);
      prices = stockPriceWeeklyRepository.findByStockIdAndTradeWeekBeforeOrderByTradeWeekDesc(
          stock.stockId(), cursorDate, PageRequest.of(0, pageSize + 1));
    } else {
      prices = stockPriceWeeklyRepository.findByStockIdOrderByTradeWeekDesc(
          stock.stockId(), PageRequest.of(0, pageSize + 1));
    }

    boolean hasMore = prices.size() > pageSize;
    List<StockPriceWeekly> page = hasMore ? prices.subList(0, pageSize) : prices;
    String nextCursor = hasMore ? page.getLast().getTradeWeek().toString() : null;

    return new StockPricesResponse("WEEKLY", hasMore, nextCursor, mapWeeklyPrices(page));
  }

  // ===== 월봉 (커서 페이지네이션) =====

  private StockPricesResponse loadMonthlyPricesWithCursor(ResolvedStock stock, String cursor) {
    int pageSize = CandleType.MONTHLY.pageSize;
    List<StockPriceMonthly> prices;

    if (cursor != null) {
      LocalDate cursorDate = LocalDate.parse(cursor);
      prices = stockPriceMonthlyRepository.findByStockIdAndTradeMonthBeforeOrderByTradeMonthDesc(
          stock.stockId(), cursorDate, PageRequest.of(0, pageSize + 1));
    } else {
      prices = stockPriceMonthlyRepository.findByStockIdOrderByTradeMonthDesc(
          stock.stockId(), PageRequest.of(0, pageSize + 1));
    }

    boolean hasMore = prices.size() > pageSize;
    List<StockPriceMonthly> page = hasMore ? prices.subList(0, pageSize) : prices;
    String nextCursor = hasMore ? page.getLast().getTradeMonth().toString() : null;

    return new StockPricesResponse("MONTHLY", hasMore, nextCursor, mapMonthlyPrices(page));
  }

  // ===== 연봉 (커서 페이지네이션) =====

  private StockPricesResponse loadYearlyPricesWithCursor(ResolvedStock stock, String cursor) {
    int pageSize = CandleType.YEARLY.pageSize;
    List<StockPriceYearly> prices;

    if (cursor != null) {
      int cursorYear = Integer.parseInt(cursor);
      prices = stockPriceYearlyRepository.findByStockIdAndTradeYearLessThanOrderByTradeYearDesc(
          stock.stockId(), cursorYear, PageRequest.of(0, pageSize + 1));
    } else {
      prices = stockPriceYearlyRepository.findByStockIdOrderByTradeYearDesc(
          stock.stockId(), PageRequest.of(0, pageSize + 1));
    }

    boolean hasMore = prices.size() > pageSize;
    List<StockPriceYearly> page = hasMore ? prices.subList(0, pageSize) : prices;
    String nextCursor = hasMore ? String.valueOf(page.getLast().getTradeYear()) : null;

    return new StockPricesResponse("YEARLY", hasMore, nextCursor, mapYearlyPrices(page));
  }

  // ===== Mapper =====

  private List<StockPricePointResponse> mapMinutePrices(List<StockPriceMinute> prices) {
    return ascending(prices.stream()
        .map(price -> new StockPricePointResponse(
            price.getTradeTimestamp(),
            price.getOpenPrice(),
            price.getHighPrice(),
            price.getLowPrice(),
            price.getClosePrice(),
            price.getVolume()
        ))
        .toList());
  }

  private List<StockPricePointResponse> mapDailyPrices(List<StockPriceDaily> prices) {
    return ascending(prices.stream()
        .map(price -> new StockPricePointResponse(
            price.getTradeDate().atStartOfDay(ZONE_ID).toOffsetDateTime(),
            price.getOpenPrice(),
            price.getHighPrice(),
            price.getLowPrice(),
            price.getClosePrice(),
            price.getVolume()
        ))
        .toList());
  }

  private List<StockPricePointResponse> mapWeeklyPrices(List<StockPriceWeekly> prices) {
    return ascending(prices.stream()
        .map(price -> new StockPricePointResponse(
            price.getTradeWeek().atStartOfDay(ZONE_ID).toOffsetDateTime(),
            price.getOpenPrice(),
            price.getHighPrice(),
            price.getLowPrice(),
            price.getClosePrice(),
            price.getVolume()
        ))
        .toList());
  }

  private List<StockPricePointResponse> mapMonthlyPrices(List<StockPriceMonthly> prices) {
    return ascending(prices.stream()
        .map(price -> new StockPricePointResponse(
            price.getTradeMonth().atStartOfDay(ZONE_ID).toOffsetDateTime(),
            price.getOpenPrice(),
            price.getHighPrice(),
            price.getLowPrice(),
            price.getClosePrice(),
            price.getVolume()
        ))
        .toList());
  }

  private List<StockPricePointResponse> mapYearlyPrices(List<StockPriceYearly> prices) {
    return ascending(prices.stream()
        .map(price -> new StockPricePointResponse(
            LocalDate.of(price.getTradeYear(), 1, 1).atStartOfDay(ZONE_ID).toOffsetDateTime(),
            price.getOpenPrice(),
            price.getHighPrice(),
            price.getLowPrice(),
            price.getClosePrice(),
            price.getVolume()
        ))
        .toList());
  }

  private List<StockPricePointResponse> ascending(List<StockPricePointResponse> prices) {
    List<StockPricePointResponse> ordered = new ArrayList<>(prices);
    ordered.sort(Comparator.comparing(StockPricePointResponse::timestamp));
    return List.copyOf(ordered);
  }

  // ===== Realtime Minute Merge =====

  private List<StockPricePointResponse> mergeRealtimeMinutePrices(
      ResolvedStock stock,
      List<StockPricePointResponse> databasePrices,
      int limit
  ) {
    Map<OffsetDateTime, StockPricePointResponse> merged = new LinkedHashMap<>();
    for (StockPricePointResponse databasePrice : databasePrices) {
      merged.put(databasePrice.timestamp(), databasePrice);
    }

    candleAggregator.getCurrentMinuteCandle(stock.marketCode(), stock.ticker())
        .map(this::toRealtimePricePoint)
        .ifPresent(price -> merged.put(price.timestamp(), price));

    for (KisRealtimeMinuteCandleData recentClosedCandle :
        candleAggregator.getRecentClosedMinuteCandles(stock.marketCode(), stock.ticker(), limit)) {
      StockPricePointResponse realtimePrice = toRealtimePricePoint(recentClosedCandle);
      merged.put(realtimePrice.timestamp(), realtimePrice);
    }

    List<StockPricePointResponse> ordered = ascending(new ArrayList<>(merged.values()));
    if (ordered.size() <= limit) {
      return ordered;
    }
    return List.copyOf(ordered.subList(ordered.size() - limit, ordered.size()));
  }

  private StockPricePointResponse toRealtimePricePoint(KisRealtimeMinuteCandleData candle) {
    return new StockPricePointResponse(
        candle.bucketStart(),
        candle.openPrice(),
        candle.highPrice(),
        candle.lowPrice(),
        candle.closePrice(),
        candle.minuteVolume()
    );
  }

  private void ensureRealtimeSubscription(ResolvedStock stock) {
    if (!kisProperties.isConfigured()) {
      return;
    }
    boolean alreadyAcknowledged = kisWebSocketClient.isSubscriptionAcknowledged(stock.marketCode(), stock.ticker());
    if (alreadyAcknowledged) {
      return;
    }
    kisWebSocketClient.subscribeDomesticTrade(stock.marketCode(), stock.ticker())
        .thenAccept(ack -> log.info(
            "KIS realtime minute subscription ready. stockId={}, ticker={}, success={}",
            stock.stockId(), stock.ticker(), ack.success()))
        .exceptionally(error -> {
          log.warn("Failed to subscribe KIS realtime. stockId={}, ticker={}", stock.stockId(), stock.ticker(), error);
          return null;
        });
  }

  // ===== SSE =====

  private boolean sendSnapshot(SseEmitter emitter, ResolvedStock stock, CandleType candleType) {
    try {
      emitter.send(SseEmitter.event()
          .name("prices")
          .data(getLatestPrices(stock.stockId(), candleType.code, null)));
      return true;
    } catch (Exception e) {
      log.warn("Failed to send stock price snapshot. stockId={}, ticker={}, candleType={}",
          stock.stockId(), stock.ticker(), candleType.code, e);
      emitter.completeWithError(e);
      return false;
    }
  }

  // ===== Resolve =====

  private ResolvedStock resolveStock(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return new ResolvedStock(stock.getId(), stock.getTicker(), StockMarketConstants.DOMESTIC_MARKET_CODE);
  }

  private void cancel(ScheduledFuture<?> future) {
    if (future != null) {
      future.cancel(true);
    }
  }

  // ===== CandleType =====

  private enum CandleType {
    MINUTE("MINUTE", 390),
    DAILY("DAILY", 200),
    WEEKLY("WEEKLY", 200),
    MONTHLY("MONTHLY", 200),
    YEARLY("YEARLY", 100);

    final String code;
    final int pageSize;

    CandleType(String code, int pageSize) {
      this.code = code;
      this.pageSize = pageSize;
    }

    static CandleType from(String rawValue) {
      String normalized = rawValue == null ? "DAILY" : rawValue.trim().toUpperCase(Locale.ROOT);
      for (CandleType value : values()) {
        if (value.code.equals(normalized)) {
          return value;
        }
      }
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
  }

  private record ResolvedStock(Long stockId, String ticker, String marketCode) {
  }
}
