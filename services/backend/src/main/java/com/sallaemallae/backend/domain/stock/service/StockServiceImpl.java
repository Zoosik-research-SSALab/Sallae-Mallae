package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StockServiceImpl implements StockService {

  @Override
  public List<StockSummaryResponse> getAllStocks() {
    return List.of(new StockSummaryResponse(1L, "005930", "삼성전자", "KOSPI"));
  }

  @Override
  public StockDetailResponse getStockDetail(String ticker) {
    return new StockDetailResponse(1L, ticker, "placeholder-stock", "stock boilerplate");
  }
}
