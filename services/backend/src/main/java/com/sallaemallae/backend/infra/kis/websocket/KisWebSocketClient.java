package com.sallaemallae.backend.infra.kis.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.KisApprovalKeyManager;
import com.sallaemallae.backend.infra.kis.KisProperties;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class KisWebSocketClient {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final String DOMESTIC_TRADE_TOPIC = "H0STCNT0";
  private static final String ALREADY_SUBSCRIBED_MESSAGE = "ALREADY IN SUBSCRIBE";
  private static final int RECONNECT_DELAY_SECONDS = 3;

  private final KisProperties properties;
  private final KisApprovalKeyManager approvalKeyManager;
  private final ObjectMapper objectMapper;
  private final KisWebSocketMessageParser messageParser;
  private final KisRealtimeMinuteCandleAggregator aggregator;
  private final HttpClient httpClient;

  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
  private final AtomicBoolean connecting = new AtomicBoolean(false);
  private final AtomicBoolean connected = new AtomicBoolean(false);
  private final Map<String, Subscription> subscriptionsByLookupKey = new ConcurrentHashMap<>();
  private final Map<Subscription, CompletableFuture<KisWebSocketSubscriptionAck>> pendingAcknowledgements =
      new ConcurrentHashMap<>();
  private final Map<Subscription, KisWebSocketSubscriptionAck> acknowledgedSubscriptions = new ConcurrentHashMap<>();
  private final Set<Subscription> firstTickLoggedSubscriptions = ConcurrentHashMap.newKeySet();
  private final Map<Subscription, OffsetDateTime> subscriptionTouchedAt = new ConcurrentHashMap<>();

  private volatile WebSocket webSocket;
  private volatile OffsetDateTime lastMessageAt;
  private volatile String lastMessagePreview;

  public KisWebSocketClient(
      KisProperties properties,
      KisApprovalKeyManager approvalKeyManager,
      ObjectMapper objectMapper,
      KisWebSocketMessageParser messageParser,
      KisRealtimeMinuteCandleAggregator aggregator
  ) {
    this.properties = properties;
    this.approvalKeyManager = approvalKeyManager;
    this.objectMapper = objectMapper;
    this.messageParser = messageParser;
    this.aggregator = aggregator;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
        .build();
  }

  public CompletableFuture<KisWebSocketSubscriptionAck> subscribeDomesticTrade(String marketCode, String ticker) {
    Subscription requested = new Subscription(resolveTopic(marketCode), marketCode, ticker);
    String lookupKey = subscriptionLookupKey(requested.topic(), requested.ticker());
    Subscription subscription = subscriptionsByLookupKey.computeIfAbsent(lookupKey, ignored -> requested);
    touchSubscription(subscription);

    KisWebSocketSubscriptionAck acknowledged = acknowledgedSubscriptions.get(subscription);
    if (acknowledged != null && connected.get()) {
      return CompletableFuture.completedFuture(acknowledged);
    }

    CompletableFuture<KisWebSocketSubscriptionAck> acknowledgement = pendingAcknowledgements.compute(
        subscription,
        (ignored, existing) -> existing != null && !existing.isDone() ? existing : new CompletableFuture<>()
    );

    connectIfNecessary();
    dispatchSubscriptionMessage(subscription, true);
    return acknowledgement;
  }

  public void unsubscribeDomesticTrade(String marketCode, String ticker) {
    String lookupKey = subscriptionLookupKey(resolveTopic(marketCode), ticker);
    Subscription subscription = subscriptionsByLookupKey.get(lookupKey);
    if (subscription != null) {
      log.info("KIS websocket unsubscribing. market={}, ticker={}", marketCode, ticker);
      unsubscribeAndEvict(subscription, "SSE 연결 해제로 구독을 종료합니다.");
    }
  }

  public boolean isConnected() {
    return connected.get();
  }

  public boolean isSubscriptionRequested(String marketCode, String ticker) {
    return subscriptionsByLookupKey.containsKey(subscriptionLookupKey(resolveTopic(marketCode), ticker));
  }

  public boolean isSubscriptionAcknowledged(String marketCode, String ticker) {
    KisWebSocketSubscriptionAck acknowledgement =
        acknowledgedSubscriptions.get(resolveSubscription(resolveTopic(marketCode), marketCode, ticker));
    return subscriptionsByLookupKey.containsKey(subscriptionLookupKey(resolveTopic(marketCode), ticker))
        && connected.get()
        && acknowledgement != null
        && acknowledgement.success();
  }

  public Optional<KisWebSocketSubscriptionAck> getAcknowledgement(String marketCode, String ticker) {
    Subscription subscription = resolveSubscription(resolveTopic(marketCode), marketCode, ticker);
    touchSubscription(subscription);
    return Optional.ofNullable(acknowledgedSubscriptions.get(subscription));
  }

  public Optional<OffsetDateTime> getLastMessageAt() {
    return Optional.ofNullable(lastMessageAt);
  }

  public Optional<String> getLastMessagePreview() {
    return Optional.ofNullable(lastMessagePreview);
  }

  public String resolveTopic(String marketCode) {
    return DOMESTIC_TRADE_TOPIC;
  }

  @Scheduled(fixedDelay = 300_000L)
  void cleanupStaleSubscriptions() {
    OffsetDateTime threshold = OffsetDateTime.now(ZONE_ID)
        .minusMinutes(Math.max(1, properties.getRealtimeSubscriptionTtlMinutes()));

    for (Subscription subscription : List.copyOf(subscriptionsByLookupKey.values())) {
      OffsetDateTime lastTouched = subscriptionTouchedAt.get(subscription);
      if (lastTouched != null && lastTouched.isBefore(threshold)) {
        unsubscribeAndEvict(subscription, "실시간 시세 구독이 만료되었습니다.");
      }
    }
  }

  @PreDestroy
  public void shutdown() {
    for (Subscription subscription : List.copyOf(subscriptionsByLookupKey.values())) {
      unsubscribeAndEvict(subscription, "애플리케이션이 종료되었습니다.");
    }

    WebSocket current = webSocket;
    if (current != null) {
      current.sendClose(WebSocket.NORMAL_CLOSURE, "shutdown");
    }
    scheduler.shutdown();
    try {
      long awaitSeconds = Math.max(1L, properties.getTimeoutSeconds());
      if (!scheduler.awaitTermination(awaitSeconds, TimeUnit.SECONDS)) {
        scheduler.shutdownNow();
        if (!scheduler.awaitTermination(awaitSeconds, TimeUnit.SECONDS)) {
          log.warn("KIS websocket scheduler did not terminate cleanly.");
        }
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      scheduler.shutdownNow();
    }
  }

  private void connectIfNecessary() {
    if (connected.get() || subscriptionsByLookupKey.isEmpty() || !connecting.compareAndSet(false, true)) {
      return;
    }

    scheduler.execute(() -> {
      try {
        httpClient.newWebSocketBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
            .buildAsync(URI.create(properties.wsBaseUrl()), new KisListener())
            .join();
      } catch (Exception e) {
        connected.set(false);
        webSocket = null;
        log.warn("Failed to connect KIS websocket.", e);
        scheduleReconnect();
      } finally {
        connecting.set(false);
      }
    });
  }

  private void resubscribeAll() {
    for (Subscription subscription : List.copyOf(subscriptionsByLookupKey.values())) {
      dispatchSubscriptionMessage(subscription, true);
    }
  }

  private void dispatchSubscriptionMessage(Subscription subscription, boolean subscribe) {
    scheduler.execute(() -> sendSubscriptionMessage(subscription, subscribe));
  }

  private void sendSubscriptionMessage(Subscription subscription, boolean subscribe) {
    WebSocket current = webSocket;
    if (current == null || !connected.get()) {
      return;
    }

    try {
      String approvalKey = approvalKeyManager.getApprovalKey();
      String payload = objectMapper.writeValueAsString(Map.of(
          "header", Map.of(
              "approval_key", approvalKey,
              "custtype", "P",
              "tr_type", subscribe ? "1" : "2",
              "content-type", "utf-8"
          ),
          "body", Map.of(
              "input", Map.of(
                  "tr_id", subscription.topic(),
                  "tr_key", subscription.ticker()
              )
          )
      ));
      current.sendText(payload, true);
    } catch (Exception e) {
      CompletableFuture<KisWebSocketSubscriptionAck> pending = pendingAcknowledgements.remove(subscription);
      if (pending != null && !pending.isDone()) {
        pending.completeExceptionally(e);
      }
      log.warn("Failed to send KIS websocket subscription. topic={}, ticker={}", subscription.topic(), subscription.ticker(), e);
    }
  }

  private void handleRawText(String rawMessage) {
    lastMessageAt = OffsetDateTime.now(ZONE_ID);
    lastMessagePreview = rawMessage.length() > 200 ? rawMessage.substring(0, 200) : rawMessage;

    if (messageParser.isPingPong(rawMessage)) {
      WebSocket current = webSocket;
      if (current != null) {
        current.sendText(rawMessage, true);
      }
      return;
    }

    messageParser.parseSubscriptionAck(rawMessage).ifPresent(ack -> {
      KisWebSocketSubscriptionAck normalizedAck = normalizeAcknowledgement(ack);
      Subscription subscription = findSubscription(ack.topic(), ack.ticker())
          .orElse(new Subscription(ack.topic(), StockMarketConstants.DOMESTIC_MARKET_CODE, ack.ticker()));
      touchSubscription(subscription);
      if (normalizedAck.success()) {
        acknowledgedSubscriptions.put(subscription, normalizedAck);
      } else {
        acknowledgedSubscriptions.remove(subscription);
      }
      CompletableFuture<KisWebSocketSubscriptionAck> pending = pendingAcknowledgements.remove(subscription);
      if (pending != null && !pending.isDone()) {
        pending.complete(normalizedAck);
      }
      log.info(
          "KIS websocket subscription acknowledged. topic={}, market={}, ticker={}, success={}, message={}",
          normalizedAck.topic(),
          subscription.marketCode(),
          normalizedAck.ticker(),
          normalizedAck.success(),
          normalizedAck.message()
      );
    });

    List<KisRealtimeTradeTickData> ticks = messageParser.parseDomesticTradeTicks(rawMessage, StockMarketConstants.DOMESTIC_MARKET_CODE)
        .stream()
        .map(this::applyResolvedMarketCode)
        .toList();

    if (!ticks.isEmpty()) {
      KisRealtimeTradeTickData firstTick = ticks.getFirst();
      Subscription subscription = new Subscription(resolveTopic(firstTick.marketCode()), firstTick.marketCode(), firstTick.ticker());
      touchSubscription(subscription);
      if (firstTickLoggedSubscriptions.add(subscription)) {
        log.info(
            "Received first KIS realtime trade tick. ticker={}, market={}, price={}, tradedAt={}, tickCount={}",
            firstTick.ticker(),
            firstTick.marketCode(),
            firstTick.currentPrice(),
            firstTick.tradedAt(),
            ticks.size()
        );
      }
      aggregator.acceptTicks(ticks);
    }
  }

  private KisRealtimeTradeTickData applyResolvedMarketCode(KisRealtimeTradeTickData tick) {
    String marketCode = findSubscription(DOMESTIC_TRADE_TOPIC, tick.ticker())
        .map(Subscription::marketCode)
        .orElse(tick.marketCode());

    return new KisRealtimeTradeTickData(
        marketCode,
        tick.ticker(),
        tick.tradedAt(),
        tick.currentPrice(),
        tick.openPrice(),
        tick.highPrice(),
        tick.lowPrice(),
        tick.changePrice(),
        tick.changeRate(),
        tick.tradeVolume(),
        tick.accumulatedVolume(),
        tick.executionStrength(),
        tick.marketOperationCode(),
        tick.halted(),
        tick.source()
    );
  }

  private Optional<Subscription> findSubscription(String topic, String ticker) {
    return Optional.ofNullable(subscriptionsByLookupKey.get(subscriptionLookupKey(topic, ticker)));
  }

  private void handleDisconnect(Throwable throwable) {
    connected.set(false);
    webSocket = null;
    acknowledgedSubscriptions.clear();
    firstTickLoggedSubscriptions.clear();
    if (throwable != null) {
      log.warn("Disconnected from KIS websocket.", throwable);
    }
    scheduleReconnect();
  }

  private void scheduleReconnect() {
    if (subscriptionsByLookupKey.isEmpty()) {
      return;
    }
    scheduler.schedule(this::connectIfNecessary, RECONNECT_DELAY_SECONDS, TimeUnit.SECONDS);
  }

  private void touchSubscription(Subscription subscription) {
    subscriptionTouchedAt.put(subscription, OffsetDateTime.now(ZONE_ID));
  }

  private void unsubscribeAndEvict(Subscription subscription, String reason) {
    if (connected.get()) {
      sendSubscriptionMessage(subscription, false);
    }

    subscriptionsByLookupKey.remove(subscriptionLookupKey(subscription.topic(), subscription.ticker()));
    subscriptionTouchedAt.remove(subscription);
    acknowledgedSubscriptions.remove(subscription);
    firstTickLoggedSubscriptions.remove(subscription);

    CompletableFuture<KisWebSocketSubscriptionAck> pending = pendingAcknowledgements.remove(subscription);
    if (pending != null && !pending.isDone()) {
      pending.completeExceptionally(new KisApiException(503, "KIS_WS_SUBSCRIPTION_EXPIRED", reason));
    }
  }

  private Subscription resolveSubscription(String topic, String marketCode, String ticker) {
    return subscriptionsByLookupKey.getOrDefault(
        subscriptionLookupKey(topic, ticker),
        new Subscription(topic, marketCode, ticker)
    );
  }

  private String subscriptionLookupKey(String topic, String ticker) {
    return topic + ":" + ticker;
  }

  private KisWebSocketSubscriptionAck normalizeAcknowledgement(KisWebSocketSubscriptionAck acknowledgement) {
    if (acknowledgement.success()
        || acknowledgement.message() == null
        || !ALREADY_SUBSCRIBED_MESSAGE.equalsIgnoreCase(acknowledgement.message())) {
      return acknowledgement;
    }

    return new KisWebSocketSubscriptionAck(
        acknowledgement.topic(),
        acknowledgement.ticker(),
        true,
        acknowledgement.message(),
        acknowledgement.acknowledgedAt()
    );
  }

  private final class KisListener implements WebSocket.Listener {

    private final StringBuilder textBuffer = new StringBuilder();

    @Override
    public void onOpen(WebSocket webSocket) {
      KisWebSocketClient.this.webSocket = webSocket;
      connected.set(true);
      log.info("Connected to KIS websocket. url={}, subscriptions={}", properties.wsBaseUrl(), subscriptionsByLookupKey.size());
      resubscribeAll();
      webSocket.request(1);
      WebSocket.Listener.super.onOpen(webSocket);
    }

    @Override
    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
      textBuffer.append(data);
      if (last) {
        String message = textBuffer.toString();
        textBuffer.setLength(0);
        handleRawText(message);
      }
      webSocket.request(1);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
      webSocket.request(1);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onPing(WebSocket webSocket, ByteBuffer message) {
      webSocket.request(1);
      webSocket.sendPong(message);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onPong(WebSocket webSocket, ByteBuffer message) {
      webSocket.request(1);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
      handleDisconnect(null);
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public void onError(WebSocket webSocket, Throwable error) {
      handleDisconnect(error);
    }
  }

  private record Subscription(String topic, String marketCode, String ticker) {
  }
}
