package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;

public interface StockPriceStreamService {

  StockPricesResponse getLatestPrices(Long stockId, String candleType, String cursor);
}
