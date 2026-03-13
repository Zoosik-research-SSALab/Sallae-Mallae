package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPriceCandleResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteCandleResponse;
import com.sallaemallae.backend.domain.stock.dto.StockStoragePreviewResponse;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.KisPeriodPriceData;
import com.sallaemallae.backend.infra.kis.stock.KisPriceCandleData;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import java.time.temporal.ChronoUnit;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class StockDataPipelineMapper {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  public StockQuoteResponse toQuoteResponse(
      CachedResult<KisQuoteData> cachedResult,
      String resolvedName
  ) {
    KisQuoteData value = cachedResult.value();
    return new StockQuoteResponse(
        value.ticker(),
        resolvedName != null ? resolvedName : value.name(),
        value.marketCode(),
        value.currentPrice(),
        value.previousClosePrice(),
        value.changePrice(),
        value.changeRate(),
        value.openPrice(),
        value.highPrice(),
        value.lowPrice(),
        value.volume(),
        value.asOf(),
        cachedResult.cacheHit(),
        cachedResult.cacheKey(),
        value.source()
    );
  }

  public StockPeriodPriceResponse toPeriodPriceResponse(
      CachedResult<KisPeriodPriceData> cachedResult,
      String resolvedName
  ) {
    KisPeriodPriceData value = cachedResult.value();
    List<StockPriceCandleResponse> candles = value.candles().stream()
        .map(this::toCandleResponse)
        .toList();

    return new StockPeriodPriceResponse(
        value.ticker(),
        resolvedName != null ? resolvedName : value.name(),
        value.marketCode(),
        value.periodCode(),
        value.startDate().toString(),
        value.endDate().toString(),
        value.adjusted(),
        value.currentPrice(),
        value.previousClosePrice(),
        value.changePrice(),
        value.changeRate(),
        value.openPrice(),
        value.highPrice(),
        value.lowPrice(),
        value.volume(),
        value.asOf(),
        candles,
        cachedResult.cacheHit(),
        cachedResult.cacheKey(),
        value.source()
    );
  }

  public StockStoragePreviewResponse toMinutePreview(Long stockId, String ticker, KisQuoteData quoteData) {
    OffsetDateTime tradeTimestamp = quoteData.asOf().truncatedTo(ChronoUnit.MINUTES);
    return new StockStoragePreviewResponse(
        "stock_prices_minute",
        "trade_timestamp",
        tradeTimestamp.toString(),
        stockId,
        ticker,
        quoteData.openPrice(),
        quoteData.highPrice(),
        quoteData.lowPrice(),
        quoteData.currentPrice(),
        null,
        quoteData.changeRate(),
        OffsetDateTime.now(ZONE_ID)
    );
  }

  public List<StockStoragePreviewResponse> toAggregatePreviews(
      Long stockId,
      String ticker,
      String periodCode,
      List<KisPriceCandleData> candles
  ) {
    return candles.stream()
        .map(candle -> toAggregatePreview(stockId, ticker, periodCode, candle))
        .toList();
  }

  public StockRealtimeMinuteCandleResponse toRealtimeMinuteCandleResponse(KisRealtimeMinuteCandleData candle) {
    return new StockRealtimeMinuteCandleResponse(
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
        candle.closed(),
        candle.source()
    );
  }

  public StockStoragePreviewResponse toRealtimeMinutePreview(
      Long stockId,
      String ticker,
      KisRealtimeMinuteCandleData candle
  ) {
    return new StockStoragePreviewResponse(
        "stock_prices_minute",
        "trade_timestamp",
        candle.bucketStart().toString(),
        stockId,
        ticker,
        candle.openPrice(),
        candle.highPrice(),
        candle.lowPrice(),
        candle.closePrice(),
        candle.minuteVolume(),
        candle.changeRate(),
        OffsetDateTime.now(ZONE_ID)
    );
  }

  private StockPriceCandleResponse toCandleResponse(KisPriceCandleData candleData) {
    return new StockPriceCandleResponse(
        candleData.tradeDate(),
        candleData.openPrice(),
        candleData.highPrice(),
        candleData.lowPrice(),
        candleData.closePrice(),
        candleData.volume(),
        candleData.changePrice(),
        candleData.fluctuationRate(),
        candleData.modified()
    );
  }

  private StockStoragePreviewResponse toAggregatePreview(
      Long stockId,
      String ticker,
      String periodCode,
      KisPriceCandleData candle
  ) {
    String targetTable = switch (periodCode) {
      case "D" -> "stock_prices_daily";
      case "W" -> "stock_prices_weekly";
      case "M" -> "stock_prices_monthly";
      case "Y" -> "stock_prices_yearly";
      default -> throw new IllegalArgumentException("Unsupported period code: " + periodCode);
    };
    String uniqueKeyColumn = switch (periodCode) {
      case "D" -> "trade_date";
      case "W" -> "trade_week";
      case "M" -> "trade_month";
      case "Y" -> "trade_year";
      default -> throw new IllegalArgumentException("Unsupported period code: " + periodCode);
    };
    String uniqueKeyValue = "Y".equals(periodCode)
        ? String.valueOf(candle.tradeDate().getYear())
        : candle.tradeDate().toString();

    return new StockStoragePreviewResponse(
        targetTable,
        uniqueKeyColumn,
        uniqueKeyValue,
        stockId,
        ticker,
        candle.openPrice(),
        candle.highPrice(),
        candle.lowPrice(),
        candle.closePrice(),
        candle.volume(),
        candle.fluctuationRate(),
        OffsetDateTime.now(ZONE_ID)
    );
  }
}
