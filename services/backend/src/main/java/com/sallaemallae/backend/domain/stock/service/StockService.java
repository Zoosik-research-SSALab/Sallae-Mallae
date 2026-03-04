package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import java.util.List;

public interface StockService {

  List<StockSummaryResponse> getAllStocks();

  StockDetailResponse getStockDetail(String ticker);
}
