package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricePointResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceYearly;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceYearlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.stock.CachedKisDomesticStockGateway;
import com.sallaemallae.backend.infra.kis.stock.KisMinuteCandleData;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
public class StockPriceStreamServiceImpl implements StockPriceStreamService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final StockPriceWeeklyRepository stockPriceWeeklyRepository;
  private final StockPriceMonthlyRepository stockPriceMonthlyRepository;
  private final StockPriceYearlyRepository stockPriceYearlyRepository;
  private final CachedKisDomesticStockGateway cachedGateway;

  public StockPriceStreamServiceImpl(
      StockRepository stockRepository,
      StockPriceDailyRepository stockPriceDailyRepository,
      StockPriceWeeklyRepository stockPriceWeeklyRepository,
      StockPriceMonthlyRepository stockPriceMonthlyRepository,
      StockPriceYearlyRepository stockPriceYearlyRepository,
      CachedKisDomesticStockGateway cachedGateway
  ) {
    this.stockRepository = stockRepository;
    this.stockPriceDailyRepository = stockPriceDailyRepository;
    this.stockPriceWeeklyRepository = stockPriceWeeklyRepository;
    this.stockPriceMonthlyRepository = stockPriceMonthlyRepository;
    this.stockPriceYearlyRepository = stockPriceYearlyRepository;
    this.cachedGateway = cachedGateway;
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

  // ===== 분봉 (KIS REST API) =====

  private StockPricesResponse loadMinutePricesResponse(ResolvedStock stock) {
    try {
      KisMinuteCandleData data = cachedGateway.getMinuteCandles(
          stock.marketCode(), stock.ticker()
      ).value();

      List<StockPricePointResponse> prices = data.candles().stream()
          .map(candle -> new StockPricePointResponse(
              candle.timestamp(),
              candle.openPrice(),
              candle.highPrice(),
              candle.lowPrice(),
              candle.closePrice(),
              candle.volume()
          ))
          .toList();

      return new StockPricesResponse("MINUTE", false, null, ascending(prices));
    } catch (KisApiException e) {
      log.warn("Failed to fetch KIS minute candles. ticker={}", stock.ticker(), e);
      throw new BusinessException(StockErrorCode.STOCK_MARKET_DATA_UNAVAILABLE);
    }
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

  // ===== Resolve =====

  private ResolvedStock resolveStock(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return new ResolvedStock(stock.getId(), stock.getTicker(), StockMarketConstants.DOMESTIC_MARKET_CODE);
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
