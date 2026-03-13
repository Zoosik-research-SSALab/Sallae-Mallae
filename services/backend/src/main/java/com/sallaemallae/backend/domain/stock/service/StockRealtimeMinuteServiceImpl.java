package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteCandleResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinutePipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteSnapshotResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeSubscriptionResponse;
import com.sallaemallae.backend.domain.stock.dto.StockStoragePreviewResponse;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleAggregator;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeTradeTickData;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketClient;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketSubscriptionAck;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockRealtimeMinuteServiceImpl implements StockRealtimeMinuteService {

  private static final Set<String> REALTIME_MARKET_CODES = Set.of("J");

  private final KisWebSocketClient kisWebSocketClient;
  private final KisRealtimeMinuteCandleAggregator candleAggregator;
  private final StockDataPipelineMapper pipelineMapper;
  private final StockRepository stockRepository;

  @Override
  public StockRealtimeSubscriptionResponse subscribe(String ticker, String marketCode) {
    String normalizedTicker = normalizeTicker(ticker);
    String normalizedMarket = normalizeRealtimeMarket(marketCode);

    try {
      KisWebSocketSubscriptionAck acknowledgement = kisWebSocketClient
          .subscribeDomesticTrade(normalizedMarket, normalizedTicker)
          .get(7, TimeUnit.SECONDS);
      if (!acknowledgement.success()) {
        throw new BusinessException(StockErrorCode.STOCK_REALTIME_SUBSCRIPTION_FAILED);
      }
      return new StockRealtimeSubscriptionResponse(
          normalizedTicker,
          normalizedMarket,
          acknowledgement.topic(),
          kisWebSocketClient.isConnected(),
          kisWebSocketClient.isSubscriptionRequested(normalizedMarket, normalizedTicker),
          kisWebSocketClient.isSubscriptionAcknowledged(normalizedMarket, normalizedTicker),
          acknowledgement.acknowledgedAt(),
          acknowledgement.message()
      );
    } catch (TimeoutException e) {
      log.warn("Timed out waiting for websocket subscription acknowledgement. ticker={}", normalizedTicker, e);
      throw new BusinessException(StockErrorCode.STOCK_REALTIME_SUBSCRIPTION_FAILED);
    } catch (BusinessException e) {
      throw e;
    } catch (Exception e) {
      log.warn("Failed to subscribe realtime websocket stream. ticker={}", normalizedTicker, e);
      throw new BusinessException(StockErrorCode.STOCK_REALTIME_SUBSCRIPTION_FAILED);
    }
  }

  @Override
  public StockRealtimeMinuteSnapshotResponse getSnapshot(String ticker, String marketCode, int limit) {
    String normalizedTicker = normalizeTicker(ticker);
    String normalizedMarket = normalizeRealtimeMarket(marketCode);
    int normalizedLimit = normalizeLimit(limit);
    String topic = kisWebSocketClient.resolveTopic(normalizedMarket);

    Optional<KisWebSocketSubscriptionAck> acknowledgement = kisWebSocketClient.getAcknowledgement(
        normalizedMarket,
        normalizedTicker
    );
    Optional<KisRealtimeTradeTickData> latestTick = candleAggregator.getLatestTick(normalizedMarket, normalizedTicker);
    Optional<KisRealtimeMinuteCandleData> currentMinute = candleAggregator.getCurrentMinuteCandle(
        normalizedMarket,
        normalizedTicker
    );
    List<StockRealtimeMinuteCandleResponse> recentClosedCandles = candleAggregator
        .getRecentClosedMinuteCandles(normalizedMarket, normalizedTicker, normalizedLimit)
        .stream()
        .map(pipelineMapper::toRealtimeMinuteCandleResponse)
        .toList();

    return new StockRealtimeMinuteSnapshotResponse(
        normalizedTicker,
        normalizedMarket,
        topic,
        kisWebSocketClient.isConnected(),
        kisWebSocketClient.isSubscriptionRequested(normalizedMarket, normalizedTicker),
        kisWebSocketClient.isSubscriptionAcknowledged(normalizedMarket, normalizedTicker),
        acknowledgement.map(KisWebSocketSubscriptionAck::acknowledgedAt).orElse(null),
        kisWebSocketClient.getLastMessageAt().orElse(null),
        kisWebSocketClient.getLastMessagePreview().orElse(null),
        latestTick.map(KisRealtimeTradeTickData::tradedAt).orElse(null),
        currentMinute.map(pipelineMapper::toRealtimeMinuteCandleResponse).orElse(null),
        recentClosedCandles
    );
  }

  @Override
  public StockRealtimeMinutePipelinePreviewResponse previewStoragePipeline(
      String ticker,
      String marketCode,
      int limit
  ) {
    String normalizedTicker = normalizeTicker(ticker);
    String normalizedMarket = normalizeRealtimeMarket(marketCode);
    int normalizedLimit = normalizeLimit(limit);
    Long stockId = resolveStockId(normalizedTicker);

    Optional<KisRealtimeMinuteCandleData> currentMinute = candleAggregator.getCurrentMinuteCandle(
        normalizedMarket,
        normalizedTicker
    );
    List<KisRealtimeMinuteCandleData> recentClosedCandles = candleAggregator.getRecentClosedMinuteCandles(
        normalizedMarket,
        normalizedTicker,
        normalizedLimit
    );

    StockStoragePreviewResponse currentMinutePreview = currentMinute
        .map(candle -> pipelineMapper.toRealtimeMinutePreview(stockId, normalizedTicker, candle))
        .orElse(null);
    List<StockStoragePreviewResponse> closedMinutePreviews = recentClosedCandles.stream()
        .map(candle -> pipelineMapper.toRealtimeMinutePreview(stockId, normalizedTicker, candle))
        .toList();

    return new StockRealtimeMinutePipelinePreviewResponse(
        normalizedTicker,
        normalizedMarket,
        kisWebSocketClient.isConnected(),
        kisWebSocketClient.isSubscriptionRequested(normalizedMarket, normalizedTicker),
        kisWebSocketClient.isSubscriptionAcknowledged(normalizedMarket, normalizedTicker),
        currentMinutePreview,
        closedMinutePreviews
    );
  }

  private String normalizeTicker(String ticker) {
    if (ticker == null) {
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
    String normalized = ticker.trim().toUpperCase();
    if (!normalized.matches("^[0-9A-Z]{6}$")) {
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
    return normalized;
  }

  private String normalizeRealtimeMarket(String marketCode) {
    if (marketCode == null) {
      return "J";
    }
    String normalized = marketCode.trim().toUpperCase();
    if (!REALTIME_MARKET_CODES.contains(normalized)) {
      throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
    }
    return normalized;
  }

  private int normalizeLimit(int limit) {
    if (limit < 1) {
      return 1;
    }
    return Math.min(limit, 30);
  }

  private Long resolveStockId(String ticker) {
    return stockRepository.findByTicker(ticker)
        .map(stock -> stock.getId())
        .orElse(null);
  }
}
