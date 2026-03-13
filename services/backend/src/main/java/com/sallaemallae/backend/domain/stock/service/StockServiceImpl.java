package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockServiceImpl implements StockService {

  private final StockRepository stockRepository;

  @Override
  public List<StockSummaryResponse> getAllStocks() {
    return stockRepository.findAllByIsActiveTrueOrderByNameAsc().stream()
        .map(this::toSummaryResponse)
        .toList();
  }

  @Override
  public StockDetailResponse getStockDetail(String ticker) {
    Stock stock = stockRepository.findByTickerAndIsActiveTrue(normalizeTicker(ticker))
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toDetailResponse(stock);
  }

  @Override
  public StockBasicInfoResponse getStockBasicInfo(Long stockId) {
    Stock stock = stockRepository.findByIdAndIsActiveTrue(stockId)
        .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
    return toBasicInfoResponse(stock);
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

  private String normalizeTicker(String ticker) {
    if (ticker == null || ticker.isBlank()) {
      throw new BusinessException(StockErrorCode.STOCK_NOT_FOUND);
    }
    return ticker.trim().toUpperCase();
  }
}
