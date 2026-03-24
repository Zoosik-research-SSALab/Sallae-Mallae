package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.global.sse.SseManager;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeTradeTickData;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketClient;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
public class StockQuoteSseService {

  private static final long SSE_TIMEOUT_MILLIS = Duration.ofMinutes(30).toMillis();
  private static final String CHANNEL_PREFIX = "QUOTE:";

  private final SseManager sseManager;
  private final KisWebSocketClient kisWebSocketClient;
  private final KisProperties kisProperties;
  private final StockMarketQueryService stockMarketQueryService;

  private final ConcurrentHashMap<String, AtomicInteger> sseRefCounts = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, String> stockNames = new ConcurrentHashMap<>();

  public StockQuoteSseService(
      SseManager sseManager,
      KisWebSocketClient kisWebSocketClient,
      KisProperties kisProperties,
      StockMarketQueryService stockMarketQueryService
  ) {
    this.sseManager = sseManager;
    this.kisWebSocketClient = kisWebSocketClient;
    this.kisProperties = kisProperties;
    this.stockMarketQueryService = stockMarketQueryService;
  }

  @PostConstruct
  void init() {
    kisWebSocketClient.addTickListener(this::onTicks);
  }

  public SseEmitter streamQuote(String ticker, String market) {
    SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
    String channel = CHANNEL_PREFIX + ticker;

    Runnable cleanup = () -> releaseSseRef(market, ticker);
    emitter.onCompletion(cleanup);
    emitter.onTimeout(cleanup);
    emitter.onError(error -> cleanup.run());

    acquireSseRef(market, ticker);
    sseManager.addEmitter(channel, emitter);

    try {
      StockQuoteResponse initialQuote = stockMarketQueryService.getQuote(ticker, market);
      stockNames.put(ticker, initialQuote.name());
      sseManager.sendToEmitter(emitter, initialQuote);
    } catch (Exception e) {
      log.warn("Failed to send initial quote via SSE. ticker={}, Will keep stream open for realtime data.", ticker, e);
      try {
        emitter.send(SseEmitter.event().name("error").data("initial quote unavailable"));
      } catch (Exception sendErr) {
        log.debug("Failed to send SSE error event. ticker={}", ticker);
      }
    }

    return emitter;
  }

  private void onTicks(List<KisRealtimeTradeTickData> ticks) {
    for (KisRealtimeTradeTickData tick : ticks) {
      String channel = CHANNEL_PREFIX + tick.ticker();
      StockQuoteResponse response = toQuoteResponse(tick);
      sseManager.broadcast(channel, response);
    }
  }

  private StockQuoteResponse toQuoteResponse(KisRealtimeTradeTickData tick) {
    Integer previousClosePrice = null;
    if (tick.currentPrice() != null && tick.changePrice() != null) {
      previousClosePrice = tick.currentPrice() - tick.changePrice();
    }

    return new StockQuoteResponse(
        tick.ticker(),
        stockNames.get(tick.ticker()),
        tick.marketCode(),
        tick.currentPrice(),
        previousClosePrice,
        tick.changePrice(),
        tick.changeRate(),
        tick.openPrice(),
        tick.highPrice(),
        tick.lowPrice(),
        tick.accumulatedVolume(),
        tick.tradedAt(),
        false,
        null,
        tick.source()
    );
  }

  private void acquireSseRef(String market, String ticker) {
    String key = market + ":" + ticker;
    int count = sseRefCounts.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
    log.info("Quote SSE ref acquired. ticker={}, refCount={}", ticker, count);

    if (count == 1 && kisProperties.isConfigured()) {
      kisWebSocketClient.subscribeDomesticTrade(market, ticker)
          .thenAccept(ack -> log.info(
              "KIS realtime subscription ready for quote SSE. ticker={}, success={}",
              ticker, ack.success()))
          .exceptionally(error -> {
            log.warn("Failed to subscribe KIS realtime for quote SSE. ticker={}", ticker, error);
            return null;
          });
    }
  }

  private void releaseSseRef(String market, String ticker) {
    String key = market + ":" + ticker;
    AtomicInteger ref = sseRefCounts.get(key);
    if (ref == null) {
      return;
    }
    int count = ref.decrementAndGet();
    log.info("Quote SSE ref released. ticker={}, refCount={}", ticker, count);

    if (count <= 0) {
      sseRefCounts.remove(key);
      stockNames.remove(ticker);
      if (kisProperties.isConfigured()) {
        kisWebSocketClient.unsubscribeDomesticTrade(market, ticker);
      }
    }
  }
}
