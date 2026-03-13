package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricePointResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleAggregator;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketClient;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockPriceStreamServiceImpl implements StockPriceStreamService {

  private static final String DOMESTIC_MARKET_CODE = "J";
  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final long STREAM_INTERVAL_MINUTES = 1L;

  private final StockRepository stockRepository;
  private final StockPriceMinuteRepository stockPriceMinuteRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final StockPriceWeeklyRepository stockPriceWeeklyRepository;
  private final StockPriceMonthlyRepository stockPriceMonthlyRepository;
  private final KisProperties kisProperties;
  private final KisWebSocketClient kisWebSocketClient;
  private final KisRealtimeMinuteCandleAggregator candleAggregator;

  private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

  @Override
  public StockPricesResponse getLatestPrices(Long stockId, String period) {
    ResolvedStock resolvedStock = resolveStock(stockId);
    PricePeriod pricePeriod = PricePeriod.from(period);
    return loadPrices(resolvedStock, pricePeriod);
  }

  @Override
  public SseEmitter streamPrices(Long stockId, String period) {
    ResolvedStock resolvedStock = resolveStock(stockId);
    PricePeriod pricePeriod = PricePeriod.from(period);

    SseEmitter emitter = new SseEmitter(0L);
    AtomicReference<ScheduledFuture<?>> futureRef = new AtomicReference<>();

    emitter.onCompletion(() -> cancel(futureRef.get()));
    emitter.onTimeout(() -> cancel(futureRef.get()));
    emitter.onError(error -> cancel(futureRef.get()));

    if (!sendSnapshot(emitter, resolvedStock, pricePeriod)) {
      return emitter;
    }

    ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(
        () -> sendSnapshot(emitter, resolvedStock, pricePeriod),
        STREAM_INTERVAL_MINUTES,
        STREAM_INTERVAL_MINUTES,
        TimeUnit.MINUTES
    );
    futureRef.set(future);
    return emitter;
  }

  @PreDestroy
  public void shutdown() {
    scheduler.shutdownNow();
  }

  private boolean sendSnapshot(SseEmitter emitter, ResolvedStock stock, PricePeriod period) {
    try {
      emitter.send(SseEmitter.event()
          .name("prices")
          .data(loadPrices(stock, period)));
      return true;
    } catch (IOException | IllegalStateException e) {
      emitter.completeWithError(e);
      return false;
    }
  }

  private StockPricesResponse loadPrices(ResolvedStock stock, PricePeriod period) {
    List<StockPricePointResponse> prices = switch (period) {
      case ONE_MIN, ONE_DAY -> loadMinutePrices(stock, period);
      case ONE_WEEK, ONE_MONTH, THREE_MONTHS -> mapDailyPrices(stockPriceDailyRepository.findByStockIdOrderByTradeDateDesc(
          stock.stockId(),
          PageRequest.of(0, period.limit())
      ));
      case ONE_YEAR -> mapWeeklyPrices(stockPriceWeeklyRepository.findByStockIdOrderByTradeWeekDesc(
          stock.stockId(),
          PageRequest.of(0, period.limit())
      ));
      case THREE_YEARS -> mapMonthlyPrices(stockPriceMonthlyRepository.findByStockIdOrderByTradeMonthDesc(
          stock.stockId(),
          PageRequest.of(0, period.limit())
      ));
    };

    return new StockPricesResponse(prices);
  }

  private List<StockPricePointResponse> loadMinutePrices(ResolvedStock stock, PricePeriod period) {
    if (!period.usesRealtimeMinuteOverlay()) {
      return mapMinutePrices(
          stockPriceMinuteRepository.findByStockIdOrderByTradeTimestampDesc(
              stock.stockId(),
              PageRequest.of(0, period.limit())
          )
      );
    }

    ensureRealtimeSubscription(stock);
    List<StockPricePointResponse> realtimePrices = loadRealtimeMinutePrices(stock, period.limit());
    if (period.isRealtimeFirst()) {
      logOneMinuteSnapshot(stock, "realtime-only", realtimePrices);
      return realtimePrices;
    }

    List<StockPricePointResponse> databasePrices = mapMinutePrices(
        stockPriceMinuteRepository.findByStockIdOrderByTradeTimestampDesc(
            stock.stockId(),
            PageRequest.of(0, period.limit())
        )
    );
    List<StockPricePointResponse> mergedPrices = mergeRealtimeMinutePrices(stock, databasePrices, period.limit());
    return mergedPrices;
  }

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

  private List<StockPricePointResponse> ascending(List<StockPricePointResponse> prices) {
    List<StockPricePointResponse> ordered = new ArrayList<>(prices);
    ordered.sort(Comparator.comparing(StockPricePointResponse::timestamp));
    return List.copyOf(ordered);
  }

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

  private List<StockPricePointResponse> loadRealtimeMinutePrices(ResolvedStock stock, int limit) {
    Map<OffsetDateTime, StockPricePointResponse> realtime = new LinkedHashMap<>();

    for (KisRealtimeMinuteCandleData recentClosedCandle :
        candleAggregator.getRecentClosedMinuteCandles(stock.marketCode(), stock.ticker(), limit)) {
      StockPricePointResponse realtimePrice = toRealtimePricePoint(recentClosedCandle);
      realtime.put(realtimePrice.timestamp(), realtimePrice);
    }

    candleAggregator.getCurrentMinuteCandle(stock.marketCode(), stock.ticker())
        .map(this::toRealtimePricePoint)
        .ifPresent(price -> realtime.put(price.timestamp(), price));

    List<StockPricePointResponse> ordered = ascending(new ArrayList<>(realtime.values()));
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
      log.info("KIS realtime minute stream is not configured. stockId={}, ticker={}", stock.stockId(), stock.ticker());
      return;
    }

    boolean alreadyRequested = kisWebSocketClient.isSubscriptionRequested(stock.marketCode(), stock.ticker());
    boolean alreadyAcknowledged = kisWebSocketClient.isSubscriptionAcknowledged(stock.marketCode(), stock.ticker());
    if (alreadyAcknowledged) {
      return;
    }
    if (!alreadyRequested) {
      log.info("Requesting KIS realtime minute subscription. stockId={}, ticker={}, market={}", stock.stockId(), stock.ticker(), stock.marketCode());
    }

    kisWebSocketClient.subscribeDomesticTrade(stock.marketCode(), stock.ticker())
        .thenAccept(ack -> log.info(
            "KIS realtime minute subscription ready. stockId={}, ticker={}, success={}, message={}",
            stock.stockId(),
            stock.ticker(),
            ack.success(),
            ack.message()
        ))
        .exceptionally(error -> {
          log.warn("Failed to subscribe KIS realtime minute stream. stockId={}, ticker={}", stock.stockId(), stock.ticker(), error);
          return null;
        });
  }

  private ResolvedStock resolveStock(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return new ResolvedStock(stock.getId(), stock.getTicker(), DOMESTIC_MARKET_CODE);
  }

  private void cancel(ScheduledFuture<?> future) {
    if (future != null) {
      future.cancel(true);
    }
  }

  private void logOneMinuteSnapshot(
      ResolvedStock stock,
      String source,
      List<StockPricePointResponse> prices
  ) {
    OffsetDateTime latestTimestamp = prices.isEmpty() ? null : prices.getLast().timestamp();
    log.info(
        "Prepared 1MIN price snapshot. source={}, stockId={}, ticker={}, candles={}, latestTimestamp={}, websocketConnected={}, subscriptionRequested={}, subscriptionAcknowledged={}",
        source,
        stock.stockId(),
        stock.ticker(),
        prices.size(),
        latestTimestamp,
        kisWebSocketClient.isConnected(),
        kisWebSocketClient.isSubscriptionRequested(stock.marketCode(), stock.ticker()),
        kisWebSocketClient.isSubscriptionAcknowledged(stock.marketCode(), stock.ticker())
    );
  }

  private enum PricePeriod {
    ONE_MIN("1MIN", 60),
    ONE_DAY("1D", 390),
    ONE_WEEK("1W", 7),
    ONE_MONTH("1M", 30),
    THREE_MONTHS("3M", 90),
    ONE_YEAR("1Y", 52),
    THREE_YEARS("3Y", 36);

    private final String code;
    private final int limit;

    PricePeriod(String code, int limit) {
      this.code = code;
      this.limit = limit;
    }

    public int limit() {
      return limit;
    }

    public boolean usesRealtimeMinuteOverlay() {
      return this == ONE_MIN || this == ONE_DAY;
    }

    public boolean isRealtimeFirst() {
      return this == ONE_MIN;
    }

    public static PricePeriod from(String rawValue) {
      String normalized = rawValue == null ? "1D" : rawValue.trim().toUpperCase(Locale.ROOT);
      for (PricePeriod value : values()) {
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
