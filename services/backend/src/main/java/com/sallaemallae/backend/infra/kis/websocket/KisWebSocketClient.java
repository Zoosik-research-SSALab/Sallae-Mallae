package com.sallaemallae.backend.infra.kis.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KisWebSocketClient {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final String DOMESTIC_TRADE_TOPIC = "H0STCNT0";
  private static final int RECONNECT_DELAY_SECONDS = 3;

  private final KisProperties properties;
  private final KisApprovalKeyManager approvalKeyManager;
  private final ObjectMapper objectMapper;
  private final KisWebSocketMessageParser messageParser;
  private final KisRealtimeMinuteCandleAggregator aggregator;

  private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
  private final AtomicBoolean connecting = new AtomicBoolean(false);
  private final AtomicBoolean connected = new AtomicBoolean(false);
  private final Set<Subscription> subscriptions = ConcurrentHashMap.newKeySet();
  private final Map<Subscription, CompletableFuture<KisWebSocketSubscriptionAck>> pendingAcknowledgements =
      new ConcurrentHashMap<>();
  private final Map<Subscription, KisWebSocketSubscriptionAck> acknowledgedSubscriptions = new ConcurrentHashMap<>();
  private final Set<Subscription> firstTickLoggedSubscriptions = ConcurrentHashMap.newKeySet();

  private volatile WebSocket webSocket;
  private volatile OffsetDateTime lastMessageAt;
  private volatile String lastMessagePreview;

  public CompletableFuture<KisWebSocketSubscriptionAck> subscribeDomesticTrade(String marketCode, String ticker) {
    Subscription subscription = new Subscription(resolveTopic(marketCode), marketCode, ticker);
    subscriptions.add(subscription);

    KisWebSocketSubscriptionAck acknowledged = acknowledgedSubscriptions.get(subscription);
    if (acknowledged != null && connected.get()) {
      return CompletableFuture.completedFuture(acknowledged);
    }

    CompletableFuture<KisWebSocketSubscriptionAck> acknowledgement = pendingAcknowledgements.compute(
        subscription,
        (ignored, existing) -> existing != null && !existing.isDone() ? existing : new CompletableFuture<>()
    );

    connectIfNecessary();
    if (connected.get()) {
      sendSubscriptionMessage(subscription, true);
    }
    return acknowledgement;
  }

  public boolean isConnected() {
    return connected.get();
  }

  public boolean isSubscriptionRequested(String marketCode, String ticker) {
    return subscriptions.contains(new Subscription(resolveTopic(marketCode), marketCode, ticker));
  }

  public boolean isSubscriptionAcknowledged(String marketCode, String ticker) {
    return acknowledgedSubscriptions.containsKey(new Subscription(resolveTopic(marketCode), marketCode, ticker));
  }

  public Optional<KisWebSocketSubscriptionAck> getAcknowledgement(String marketCode, String ticker) {
    return Optional.ofNullable(acknowledgedSubscriptions.get(new Subscription(resolveTopic(marketCode), marketCode, ticker)));
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

  @PreDestroy
  public void shutdown() {
    WebSocket current = webSocket;
    if (current != null) {
      current.sendClose(WebSocket.NORMAL_CLOSURE, "shutdown");
    }
    scheduler.shutdownNow();
  }

  private void connectIfNecessary() {
    if (connected.get() || subscriptions.isEmpty() || !connecting.compareAndSet(false, true)) {
      return;
    }

    scheduler.execute(() -> {
      try {
        HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
            .build();
        WebSocket socket = client.newWebSocketBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
            .buildAsync(URI.create(properties.wsBaseUrl()), new KisListener())
            .join();
        webSocket = socket;
        connected.set(true);
        resubscribeAll();
        log.info("Connected to KIS websocket. url={}, subscriptions={}", properties.wsBaseUrl(), subscriptions.size());
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
    for (Subscription subscription : subscriptions) {
      sendSubscriptionMessage(subscription, true);
    }
  }

  private void sendSubscriptionMessage(Subscription subscription, boolean subscribe) {
    WebSocket current = webSocket;
    if (current == null) {
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
      Subscription subscription = new Subscription(ack.topic(), "J", ack.ticker());
      acknowledgedSubscriptions.put(subscription, ack);
      CompletableFuture<KisWebSocketSubscriptionAck> pending = pendingAcknowledgements.remove(subscription);
      if (pending != null && !pending.isDone()) {
        pending.complete(ack);
      }
      log.info("KIS websocket subscription acknowledged. topic={}, ticker={}, success={}, message={}", ack.topic(), ack.ticker(), ack.success(), ack.message());
    });

    java.util.List<KisRealtimeTradeTickData> ticks = messageParser.parseDomesticTradeTicks(rawMessage, "J");
    if (!ticks.isEmpty()) {
      KisRealtimeTradeTickData firstTick = ticks.getFirst();
      Subscription subscription = new Subscription(resolveTopic(firstTick.marketCode()), firstTick.marketCode(), firstTick.ticker());
      if (firstTickLoggedSubscriptions.add(subscription)) {
        log.info(
            "Received first KIS realtime trade tick. ticker={}, price={}, tradedAt={}, tickCount={}",
            firstTick.ticker(),
            firstTick.currentPrice(),
            firstTick.tradedAt(),
            ticks.size()
        );
      }
      aggregator.acceptTicks(ticks);
    }
  }

  private void handleDisconnect(Throwable throwable) {
    connected.set(false);
    webSocket = null;
    if (throwable != null) {
      log.warn("Disconnected from KIS websocket.", throwable);
    }
    scheduleReconnect();
  }

  private void scheduleReconnect() {
    if (subscriptions.isEmpty()) {
      return;
    }
    scheduler.schedule(this::connectIfNecessary, RECONNECT_DELAY_SECONDS, TimeUnit.SECONDS);
  }

  private final class KisListener implements WebSocket.Listener {

    private final StringBuilder textBuffer = new StringBuilder();

    @Override
    public void onOpen(WebSocket webSocket) {
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
