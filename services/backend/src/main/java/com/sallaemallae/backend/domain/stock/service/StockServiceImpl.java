package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.LatestPrice;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse.PriceRange52w;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockRequestNormalizer;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockServiceImpl implements StockService {

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;

  @Override
  public List<StockSummaryResponse> getAllStocks() {
    return stockRepository.findAllByIsActiveTrueOrderByNameAsc().stream()
        .map(this::toSummaryResponse)
        .toList();
  }

  @Override
  public StockDetailResponse getStockDetail(String ticker) {
    Stock stock = stockRepository.findByTickerAndIsActiveTrue(
            StockRequestNormalizer.normalizeTicker(ticker, StockErrorCode.STOCK_NOT_FOUND)
        )
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toDetailResponse(stock);
  }

  @Override
  public StockBasicInfoResponse getStockBasicInfo(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toBasicInfoResponse(stock);
  }

  @Override
  public StockOverviewResponse getStockOverview(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));

    StockPriceDaily latestPriceRow = stockPriceDailyRepository.findTopByStockIdOrderByTradeDateDescIdDesc(stockId)
        .orElse(null);

    LatestPrice latestPrice = latestPriceRow == null ? null : new LatestPrice(
        latestPriceRow.getTradeDate(),
        latestPriceRow.getClosePrice(),
        latestPriceRow.getFluctuationRate()
    );

    PriceRange52w priceRange52w = buildPriceRange52w(stockId, latestPriceRow);

    return new StockOverviewResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        latestPrice,
        priceRange52w
    );
  }

  private StockSummaryResponse toSummaryResponse(Stock stock) {
    return new StockSummaryResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null
    );
  }

  private StockDetailResponse toDetailResponse(Stock stock) {
    return new StockDetailResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        stock.getUpdatedAt()
    );
  }

  private StockBasicInfoResponse toBasicInfoResponse(Stock stock) {
    return new StockBasicInfoResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getMarketType() != null ? stock.getMarketType().name() : null,
        stock.getGicsSector(),
        stock.getCategory(),
        stock.getUpdatedAt()
    );
  }

  private PriceRange52w buildPriceRange52w(Long stockId, StockPriceDaily latestPriceRow) {
    if (latestPriceRow == null) {
      return null;
    }

    LocalDate latestTradeDate = latestPriceRow.getTradeDate();
    LocalDate rangeStart = latestTradeDate.minusYears(1);
    List<StockPriceDaily> rangePrices = stockPriceDailyRepository.findByStockIdAndTradeDateBetweenOrderByTradeDateDescIdDesc(
        stockId,
        rangeStart,
        latestTradeDate
    );
    if (rangePrices.isEmpty()) {
      return null;
    }

    StockPriceDaily highest = null;
    StockPriceDaily lowest = null;
    for (StockPriceDaily row : rangePrices) {
      if (row.getHighPrice() != null && (highest == null || row.getHighPrice() > highest.getHighPrice())) {
        highest = row;
      }
      if (row.getLowPrice() != null && (lowest == null || row.getLowPrice() < lowest.getLowPrice())) {
        lowest = row;
      }
    }

    Integer latestClosePrice = latestPriceRow.getClosePrice();
    Float distanceFromHighRate = highest == null ? null : calculateDistanceRate(latestClosePrice, highest.getHighPrice());
    Float distanceFromLowRate = lowest == null ? null : calculateDistanceRate(latestClosePrice, lowest.getLowPrice());

    return new PriceRange52w(
        highest != null ? highest.getHighPrice() : null,
        highest != null ? highest.getTradeDate() : null,
        lowest != null ? lowest.getLowPrice() : null,
        lowest != null ? lowest.getTradeDate() : null,
        distanceFromHighRate,
        distanceFromLowRate
    );
  }

  private Float calculateDistanceRate(Integer latestPrice, Integer referencePrice) {
    if (latestPrice == null || referencePrice == null || referencePrice == 0) {
      return null;
    }
    return (latestPrice - referencePrice) * 100.0f / referencePrice;
  }
}
