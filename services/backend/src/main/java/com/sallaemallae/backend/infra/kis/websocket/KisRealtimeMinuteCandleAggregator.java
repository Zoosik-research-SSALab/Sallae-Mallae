package com.sallaemallae.backend.infra.kis.websocket;

import com.sallaemallae.backend.infra.kis.cache.KisRealtimeCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class KisRealtimeMinuteCandleAggregator {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final int MAX_RECENT_CANDLES = 120;

  private final KisRealtimeCacheRepository cacheRepository;
  private final MarketCacheTtlPolicy ttlPolicy;
  private final Clock clock;

  private final ConcurrentMap<String, KisRealtimeMinuteCandleData> currentCandles = new ConcurrentHashMap<>();
  private final ConcurrentMap<String, OffsetDateTime> lastTouchedAt = new ConcurrentHashMap<>();

  @Autowired
  public KisRealtimeMinuteCandleAggregator(
      KisRealtimeCacheRepository cacheRepository,
      MarketCacheTtlPolicy ttlPolicy
  ) {
    this(cacheRepository, ttlPolicy, Clock.system(ZONE_ID));
  }

  KisRealtimeMinuteCandleAggregator(
      KisRealtimeCacheRepository cacheRepository,
      MarketCacheTtlPolicy ttlPolicy,
      Clock clock
  ) {
    this.cacheRepository = cacheRepository;
    this.ttlPolicy = ttlPolicy;
    this.clock = clock;
  }

  public void acceptTicks(List<KisRealtimeTradeTickData> ticks) {
    for (KisRealtimeTradeTickData tick : ticks) {
      acceptTick(tick);
    }
  }

  public void acceptTick(KisRealtimeTradeTickData tick) {
    String aggregateKey = aggregateKey(tick.marketCode(), tick.ticker());
    touch(aggregateKey);

    currentCandles.compute(aggregateKey, (ignored, current) -> {
      KisRealtimeMinuteCandleData base = current != null
          ? current
          : cacheRepository.getCurrentMinuteCandle(tick.marketCode(), tick.ticker()).orElse(null);
      KisRealtimeMinuteCandleData updated = merge(base, tick);
      cacheRepository.saveLatestTick(tick.marketCode(), tick.ticker(), tick, ttlPolicy.realtimeTickTtl());
      cacheRepository.saveCurrentMinuteCandle(
          tick.marketCode(),
          tick.ticker(),
          updated,
          ttlPolicy.realtimeMinuteCurrentTtl()
      );
      return updated;
    });
  }

  public Optional<KisRealtimeTradeTickData> getLatestTick(String marketCode, String ticker) {
    touch(aggregateKey(marketCode, ticker));
    return cacheRepository.getLatestTick(marketCode, ticker);
  }

  public Optional<KisRealtimeMinuteCandleData> getCurrentMinuteCandle(String marketCode, String ticker) {
    String aggregateKey = aggregateKey(marketCode, ticker);
    touch(aggregateKey);

    KisRealtimeMinuteCandleData current = currentCandles.compute(aggregateKey, (ignored, existing) -> {
      KisRealtimeMinuteCandleData base = existing != null
          ? existing
          : cacheRepository.getCurrentMinuteCandle(marketCode, ticker).orElse(null);
      return rollCurrentCandleIfExpired(base);
    });
    return Optional.ofNullable(current);
  }

  public List<KisRealtimeMinuteCandleData> getRecentClosedMinuteCandles(String marketCode, String ticker, int limit) {
    String aggregateKey = aggregateKey(marketCode, ticker);
    touch(aggregateKey);

    currentCandles.compute(aggregateKey, (ignored, existing) -> {
      KisRealtimeMinuteCandleData base = existing != null
          ? existing
          : cacheRepository.getCurrentMinuteCandle(marketCode, ticker).orElse(null);
      return rollCurrentCandleIfExpired(base);
    });
    return cacheRepository.trimToLimit(cacheRepository.getRecentMinuteCandles(marketCode, ticker), limit);
  }

  @Scheduled(fixedDelay = 600_000L)
  void cleanupStaleState() {
    OffsetDateTime threshold = OffsetDateTime.now(clock).minus(ttlPolicy.realtimeStateTtl());
    for (String aggregateKey : List.copyOf(lastTouchedAt.keySet())) {
      OffsetDateTime lastTouched = lastTouchedAt.get(aggregateKey);
      if (lastTouched != null && lastTouched.isBefore(threshold)) {
        currentCandles.remove(aggregateKey);
        lastTouchedAt.remove(aggregateKey);
      }
    }
  }

  private KisRealtimeMinuteCandleData merge(KisRealtimeMinuteCandleData current, KisRealtimeTradeTickData tick) {
    OffsetDateTime bucketStart = tick.tradedAt()
        .atZoneSameInstant(ZONE_ID)
        .truncatedTo(ChronoUnit.MINUTES)
        .toOffsetDateTime();
    OffsetDateTime bucketEnd = bucketStart.plusMinutes(1);

    if (current == null) {
      return newCandle(bucketStart, bucketEnd, tick);
    }

    if (!current.bucketStart().equals(bucketStart)) {
      persistClosedCandle(current);
      return newCandle(bucketStart, bucketEnd, tick);
    }

    return new KisRealtimeMinuteCandleData(
        current.marketCode(),
        current.ticker(),
        current.bucketStart(),
        current.bucketEnd(),
        current.openPrice(),
        max(current.highPrice(), tick.currentPrice()),
        min(current.lowPrice(), tick.currentPrice()),
        tick.currentPrice(),
        current.minuteVolume() + safeLong(tick.tradeVolume()),
        tick.accumulatedVolume(),
        tick.changeRate(),
        current.tickCount() + 1,
        tick.tradedAt(),
        false,
        current.source()
    );
  }

  private KisRealtimeMinuteCandleData newCandle(
      OffsetDateTime bucketStart,
      OffsetDateTime bucketEnd,
      KisRealtimeTradeTickData tick
  ) {
    int price = tick.currentPrice();
    return new KisRealtimeMinuteCandleData(
        tick.marketCode(),
        tick.ticker(),
        bucketStart,
        bucketEnd,
        price,
        price,
        price,
        price,
        safeLong(tick.tradeVolume()),
        tick.accumulatedVolume(),
        tick.changeRate(),
        1,
        tick.tradedAt(),
        false,
        tick.source()
    );
  }

  private void persistClosedCandle(KisRealtimeMinuteCandleData candle) {
    List<KisRealtimeMinuteCandleData> existing = new ArrayList<>(
        cacheRepository.getRecentMinuteCandles(candle.marketCode(), candle.ticker())
    );
    KisRealtimeMinuteCandleData closed = new KisRealtimeMinuteCandleData(
        candle.marketCode(),
        candle.ticker(),
        candle.bucketStart(),
        candle.bucketEnd(),
        candle.openPrice(),
        candle.highPrice(),
        candle.lowPrice(),
        candle.closePrice(),
        candle.minuteVolume(),
        candle.accumulatedVolume(),
        candle.changeRate(),
        candle.tickCount(),
        candle.lastTradeAt(),
        true,
        candle.source()
    );

    if (!existing.isEmpty() && existing.get(0).bucketStart().equals(closed.bucketStart())) {
      existing.set(0, closed);
    } else {
      existing.add(0, closed);
    }
    if (existing.size() > MAX_RECENT_CANDLES) {
      existing = new ArrayList<>(existing.subList(0, MAX_RECENT_CANDLES));
    }
    cacheRepository.saveRecentMinuteCandles(
        candle.marketCode(),
        candle.ticker(),
        existing,
        ttlPolicy.realtimeMinuteRecentTtl()
    );
  }

  private KisRealtimeMinuteCandleData rollCurrentCandleIfExpired(KisRealtimeMinuteCandleData current) {
    if (current == null) {
      return null;
    }

    OffsetDateTime now = OffsetDateTime.now(clock);
    if (now.isBefore(current.bucketEnd())) {
      return current;
    }

    persistClosedCandle(current);
    cacheRepository.deleteCurrentMinuteCandle(current.marketCode(), current.ticker());
    return null;
  }

  private void touch(String aggregateKey) {
    lastTouchedAt.put(aggregateKey, OffsetDateTime.now(clock));
  }

  private String aggregateKey(String marketCode, String ticker) {
    return marketCode + ":" + ticker;
  }

  private int max(Integer left, Integer right) {
    return Math.max(left != null ? left : Integer.MIN_VALUE, right != null ? right : Integer.MIN_VALUE);
  }

  private int min(Integer left, Integer right) {
    return Math.min(left != null ? left : Integer.MAX_VALUE, right != null ? right : Integer.MAX_VALUE);
  }

  private long safeLong(Long value) {
    return value != null ? value : 0L;
  }
}
